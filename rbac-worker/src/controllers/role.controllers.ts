import { Context } from 'hono';
import { Bindings } from '../index';
import { getRolesService } from '../services/role.services';
type appContext = Context<{ Bindings: Bindings }>;
export const getRolesController = async (c: appContext) => {
	try {
		const result = await getRolesService(c.env.DB);
		return c.json(result);
	} catch (e) {
		return c.json({ error: 'Không thể tải danh sách vai trò' }, 500);
	}
};
