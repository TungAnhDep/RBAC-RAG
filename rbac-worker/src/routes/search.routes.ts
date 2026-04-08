import { Hono } from 'hono';
import { Bindings, Variables } from '../index';
import { authMiddleware } from '../middleware/auth.middleware';
import { searchController } from '../controllers/search.controllers';
import { rateLimitMiddleware } from '../middleware/rate_limiter';
const searchRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

searchRoutes.post('/', authMiddleware, rateLimitMiddleware(10), searchController);

export { searchRoutes };
