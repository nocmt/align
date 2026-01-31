import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { createClient } from 'webdav';

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use('/api/webdav', async (req, res, next) => {
          // Handle CORS
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            next();
            return;
          }

          try {
            // Parse body
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const body = JSON.parse(Buffer.concat(buffers).toString());
            
            const { action, config, data, path: filePath } = body;

            if (!config || !config.url || !config.username || !config.password) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing WebDAV configuration' }));
              return;
            }

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

            let result;
            switch (action) {
              case 'check':
                await client.getDirectoryContents('/');
                result = { success: true };
                break;
              case 'listFiles':
                const files = await client.getDirectoryContents(dataPath);
                result = { data: files };
                break;
              case 'put':
                if (!data) throw new Error('Missing data to sync');
                const targetPath = filePath ? (filePath.startsWith('/') ? filePath : `${basePath}/${filePath}`) : `${basePath}/align-data.json`;
                await client.putFileContents(targetPath, JSON.stringify(data, null, 2));
                result = { success: true };
                break;
              case 'get':
                const sourcePath = filePath ? (filePath.startsWith('/') ? filePath : `${basePath}/${filePath}`) : `${basePath}/align-data.json`;
                if (await client.exists(sourcePath) === false) {
                  res.statusCode = 404;
                  result = { error: 'Remote file not found' };
                } else {
                  const content = await client.getFileContents(sourcePath, { format: 'text' });
                  result = { data: JSON.parse(content as string) };
                }
                break;
              default:
                res.statusCode = 400;
                result = { error: 'Invalid action' };
            }

            if (!res.writableEnded) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            }
          } catch (error: any) {
            console.error('Local WebDAV Error:', error);
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: error.message || 'WebDAV operation failed',
                details: error.toString() 
              }));
            }
          }
        });
      }
    }
  ],
})
