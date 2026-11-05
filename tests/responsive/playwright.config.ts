import { defineConfig } from '@playwright/test';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

function server(app: string, port: number) {
  const origin = `http://127.0.0.1:${port}`;
  return {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: path.join(root, 'apps', app), url: origin, reuseExistingServer: false, timeout: 60000,
    env: { ...process.env, VITE_AUTH_API_URL: `${origin}/api/auth`, VITE_CORE_API_URL: `${origin}/api/core`,
      VITE_CMS_API_URL: `${origin}/api/cms`, VITE_API_URL: `${origin}/api/cms`, VITE_SUPABASE_URL: `${origin}/supabase`,
      VITE_SUPABASE_ANON_KEY: 'mobile-qa-public-key' }
  };
}

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', workers: 2, timeout: 60000, reporter: 'list',
  use: { browserName: 'chromium', reducedMotion: 'reduce', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.RESPONSIVE_CHROMIUM_PATH,
      args: JSON.parse(process.env.RESPONSIVE_CHROMIUM_ARGS ?? '[]') } },
  projects: [320, 390, 640, 768, 1024, 1365].map(width => ({ name: `ancho-${width}`, use: {
    viewport: { width, height: 820 }, isMobile: width < 768, hasTouch: width < 1024
  } })),
  webServer: [server('backoffice', 6181), server('pagina-web', 6182), server('portal-cliente', 6183)]
});
