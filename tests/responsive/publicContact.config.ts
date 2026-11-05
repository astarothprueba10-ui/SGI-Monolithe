import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  testMatch: 'publicContact.spec.ts',
  webServer: servers.filter(server => server.url === 'http://127.0.0.1:6182')
});
