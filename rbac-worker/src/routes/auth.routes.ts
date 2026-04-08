import { Hono } from 'hono';
import { Bindings } from '../index';
import { loginController, registerController } from '../controllers/auth.controllers';
const authRoutes = new Hono<{ Bindings: Bindings }>();
authRoutes.post('/register', registerController);
authRoutes.post('/login', loginController);

export { authRoutes };
