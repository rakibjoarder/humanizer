import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env' });              // STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, etc.
config({ path: '.env.test', override: true }); // test-specific overrides take precedence

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	retries: 1,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:5173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'npm run dev',
		url: process.env.TEST_BASE_URL ?? 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 30_000
	}
});
