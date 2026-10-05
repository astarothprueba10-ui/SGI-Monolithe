import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function loadSecretEnv(secretFile: string): Record<string, string> {
  if (!fs.existsSync(secretFile)) return {};

  const content = fs.readFileSync(secretFile, 'utf-8');
  const result: Record<string, string> = {};

  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);

    if (match) {
      result[match[1]] = match[2]
        .trim()
        .replace(/(^['"]|['"]$)/g, '');
    }
  });

  return result;
}

export default defineConfig(({ mode }) => {
  const secretDir = path.resolve(__dirname, '../../.secret');

  const secretEnv = loadSecretEnv(
    path.join(secretDir, 'supabase.env')
  );

  const localEnv = loadEnv(mode, process.cwd(), '');

  /*
   * URL utilizada por el navegador.
   * Ya no depende de localhost ni de una IP de red.
   */
  const apiUrl =
    process.env.VITE_API_URL ||
    localEnv.VITE_API_URL ||
    '/cms-api';

  /*
   * Destino real del backend.
   *
   * Local:
   * http://localhost:8082
   *
   * Docker:
   * http://pagina-web-backend:8082
   */
  const apiProxyTarget =
    process.env.API_PROXY_TARGET ||
    'http://localhost:8082';

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    secretEnv.VITE_SUPABASE_URL ||
    secretEnv.SUPABASE_URL ||
    localEnv.VITE_SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    secretEnv.VITE_SUPABASE_ANON_KEY ||
    secretEnv.SUPABASE_ANON_KEY ||
    localEnv.VITE_SUPABASE_ANON_KEY ||
    '';

  return {
    plugins: [react()],

    envDir: secretDir,

    server: {
      port: 5175,
      host: true,

      proxy: {
        '/cms-api': {
          target: apiProxyTarget,
          changeOrigin: true,

          /*
           * Ejemplo:
           *
           * navegador:
           * /cms-api/api/public/proyectos
           *
           * backend:
           * /api/public/proyectos
           */
          rewrite: (requestPath) =>
            requestPath.replace(/^\/cms-api/, ''),

          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          }
        }
      }
    },

    define: {
      'import.meta.env.VITE_SUPABASE_URL':
        JSON.stringify(supabaseUrl),

      'import.meta.env.VITE_SUPABASE_ANON_KEY':
        JSON.stringify(supabaseAnonKey),

      'import.meta.env.VITE_API_URL':
        JSON.stringify(apiUrl)
    }
  };
});