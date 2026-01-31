import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'webdav';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, config, data, path: filePath } = req.body;

  if (!config || !config.url || !config.username || !config.password) {
    return res.status(400).json({ error: 'Missing WebDAV configuration' });
  }

  try {
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    });

    const basePath = '/align';
    const dataPath = '/align/data';

    // Ensure directories exist
    if (await client.exists(basePath) === false) {
      await client.createDirectory(basePath);
    }
    if (await client.exists(dataPath) === false) {
      await client.createDirectory(dataPath);
    }

    switch (action) {
      case 'check':
        // 尝试列出目录来验证连接
        await client.getDirectoryContents('/');
        return res.status(200).json({ success: true });

      case 'listFiles':
        const files = await client.getDirectoryContents(dataPath);
        return res.status(200).json({ data: files });

      case 'put':
        if (!data) {
          return res.status(400).json({ error: 'Missing data to sync' });
        }
        const targetPath = filePath ? (filePath.startsWith('/') ? filePath : `${basePath}/${filePath}`) : `${basePath}/align-data.json`;
        await client.putFileContents(targetPath, JSON.stringify(data, null, 2));
        return res.status(200).json({ success: true });

      case 'get':
        const sourcePath = filePath ? (filePath.startsWith('/') ? filePath : `${basePath}/${filePath}`) : `${basePath}/align-data.json`;
        if (await client.exists(sourcePath) === false) {
           return res.status(404).json({ error: 'Remote file not found' });
        }
        const content = await client.getFileContents(sourcePath, { format: 'text' });
        return res.status(200).json({ data: JSON.parse(content as string) });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('WebDAV Error:', error);
    return res.status(500).json({ 
      error: error.message || 'WebDAV operation failed',
      details: error.toString()
    });
  }
}
