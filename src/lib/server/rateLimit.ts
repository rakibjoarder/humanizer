import { dev } from '$app/environment';
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from '$env/static/private';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	reset: number;
}

const PASS_THROUGH: RateLimitResult = { allowed: true, remaining: 999, reset: 0 };

const isConfigured =
	UPSTASH_REDIS_REST_URL &&
	!UPSTASH_REDIS_REST_URL.includes('placeholder') &&
	UPSTASH_REDIS_REST_TOKEN &&
	!UPSTASH_REDIS_REST_TOKEN.includes('placeholder');

if (!isConfigured && !dev) {
	console.error('[rateLimit] WARNING: Rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable it.');
}

let detectLimiter: Ratelimit | null = null;
let humanizeLimiter: Ratelimit | null = null;

if (isConfigured) {
	const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });
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
