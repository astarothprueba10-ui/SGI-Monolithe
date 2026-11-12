import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base, testMatch: 'workerIdentity.spec.ts',
  projects: [320, 390, 640, 768, 1024, 1365, 1920].map(width => ({ name: `ancho-${width}`, use: {
    viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 1024
  } })),
  webServer: servers.filter(server => server.url === 'http://127.0.0.1:6181')
});
