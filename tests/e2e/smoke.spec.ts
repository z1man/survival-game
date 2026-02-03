import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

test.describe('Survival Game E2E Smoke Tests', () => {
  test.beforeAll(() => {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  });
  
  test('should run bot mode for 40 seconds without crash', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    
    // Navigate to the game
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for game to initialize
    await page.waitForTimeout(2000);
    
    // Verify game elements exist
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible();
    
    // Enable bot mode
    await page.evaluate(() => {
      (window as any).__TEST__.enableBot(true);
    });
    
    console.log('Bot mode enabled, running for 40 seconds...');
    
    // Run for 40 seconds or until win/lose
    let finished = false;
    let result = '';
    
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      
      const telemetry = await page.evaluate(() => {
        return (window as any).__TEST__.getTelemetry();
      });
      
      if (telemetry.events.some((e: any) => e.event === 'win')) {
        result = 'win';
        finished = true;
        break;
      }
      
      if (telemetry.events.some((e: any) => e.event === 'lose')) {
        result = 'lose';
        finished = true;
        break;
      }
    }
    
    // Get final telemetry
    const finalTelemetry = await page.evaluate(() => {
      return (window as any).__TEST__.getTelemetry();
    });
    
    // Assertions
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    expect(finalTelemetry.events.some((e: any) => e.event === 'session_start')).toBeTruthy();
    expect(finalTelemetry.events.some((e: any) => e.event === 'enemy_spawn')).toBeTruthy();
    
    // Write telemetry to file
    fs.writeFileSync(
      path.join(REPORTS_DIR, 'smoke-telemetry.json'),
      JSON.stringify(finalTelemetry, null, 2)
    );
    
    console.log(`Test finished: ${result || 'timeout'}`);
    console.log(`Total events: ${finalTelemetry.events.length}`);
    console.log('Telemetry written to reports/smoke-telemetry.json');
    
    // Take screenshot
    await page.screenshot({ path: path.join(REPORTS_DIR, 'smoke.png') });
    console.log('Screenshot written to reports/smoke.png');
  });
});
