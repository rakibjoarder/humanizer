import { dev } from '$app/environment';
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from '$env/static/private';
import { Redis } from '@upstash/redis';

const COOKIE = 'hai_demo_detect';
const REDIS_PREFIX = 'demo:detect:ip:';

const redisConfigured =
	UPSTASH_REDIS_REST_URL &&
	!UPSTASH_REDIS_REST_URL.includes('placeholder') &&
	UPSTASH_REDIS_REST_TOKEN &&
	!UPSTASH_REDIS_REST_TOKEN.includes('placeholder');

const redis = redisConfigured ? new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN }) : null;

function parseDemoCookie(cookieHeader: string | null): boolean {
	if (!cookieHeader) return false;
	return cookieHeader.split(';').some((p) => p.trim().startsWith(`${COOKIE}=1`));
}

/**
 * Anonymous users get one preview detection (browser cookie + optional Redis by IP).
 */
export async function anonymousDemoAlreadyUsed(
	request: Request,
	ip: string
): Promise<boolean> {
	if (parseDemoCookie(request.headers.get('cookie'))) return true;
	if (redis) {
		const v = await redis.get(`${REDIS_PREFIX}${ip}`);
		return v != null;
	}
	return false;
}

export function demoDetectCookieHeader(): string {
	const secure = !dev ? '; Secure' : '';
	return `${COOKIE}=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 400}${secure}`;
}

export async function persistAnonymousDemo(ip: string): Promise<void> {
	if (redis) {
		await redis.set(`${REDIS_PREFIX}${ip}`, '1');
	}
}
