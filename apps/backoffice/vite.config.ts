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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const secretDir = path.resolve(__dirname, '../../.secret');
  const secretEnv = loadSecretEnv(
    path.join(secretDir, 'supabase.env')
  );

  const localEnv = loadEnv(mode, process.cwd(), '');

  /*
   * URLs que utiliza el navegador.
   * Son relativas para que no dependamos de localhost
   * ni de la IP actual de la computadora.
   */
  const authApiUrl =
    process.env.VITE_AUTH_API_URL ||
    localEnv.VITE_AUTH_API_URL ||
    '/api/auth';

  const cmsApiUrl =
    process.env.VITE_CMS_API_URL ||
    localEnv.VITE_CMS_API_URL ||
    '/cms-api';

  const coreApiUrl =
    process.env.VITE_CORE_API_URL ||
    localEnv.VITE_CORE_API_URL ||
    '/api/core';

  /*
   * Destinos internos del proxy.
   *
   * En desarrollo local:
   *   localhost:8081
   *   localhost:8082
   *   localhost:8083
   *
   * En Docker estos valores podrán ser sobrescritos
   * desde docker-compose con los nombres de los servicios.
   */
  const authProxyTarget =
    process.env.AUTH_PROXY_TARGET ||
    'http://localhost:8081';

  const cmsProxyTarget =
    process.env.CMS_PROXY_TARGET ||
    'http://localhost:8082';

  const coreProxyTarget =
    process.env.CORE_PROXY_TARGET ||
    'http://localhost:8083';

  /*
   * Supabase
   */
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
      port: 5173,
      host: true,
      allowedHosts: true,

      proxy: {
        '/api/auth': {
          target: authProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          }
        },

        '/api/core': {
          target: coreProxyTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          }
        },

        '/cms-api': {
          target: cmsProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) =>
            requestPath.replace(/^\/cms-api/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          }
        }
      }
    },

    define: {
      'import.meta.env.VITE_AUTH_API_URL':
        JSON.stringify(authApiUrl),

      'import.meta.env.VITE_CMS_API_URL':
        JSON.stringify(cmsApiUrl),

      'import.meta.env.VITE_CORE_API_URL':
        JSON.stringify(coreApiUrl),

      'import.meta.env.VITE_SUPABASE_URL':
        JSON.stringify(supabaseUrl),

      'import.meta.env.VITE_SUPABASE_ANON_KEY':
        JSON.stringify(supabaseAnonKey)
    }
  };
});