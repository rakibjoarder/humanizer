#!/usr/bin/env node
/**
 * Verifies PROXY_API_TOKEN and other server-only secrets never appear
 * in client-importable source files. Intended for CI pre-build checks.
 *
 * Exits 0 if clean, 1 if any violation found.
 */
import { execSync } from 'child_process';

const FORBIDDEN_PATTERNS = [
	'PROXY_API_TOKEN',
	'STRIPE_SECRET_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
	'STRIPE_WEBHOOK_SECRET',
];

// Files that are allowed to reference these (server-only).
// In SvelteKit, +page.server.ts / +layout.server.ts / +server.ts never ship to the client.
const ALLOWED_DIRS = [
	'src/lib/server/',
	'src/routes/api/',
	'src/routes/admin/',
	'supabase/',
	'scripts/',
];

// SvelteKit server-only file suffixes (never bundled for browser)
const SERVER_ONLY_SUFFIXES = [
	'+page.server.ts',
	'+layout.server.ts',
	'+server.ts',
	'+page.server.js',
	'+layout.server.js',
	'+server.js',
];

let violations = 0;

for (const pattern of FORBIDDEN_PATTERNS) {
	let raw = '';
	try {
		raw = execSync(
			`grep -r "${pattern}" src/ --include="*.svelte" --include="*.ts" --include="*.js" -l 2>/dev/null`,
			{ encoding: 'utf8' }
		);
	} catch {
		// grep exits 1 when no matches — that's fine
		continue;
	}

	const files = raw.trim().split('\n').filter(Boolean);

	for (const file of files) {
		const normalized = file.replace(/\\/g, '/');
		const isAllowedDir = ALLOWED_DIRS.some((dir) => normalized.includes(dir));
		const isServerOnlyFile = SERVER_ONLY_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
		const isAllowed = isAllowedDir || isServerOnlyFile;
		if (!isAllowed) {
			console.error(`[secret-check] VIOLATION: "${pattern}" found in client-accessible file: ${file}`);
			violations++;
		}
	}
}

if (violations === 0) {
	console.log('[secret-check] OK: No server secrets found in client-accessible files.');
	process.exit(0);
} else {
	console.error(`[secret-check] FAILED: ${violations} violation(s) found.`);
	process.exit(1);
}
