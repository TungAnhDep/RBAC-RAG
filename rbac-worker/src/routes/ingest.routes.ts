import { Hono } from 'hono';
import { Bindings, Variables } from '../index';
import { ingestDocumentController } from '../controllers/ingest.controllers';
import { authMiddleware } from '../middleware/auth.middleware';

const ingestRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

ingestRoutes.use('*', authMiddleware);

ingestRoutes.post('/document', ingestDocumentController);

export { ingestRoutes };
