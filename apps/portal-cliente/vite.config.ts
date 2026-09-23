import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const secretDir = path.resolve(__dirname, '../../.secret');
  const env = loadEnv(mode, secretDir, '');

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://REDACTED_PROJECT_REF.supabase.co';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    envDir: secretDir,
    server: {
      port: 5174,
      host: true
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    }
  };
});
