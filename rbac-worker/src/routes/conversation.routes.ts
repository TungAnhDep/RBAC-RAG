// src/routes/conversation.route.ts
import { Hono } from 'hono';
import { conversationController } from '../controllers/conversation.controllers';
import { authMiddleware } from '../middleware/auth.middleware';

const conversationApp = new Hono();
conversationApp.use(authMiddleware);
conversationApp.get('/', conversationController.list);
conversationApp.get('/:id', conversationController.detail);
conversationApp.post('/', conversationController.create);
conversationApp.delete('/:id', conversationController.remove);
conversationApp.put('/:id', conversationController.update);
export { conversationApp };
