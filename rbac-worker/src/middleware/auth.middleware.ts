import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { Bindings, Variables } from '../index';
import { Redis } from '@upstash/redis/cloudflare';
export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader) return c.json({ error: 'Missing Token' }, 401);

	const token = authHeader.split(' ')[1];
	try {
		const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

		const user: Variables['user'] = {
			sub: typeof payload.sub === 'number' ? payload.sub : Number(payload.sub),
			email: String(payload.email || ''),
			role: String(payload.role || ''),
		};
		const redis = Redis.fromEnv(c.env);

		if (!user.sub || !user.email || !user.role) {
			return c.json({ error: 'Token thiếu thông tin người dùng' }, 403);
		}

		c.set('user', user);
		await next();
	} catch (e) {
		return c.json({ error: 'Invalid Token' }, 403);
	}
});
