import { Context } from 'hono';
import { Bindings } from '../index';
import { Redis } from '@upstash/redis/cloudflare';
import { registerAuthService, loginAuthService } from '../services/auth.services';

type appContext = Context<{ Bindings: Bindings }>;
export const registerController = async (c: appContext) => {
	const { email, password, confirmPassword } = await c.req.json();

	if (!email || !password || !confirmPassword) {
		return c.json({ error: 'Thiếu thông tin đăng ký' }, 400);
	}

	if (password !== confirmPassword) {
		return c.json({ error: 'Mật khẩu không khớp' }, 400);
	}

	try {
		const result = await registerAuthService(c.env.DB, email, password);
		return c.json(result);
	} catch (e) {
		return c.json({ error: 'Email đã tồn tại hoặc lỗi hệ thống', details: String(e) }, 500);
	}
};
export const loginController = async (c: appContext) => {
	const { email, password } = await c.req.json();
	if (!email || !password) {
		return c.json({ error: 'Email and password are required' }, 400);
	}
	try {
		const res = await loginAuthService(c.env.DB, email, password, c.env.JWT_SECRET, Redis.fromEnv(c.env));
		const cookieValue = `frensai_token=${res.token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600; Partitioned`;

		c.header('Set-Cookie', cookieValue);
		c.header('Access-Control-Allow-Credentials', 'true');

		c.header('Access-Control-Allow-Origin', 'https://rbac-rag.pages.dev');
		// -----------------------
		return c.json(res);
	} catch (e) {
		return c.json({ error: 'Login failed', details: String(e) }, 401);
	}
};
