import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import fs from 'fs';

function loadSecretEnv(secretFile: string): Record<string, string> {
  if (!fs.existsSync(secretFile)) return {};
  const content = fs.readFileSync(secretFile, 'utf-8');
  const result: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      result[match[1]] = match[2].trim().replace(/(^['"]|['"]$)/g, '');
    }
  });
  return result;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const secretDir = path.resolve(__dirname, '../../.secret');
  const secretEnv = loadSecretEnv(path.join(secretDir, 'supabase.env'));
  const localEnv = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || secretEnv.VITE_SUPABASE_URL || secretEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || secretEnv.VITE_SUPABASE_ANON_KEY || secretEnv.SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY || '';
  const apiUrl = process.env.VITE_API_URL || secretEnv.VITE_API_URL || localEnv.VITE_API_URL || 'http://localhost:8082';

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
