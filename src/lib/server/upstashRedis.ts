import { env } from '$env/dynamic/private';

/**
 * Credentials for @upstash/redis (HTTP REST). TCP `redis://` URLs are not supported.
 * Accepts Vercel / Upstash naming: UPSTASH_* , KV_REST_* , or HTTPS REDIS_URL + REDIS_TOKEN.
 */
export function upstashRedisCredentials(): { url: string; token: string } | null {
	const token =
		(env.UPSTASH_REDIS_REST_TOKEN ?? '').trim() ||
		(env.KV_REST_API_TOKEN ?? '').trim() ||
		(env.REDIS_TOKEN ?? '').trim();

	let url = (env.UPSTASH_REDIS_REST_URL ?? '').trim() || (env.KV_REST_API_URL ?? '').trim();

	const redisUrl = (env.REDIS_URL ?? '').trim();
	if (!url && redisUrl.startsWith('https://')) {
		url = redisUrl;
	}

	if (!token || token.includes('placeholder')) return null;
	if (!url || url.includes('placeholder')) return null;

	return { url, token };
}
