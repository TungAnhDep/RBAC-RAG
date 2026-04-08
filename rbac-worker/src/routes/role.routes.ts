import { Hono } from 'hono';
import { Bindings } from '../index';
import { getRolesController } from '../controllers/role.controllers';
const roleRoutes = new Hono<{ Bindings: Bindings }>();
roleRoutes.get('/', getRolesController);
export { roleRoutes };
