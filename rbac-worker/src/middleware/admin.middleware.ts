import { createMiddleware } from 'hono/factory';
import { Bindings, Variables } from '../index';

export const requireAdminMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (user.role !== 'Admin') {
		return c.json({ error: 'Forbidden' }, 403);
	}

	await next();
});
