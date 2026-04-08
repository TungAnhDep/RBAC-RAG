import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware } from '../middleware/auth.middleware';
import {
	getUserController,
	createRoleController,
	updateUserRoleController,
	getDocumentsController,
	addGroupToRoleController,
	removeGroupFromRoleController,
	createGroupController,
	getPermissionMatrixController,
	updateDocumentGroupsController,
	deleteDocumentController,
	deleteGroupController,
	deleteUserController,
	updateGroupNameController,
	updateRoleNameController,
	deleteRoleController,
} from '../controllers/admin.controllers';
import { requireAdminMiddleware } from '../middleware/admin.middleware';
const adminRoutes = new Hono<{ Bindings: Bindings }>();
adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', requireAdminMiddleware);

/** * 2. DANH SÁCH ROUTE (Đã loại bỏ trùng lặp và sắp xếp theo nhóm)
 */

adminRoutes.get('/users', getUserController);
adminRoutes.post('/users/update-role', updateUserRoleController);
adminRoutes.delete('/users/:id', deleteUserController);

adminRoutes.post('/roles/create', createRoleController);
adminRoutes.post('/roles/update', updateRoleNameController);
adminRoutes.delete('/roles/:id', deleteRoleController);
adminRoutes.post('/roles/add-group', addGroupToRoleController);
adminRoutes.post('/roles/remove-group', removeGroupFromRoleController);

adminRoutes.post('/groups/create', createGroupController);
adminRoutes.post('/groups/update', updateGroupNameController);
adminRoutes.delete('/groups/:id', deleteGroupController);

adminRoutes.get('/documents', getDocumentsController);
adminRoutes.post('/documents/update-groups', updateDocumentGroupsController);
adminRoutes.delete('/documents/:id', deleteDocumentController);

adminRoutes.get('/permissions/matrix', getPermissionMatrixController);
export { adminRoutes };
