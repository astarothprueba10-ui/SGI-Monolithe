import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: 'mfaLogin.spec.ts',
  projects: base.projects?.filter(project => ['ancho-390', 'ancho-1365'].includes(project.name ?? '')),
  webServer: servers.filter(server => !server.url?.endsWith(':6182'))
});
