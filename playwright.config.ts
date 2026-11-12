import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 180000, expect: { timeout: 15000 },
  fullyParallel: false, workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:5173', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport:{width:1440,height:960}, launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--enable-unsafe-swiftshader']} } },
    { name: 'webkit', use: { ...devices['iPhone 13'], defaultBrowserType:'webkit', launchOptions:{executablePath:process.env.WEBKIT_PATH||undefined} } },
  ],
});
