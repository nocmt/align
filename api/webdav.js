import { createClient } from 'webdav';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, config, data, filename = 'align-data.json' } = req.body;

  if (!config || !config.url || !config.username || !config.password) {
    return res.status(400).json({ error: 'Missing WebDAV configuration' });
  }

  try {
    const client = createClient(config.url, {
      username: config.username,
      password: config.password
    });

    if (action === 'check') {
      // 测试连接：尝试读取目录
      await client.getDirectoryContents('/');
      return res.status(200).json({ success: true, message: 'Connection successful' });
    }

    if (action === 'put') {
      // 上传数据
      if (!data) {
        return res.status(400).json({ error: 'Missing data to upload' });
      }
      await client.putFileContents(`/${filename}`, JSON.stringify(data));
      return res.status(200).json({ success: true, message: 'Upload successful' });
    }

    if (action === 'get') {
      // 下载数据
      if (await client.exists(`/${filename}`) === false) {
        return res.status(404).json({ error: 'Remote file not found' });
      }
      const content = await client.getFileContents(`/${filename}`, { format: 'text' });
      return res.status(200).json({ success: true, data: JSON.parse(content) });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('WebDAV Error:', error);
    return res.status(500).json({ 
      error: error.message || 'WebDAV operation failed',
      details: error.toString()
    });
  }
}