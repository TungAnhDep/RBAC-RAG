// src/middleware/rate-limit.middleware.ts
import { createMiddleware } from 'hono/factory';
import { Redis } from '@upstash/redis/cloudflare';
import { Bindings, Variables } from '../index';

export const rateLimitMiddleware = (limit: number, windowSeconds: number = 60) =>
	createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
		const redis = Redis.fromEnv(c.env);
		const user = c.get('user');
		const userId = user.sub;

		const now = Math.floor(Date.now() / 1000);
		const currentWindow = Math.floor(now / windowSeconds);
		const prevWindow = currentWindow - 1;

		const currentKey = `ratelimit:${userId}:${currentWindow}`;
		const prevKey = `ratelimit:${userId}:${prevWindow}`;

		// Sliding Window Counter Logic
		const [currCount, prevCount] = await redis.mget<number[]>(currentKey, prevKey);

		const weight = (windowSeconds - (now % windowSeconds)) / windowSeconds;
		const estimatedCount = (currCount || 0) + (prevCount || 0) * weight;

		if (estimatedCount >= limit) {
			return c.json(
				{
					error: 'Too Many Requests',
					message: `Bạn chỉ được gửi ${limit} yêu cầu mỗi phút.`,
				},
				429,
			);
		}

		// Tăng count trong Redis
		await redis
			.pipeline()
			.incr(currentKey)
			.expire(currentKey, windowSeconds * 2)
			.exec();

		await next();
	});
