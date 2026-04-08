import { authMiddleware } from '../middleware/auth.middleware';
export const createRoleService = async (db: D1Database, roleName: string) => {
	await db.prepare('INSERT INTO Roles (name) VALUES (?)').bind(roleName).run();
	const res = { success: true, message: `Đã tạo Role "${roleName}" thành công` };
	return res;
};
export const getUserService = async (db: D1Database) => {
	const result = await db
		.prepare(
			`SELECT u.id, u.email, r.name as role, u.role_id 
         FROM Users u JOIN Roles r ON u.role_id = r.id`,
		)

		.all();
	return result.results;
};
export const deleteUserService = async (db: D1Database, redis: any, userId: number) => {
	await db.prepare('DELETE FROM Users WHERE id = ?').bind(userId).run();

	try {
		const historyKeys = await redis.keys(`chat_history:${userId}:*`);
		const sessionKeys = await redis.keys(`session:${userId}:*`);

		const allKeys = [...historyKeys, ...sessionKeys];

		if (allKeys.length > 0) {
			await redis.del(...allKeys);
		}
	} catch (redisError) {
		console.error('Redis Cleanup Error:', redisError);
	}

	return { success: true };
};
export const updateUserRoleService = async (db: D1Database, user_id: number, role_id: number, redis: any) => {
	await db.prepare('UPDATE Users SET role_id = ? WHERE id = ?').bind(role_id, user_id).run();
	try {
		const sessionKey = `session:${user_id}`;
		await redis.del(sessionKey);

		await redis.incr('global_search_cache_version');
	} catch (e) {
		console.error('Lỗi khi hủy session:', e);
	}
};
export const deleteGroupService = async (db: D1Database, redis: any, groupId: number) => {
	await db.batch([
		db.prepare('DELETE FROM GroupRoles WHERE group_id = ?').bind(groupId),
		db.prepare('DELETE FROM DocumentGroups WHERE group_id = ?').bind(groupId),
		db.prepare('DELETE FROM Groups WHERE id = ?').bind(groupId),
	]);

	try {
		await redis.incr('global_search_cache_version');

		const searchKeys = await redis.keys('cache:search:*');
		if (searchKeys.length > 0) {
			await redis.del(...searchKeys);
		}
	} catch (e) {
		console.error('Redis Group Cleanup Error:', e);
	}

	return { success: true };
};
export const getAllDocumentsWithGroupsService = async (db: D1Database) => {
	const result = await db
		.prepare(
			`
		SELECT d.id, d.title, d.access_level, d.content, GROUP_CONCAT(dg.group_id) as group_ids
		FROM Documents d
		LEFT JOIN DocumentGroups dg ON d.id = dg.document_id
		GROUP BY d.id
	`,
		)
		.all();

	return result.results.map((doc: any) => ({
		...doc,
		groups: doc.group_ids ? doc.group_ids.split(',').map(Number) : [],
	}));
};
export const addGroupToRoleService = async (db: D1Database, role_id: number, group_id: number) => {
	await db.prepare('INSERT OR IGNORE INTO GroupRoles (group_id, role_id) VALUES (?, ?)').bind(group_id, role_id).run();
};

export const removeGroupFromRoleService = async (db: D1Database, role_id: number, group_id: number) => {
	await db.prepare('DELETE FROM GroupRoles WHERE role_id = ? AND group_id = ?').bind(role_id, group_id).run();
};

export const createGroupService = async (db: D1Database, name: string) => {
	await db.prepare('INSERT INTO Groups (name) VALUES (?)').bind(name).run();
};

export const getPermissionMatrixService = async (db: D1Database) => {
	const roles = await db.prepare('SELECT id, name FROM Roles').all();

	const groups = await db.prepare('SELECT id, name FROM Groups').all();

	const assignments = await db.prepare('SELECT role_id, group_id FROM GroupRoles').all();

	return {
		roles: roles.results,
		groups: groups.results,
		assignments: assignments.results,
	};
};

export const updateDocumentGroupsService = async (db: D1Database, document_id: number, group_ids: number[]) => {
	const batch = [
		db.prepare('DELETE FROM DocumentGroups WHERE document_id = ?').bind(document_id),
		...group_ids.map((gid) => db.prepare('INSERT INTO DocumentGroups (document_id, group_id) VALUES (?, ?)').bind(document_id, gid)),
	];

	await db.batch(batch);
};

export const deleteDocumentService = async (db: D1Database, vectorIndex: any, redis: any, docId: number) => {
	const tasks = [
		db.prepare('DELETE FROM DocumentGroups WHERE document_id = ?').bind(docId).run(),
		db.prepare('DELETE FROM Documents WHERE id = ?').bind(docId).run(),
		db.prepare('DELETE FROM Documents_FTS WHERE rowid = ?').bind(docId).run(),
	];

	if (vectorIndex) {
		tasks.push(vectorIndex.deleteByIds([docId.toString()]));
	}

	const results = await Promise.allSettled(tasks);

	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			console.error(`Task ${index} failed:`, result.reason);
		}
	});

	try {
		const keys = await redis.keys('cache:search:*');
		if (keys.length > 0) await redis.del(...keys);
		await redis.incr('global_search_cache_version');
	} catch (e) {
		console.error('Redis Cleanup Silent Error:', e);
	}

	return { success: true, message: 'Yêu cầu xóa đã được xử lý tối đa' };
};
export const updateRoleNameService = async (db: D1Database, id: number, name: string) => {
	await db.prepare('UPDATE Roles SET name = ? WHERE id = ?').bind(name, id).run();
};

export const updateGroupNameService = async (db: D1Database, id: number, name: string) => {
	await db.prepare('UPDATE Groups SET name = ? WHERE id = ?').bind(name, id).run();
};

export const deleteRoleService = async (db: D1Database, redis: any, roleId: number) => {
	const role = await db.prepare('SELECT name FROM Roles WHERE id = ?').bind(roleId).first<{ name: string }>();
	if (role?.name === 'Admin') {
		throw new Error('Không thể xóa Role Admin hệ thống');
	}

	const tasks = [
		db.prepare('DELETE FROM GroupRoles WHERE role_id = ?').bind(roleId).run(),
		db.prepare('UPDATE Users SET role_id = NULL WHERE role_id = ?').bind(roleId).run(),
		db.prepare('DELETE FROM Roles WHERE id = ?').bind(roleId).run(),
	];

	const results = await Promise.allSettled(tasks);

	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			console.error(`Task ${index} failed:`, result.reason);
		}
	});

	try {
		await redis.incr('global_search_cache_version');
	} catch (e) {
		console.error('Redis Error:', e);
	}

	return { success: true };
};
