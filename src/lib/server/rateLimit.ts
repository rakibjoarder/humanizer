import { dev } from '$app/environment';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { upstashRedisCredentials } from '$lib/server/upstashRedis';

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	reset: number;
}

const PASS_THROUGH: RateLimitResult = { allowed: true, remaining: 999, reset: 0 };

const upstashCreds = upstashRedisCredentials();
const isConfigured = upstashCreds != null;

if (!isConfigured && !dev) {
	console.error(
		'[rateLimit] WARNING: Rate limiting is DISABLED. Set Upstash REST URL + token (e.g. UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, or HTTPS REDIS_URL + REDIS_TOKEN).'
	);
}

let detectLimiter: Ratelimit | null = null;
let humanizeLimiter: Ratelimit | null = null;

if (upstashCreds) {
	const redis = new Redis(upstashCreds);
	detectLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:detect' });
	humanizeLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:humanize' });
}

export async function checkRateLimit(
	endpoint: 'detect' | 'humanize',
	identifier: string
): Promise<RateLimitResult> {
	const limiter = endpoint === 'detect' ? detectLimiter : humanizeLimiter;
	if (!limiter) return PASS_THROUGH;

	const { success, remaining, reset } = await limiter.limit(identifier);
	return { allowed: success, remaining, reset };
}
