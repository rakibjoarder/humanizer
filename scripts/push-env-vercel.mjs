#!/usr/bin/env node
/**
 * Pushes variables from .env to Vercel (does not commit secrets to git).
 *
 * Prereqs: `npx vercel link` in this repo, and `npx vercel login`.
 *
 * Usage:
 *   npm run env:vercel                    → production only
 *   npm run env:vercel -- preview         → preview only
 *   npm run env:vercel -- production preview development
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

if (!existsSync(envPath)) {
	console.error('No .env file found at', envPath);
	process.exit(1);
}

const environments =
	process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['production'];

const parsed = dotenv.parse(readFileSync(envPath, 'utf8'));

for (const envName of environments) {
	if (!['production', 'preview', 'development'].includes(envName)) {
		console.error(
			`Invalid environment "${envName}". Use production, preview, or development.`
		);
		process.exit(1);
	}

	for (const [key, value] of Object.entries(parsed)) {
		if (!key?.trim() || key.startsWith('#')) continue;
		if (value === undefined || value === '') continue;

		console.log(`→ ${key} (${envName})`);

		const r = spawnSync(
			'npx',
			[
				'vercel',
				'env',
				'add',
				key,
				envName,
				'--value',
				value,
				'--yes',
				'--sensitive',
				'--force'
			],
			{
				cwd: root,
				stdio: 'inherit',
				env: process.env,
				shell: process.platform === 'win32'
			}
		);

		if (r.status !== 0) {
			console.error(`Failed: ${key}`);
			process.exit(r.status ?? 1);
		}
	}
}

console.log('Done. Redeploy on Vercel so new values apply to existing deployments.');
