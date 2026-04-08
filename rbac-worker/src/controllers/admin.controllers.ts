import { Context } from 'hono';
import { Bindings, Variables } from '../index';
import {
	addGroupToRoleService,
	createGroupService,
	createRoleService,
	deleteDocumentService,
	deleteGroupService,
	deleteUserService,
	getAllDocumentsWithGroupsService,
	getPermissionMatrixService,
	getUserService,
	removeGroupFromRoleService,
	updateDocumentGroupsService,
	updateGroupNameService,
	updateRoleNameService,
	updateUserRoleService,
	deleteRoleService,
} from '../services/admin.services';

import { Redis } from '@upstash/redis/cloudflare';
type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
export const createRoleController = async (c: Context<{ Bindings: Bindings }>) => {
	const { name } = await c.req.json();
	if (!name) return c.json({ error: 'Tên Role không được để trống' }, 400);
	try {
		const result = await createRoleService(c.env.DB, name);
		return c.json(result);
	} catch (e) {
		return c.json({ error: 'Lỗi khi tạo Role', details: String(e) }, 500);
	}
};

export const getUserController = async (c: AppContext) => {
	const user = c.get('user');
	if (user.role !== 'Admin') return c.json({ error: 'Unauthorized' }, 403);
	try {
		const users = await getUserService(c.env.DB);

		return c.json(users);
	} catch (e) {
		return c.json({ error: 'Internal server error' }, 500);
	}
};
export const updateUserRoleController = async (c: AppContext) => {
	const { user_id, role_id } = await c.req.json();
	await updateUserRoleService(c.env.DB, user_id, role_id, Redis.fromEnv(c.env));
	return c.json({ success: true });
};
export const getDocumentsController = async (c: AppContext) => {
	const docs = await getAllDocumentsWithGroupsService(c.env.DB);
	return c.json(docs);
};
export const addGroupToRoleController = async (c: AppContext) => {
	const { role_id, group_id } = await c.req.json();
	await addGroupToRoleService(c.env.DB, role_id, group_id);
	return c.json({ success: true });
};

export const removeGroupFromRoleController = async (c: AppContext) => {
	const { role_id, group_id } = await c.req.json();
	await removeGroupFromRoleService(c.env.DB, role_id, group_id);
	return c.json({ success: true });
};

export const createGroupController = async (c: AppContext) => {
	const { name } = await c.req.json();
	if (!name) return c.json({ error: 'Tên Group không được để trống' }, 400);

	try {
		await createGroupService(c.env.DB, name);
		return c.json({
			success: true,
			message: `Đã tạo Group "${name}" thành công`,
		});
	} catch {
		return c.json({ error: 'Group này đã tồn tại' }, 500);
	}
};

export const getPermissionMatrixController = async (c: AppContext) => {
	const user = c.get('user');
	if (user.role !== 'Admin') return c.json({ error: 'Unauthorized' }, 403);

	const matrix = await getPermissionMatrixService(c.env.DB);
	return c.json(matrix);
};

export const updateDocumentGroupsController = async (c: AppContext) => {
	const { document_id, group_ids } = await c.req.json();
	await updateDocumentGroupsService(c.env.DB, document_id, group_ids);

	return c.json({ success: true });
};



export const deleteDocumentController = async (c: AppContext) => {
	const docId = c.req.param('id');
	const user = c.get('user'); 

	
	if (user.role !== 'Admin') {
		return c.json({ error: 'Forbidden' }, 403);
	}

	try {
		
		const redis = Redis.fromEnv(c.env);

		const result = await deleteDocumentService(c.env.DB, c.env.VECTOR_INDEX, redis, Number(docId));

		return c.json(result);
	} catch (e) {
		return c.json({ error: 'Lỗi khi xóa tài liệu', details: String(e) }, 500);
	}
};
export const deleteUserController = async (c: AppContext) => {
	const userId = c.req.param('id');
	const admin = c.get('user');

	if (admin.role !== 'Admin') return c.json({ error: 'Unauthorized' }, 403);

	try {
		const redis = Redis.fromEnv(c.env);
		await deleteUserService(c.env.DB, redis, Number(userId));
		return c.json({ success: true, message: 'Đã xóa nhân viên và phiên làm việc' });
	} catch (e) {
		return c.json({ error: 'Lỗi khi xóa nhân viên', details: String(e) }, 500);
	}
};


export const deleteGroupController = async (c: AppContext) => {
	const groupId = c.req.param('id');
	const admin = c.get('user');

	if (admin.role !== 'Admin') return c.json({ error: 'Unauthorized' }, 403);

	try {
		const redis = Redis.fromEnv(c.env);
		await deleteGroupService(c.env.DB, redis, Number(groupId));
		return c.json({ success: true, message: 'Đã xóa nhóm và cập nhật cache hệ thống' });
	} catch (e) {
		return c.json({ error: 'Lỗi khi xóa nhóm', details: String(e) }, 500);
	}
};
export const updateRoleNameController = async (c: AppContext) => {
	const { id, name } = await c.req.json();
	await updateRoleNameService(c.env.DB, Number(id), name);
	return c.json({ success: true });
};

export const updateGroupNameController = async (c: AppContext) => {
	const { id, name } = await c.req.json();
	await updateGroupNameService(c.env.DB, Number(id), name);
	return c.json({ success: true });
};

export const deleteRoleController = async (c: AppContext) => {
	const roleId = c.req.param('id');
	const user = c.get('user'); 

	if (user.role !== 'Admin') return c.json({ error: 'Forbidden' }, 403);

	try {
		const redis = Redis.fromEnv(c.env);
		await deleteRoleService(c.env.DB, redis, Number(roleId));
		return c.json({ success: true, message: 'Đã xóa Role thành công' });
	} catch (e: any) {
		return c.json({ error: e.message }, 500);
	}
};
