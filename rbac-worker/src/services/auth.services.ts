import { compare, hash } from 'bcryptjs';
import { sign } from 'hono/jwt';
import { Redis } from '@upstash/redis/cloudflare';
export const registerAuthService = async (db: D1Database, email: string, password: string) => {
	const passwordHash = await hash(password, 10);
	const internRole = await db.prepare('SELECT id FROM Roles WHERE name = ?').bind('Intern').first<{ id: number }>();

	const roleId = internRole?.id;

	if (!roleId) {
		throw new Error("Hệ thống chưa cấu hình Role 'Intern'. Vui lòng liên hệ Admin.");
	}

	await db.prepare('INSERT INTO Users (email, password_hash, role_id) VALUES (?, ?, ?)').bind(email, passwordHash, roleId).run();

	return { success: true, message: `Đã tạo user ${email} thành công.` };
};
export const loginAuthService = async (db: D1Database, email: string, password: string, jwtSecret: string, redis: Redis) => {
	const user = await db
		.prepare(
			`SELECT u.id, u.email, u.password_hash, r.name as role 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.id 
         WHERE u.email = ?`,
		)
		.bind(email)
		.first<{ id: number; email: string; password_hash: string; role: string }>();

	if (!user) {
		throw new Error('Invalid email or password');
	}

	const isPasswordValid = await compare(password, user.password_hash);

	if (!isPasswordValid) {
		throw new Error('Invalid email or password');
	}

	const payload = {
		sub: user.id,
		role: user.role,
		email: user.email,
		exp: Math.floor(Date.now() / 1000) + 60 * 60,
	};

	const token = await sign(payload, jwtSecret);
	const res = {
		success: true,
		token,
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
		},
	};
	await redis.set(`session:${user.id}`, token, { ex: 60 * 60 });
	return res;
};
