import type { Context } from 'hono';
import { Bindings, Variables } from '../index';
import { searchService } from '../services/search.services';
import { Redis } from '@upstash/redis/cloudflare';
import { conversationService } from '../services/conversation.services';
type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const searchController = async (c: AppContext) => {
	const user = c.get('user');
	const user_id = user?.sub;
	const { q: query, conversationId, isNewConv } = await c.req.json().catch(() => ({}));

	if (!query) return c.json({ error: 'Query không được để trống' }, 400);

	if (!user_id) return c.json({ error: 'Thiếu user_id' }, 400);

	const result = await searchService(
		{
			db: c.env.DB,
			vectorIndex: c.env.VECTOR_INDEX,
			embeddingSvc: c.env.EMBEDDING_SVC,
			ai: c.env.AI,
			query,
			userId: Number(user_id),
			conversationId: conversationId,
			isNewConv: isNewConv,
			ctx: c.executionCtx,
		},
		Redis.fromEnv(c.env),
	);

	return c.json(result);
};
