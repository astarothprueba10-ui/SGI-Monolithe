import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga automática y segura desde .secret/
  const secretDir = path.resolve(__dirname, '../../.secret');
  const env = loadEnv(mode, secretDir, '');
  const localEnv = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || 'https://REDACTED_PROJECT_REF.supabase.co';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY || '';
  const apiUrl = env.VITE_API_URL || localEnv.VITE_API_URL || 'http://localhost:8082';

  return {
    plugins: [react()],
    envDir: secretDir,
    server: {
      port: 5175,
      host: true
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    }
  };
});
