import { Context } from 'hono';
import { conversationService } from '../services/conversation.services';
import { Bindings, Variables } from '../index';
type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const conversationController = {
	async list(c: AppContext) {
		const db = c.env.DB;
		const userId = c.get('user');
		const result = await conversationService.getUserConversations(db, Number(userId.sub));
		return c.json(result);
	},

	async detail(c: AppContext) {
		const db = c.env.DB;
		const id = c.req.param('id');
		const result = await conversationService.getConversationMessages(db, id);
		return c.json({ messages: result.results });
	},

	async create(c: AppContext) {
		const db = c.env.DB;
		const userId = c.get('user');
		const { title } = await c.req.json();
		const id = await conversationService.createConversation(db, Number(userId.sub), title);
		return c.json({ id });
	},
	async remove(c: AppContext) {
		const db = c.env.DB;
		const id = c.req.param('id');
		await conversationService.deleteConversation(db, id);
		return c.json({ success: true });
	},

	async update(c: AppContext) {
		const db = c.env.DB;
		const id = c.req.param('id');
		const { title } = await c.req.json();
		await conversationService.renameConversation(db, id, title);
		return c.json({ success: true });
	},
};
