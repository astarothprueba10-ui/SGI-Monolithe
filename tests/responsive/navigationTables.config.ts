import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base, testMatch: 'navigationTables.spec.ts',
  projects: [...(base.projects ?? []), { name: 'ancho-1920', use: { viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false } }]
});
