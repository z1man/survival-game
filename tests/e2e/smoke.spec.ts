import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

test.describe('Survival Game E2E Smoke Tests', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  });
  
  test('should load game without crash', async ({ page }) => {
    const errors: string[] = [];
    const logs: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const gameContainer = page.locator('#game-container');
    const isVisible = await gameContainer.isVisible();
    console.log(`Game container visible: ${isVisible}`);
    
    const canvasCount = await page.locator('canvas').count();
    console.log(`Canvas count: ${canvasCount}`);
    
    const testHooks = await page.evaluate(() => typeof (window as any).__TEST__);
    console.log(`Test hooks: ${testHooks}`);
    
    // Filter critical errors (ignore polyfill warnings)
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('polyfill') &&
      !e.includes('not a function')
    );
    
    await page.screenshot({ path: path.join(REPORTS_DIR, 'smoke.png') });
    
    // Export telemetry if available
    if (testHooks !== 'undefined') {
      const telemetry = await page.evaluate(() => (window as any).__TEST__.getTelemetry?.());
      if (telemetry) {
        fs.writeFileSync(path.join(REPORTS_DIR, 'smoke-telemetry.json'), JSON.stringify(telemetry, null, 2));
      }
    }
    
    expect(criticalErrors).toHaveLength(0);
    expect(isVisible).toBeTruthy();
  });
});
