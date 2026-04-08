import { Hono } from 'hono';
import { Bindings, Variables } from '../index';
import { createFactory } from 'hono/factory';
import { jwt } from 'hono/jwt';
import { Redis } from '@upstash/redis/cloudflare';
import { env } from 'cloudflare:workers';
import { conversationService } from './conversation.services';
interface EmbeddingResponse {
	vector: number[];
}
interface VectorMatch {
	id: string;
	score: number;
	metadata?: Record<string, any>;
}
interface BM25Match {
	id: number;
	title: string;
	content: string;
}
interface RerankResult {
	id: number;
	score: number;
}
interface VectorQueryResponse {
	matches: VectorMatch[];
}
interface DBQueryResponse {
	results: BM25Match[];
}
interface SearchDeps {
	db: D1Database;
	vectorIndex: any;
	embeddingSvc: Fetcher;
	ai: any;
	query: string;
	userId: number;
	conversationId: string;
	isNewConv?: boolean;
	ctx: any;
}

async function queryClassification(query: string, ai: any): Promise<string> {
	const prompt = `
    You are a professional router for an AI company. 
    Classify the query into "chitchat" or "search".
    
    Guidelines:
    - "chitchat": Greetings, personal feelings, jokes, or non-work general talk. (e.g., "Hello", "How are you?", "Tell me a story")
    - "search": Questions about company policies, internship tasks, projects, or work procedures. (e.g., "What to do in first week?", "Greenland project details", "How to use Slack?")
    
    Examples:
    - "Chào bạn" -> chitchat
    - "Thực tập sinh cần làm gì trong tuần đầu tiên" -> search
    - "Dự án Digesty là gì?" -> search
    - "Bạn có khỏe không?" -> chitchat

    Query: "${query}"
    Result (One word only):`;

	const res = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
		prompt: prompt,
		max_tokens: 10,
	});

	return res.response.trim().toLowerCase();
}

async function transformQuery(query: string, ai: any): Promise<string> {
	const transformPrompt = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
		prompt: `You are a Senior Search Engineer for FrensAI.

Task:
Rewrite the user's query to improve semantic clarity for vector search.

STRICT RULES:
1. Preserve the original intent exactly.
2. Do NOT expand the scope.
3. Do NOT add new topics.
4. Do NOT introduce related but unstated concepts.
5. Keep it within the same time frame and context.
Write 1–2 clear sentences in Vietnamese.
Do not describe an ideal document. Only clarify the user’s request.

Input: "${query}"
Output:`,
		max_tokens: 150,
	});

	const result = transformPrompt.response
		.replace(/["'()]/g, '')
		.replace(/[,.;:]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

	return result || query;
}
async function hashQuery(query: string): Promise<string> {
	const msgUint8 = new TextEncoder().encode(query.trim().toLowerCase());
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
function reciprocalRankFusion(vectorResults: any[], bm25Results: any[], k = 60) {
	const scores = new Map<number, number>();

	vectorResults.forEach((doc, index) => {
		const baseId = parseInt(String(doc.id).split('_')[0], 10);
		if (!isNaN(baseId)) {
			scores.set(baseId, (scores.get(baseId) ?? 0) + 1 / (k + index + 1));
		}
	});

	bm25Results.forEach((doc, index) => {
		const baseId = Number(doc.id);
		if (!isNaN(baseId)) {
			scores.set(baseId, (scores.get(baseId) ?? 0) + 1 / (k + index + 1));
		}
	});

	return Array.from(scores.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 50);
}
export const searchService = async (
	{ db, vectorIndex, embeddingSvc, ai, query, userId, conversationId, isNewConv, ctx }: SearchDeps,
	redis: any,
) => {
	const user = await db
		.prepare(
			`
      SELECT u.id, u.email, r.name as role
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      WHERE u.id = ?
    `,
		)
		.bind(userId)
		.first<{ id: number; email: string; role: string }>();

	if (!user) {
		return { error: 'User not found' };
	}

	const userGroupsResult = await db
		.prepare(
			`
      SELECT DISTINCT g.id
      FROM Groups g
      JOIN GroupRoles gr ON g.id = gr.group_id
      JOIN Roles r ON gr.role_id = r.id
      WHERE r.name = ?
    `,
		)
		.bind(user.role)
		.all<{ id: number }>();

	const userGroupIds = userGroupsResult.results.map((r) => r.id);
	const userRole = user.role;

	if (userGroupIds.length === 0) {
		return {
			role: userRole,
			groups: [],
			response: 'User has no group permissions.',
		};
	}
	const version = (await redis.get('global_search_cache_version')) || '1';
	const queryHash = await hashQuery(query);
	const permissionFingerprint = await hashQuery(userGroupIds.join(','));
	const cacheKey = `cache:search:v${version}${permissionFingerprint}:${queryHash}`;

	const cachedResult = await redis.get(cacheKey);
	if (isNewConv) {
		ctx.waitUntil(
			conversationService
				.generateAndSaveTitle(db, ai, conversationId, query)
				.then(() => console.log('Đã tạo title mới thành công ở background!'))
				.catch((err) => console.error('Lỗi khi tự động đặt tên:', err)),
		);
	}
	if (cachedResult) {
		await db.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, 'user', query).run();

		await db
			.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)')
			.bind(conversationId, 'bot', cachedResult.response)
			.run();

		await db.prepare('UPDATE Conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(conversationId).run();
		return { ...cachedResult, source: 'semantic_cache' };
	}

	const intent = await queryClassification(query, ai);
	if (intent.includes('chitchat')) {
		const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
			prompt: `You are a helpful assistant named FrensBot that answers 
			 user queries and chat with them. Question: "${query}" Answer:`,
			max_tokens: 250,
		});
		await db.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, 'user', query).run();
		await db
			.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)')
			.bind(conversationId, 'bot', aiResponse.response)
			.run();
		await db.prepare('UPDATE Conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(conversationId).run();
		return {
			role: userRole,
			groups: userGroupIds,
			response: aiResponse.response,
		};
	} else {
		await db.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, 'user', query).run();
		const historyKey = `chat_history:v${version}${userId}:${permissionFingerprint}:${conversationId}`;
		const rawHistory = await redis.lrange(historyKey, -6, -1);
		const historyContext = rawHistory.join('\n');

		const sanitizedQuery = query
			.replace(/[^\w\s\u00C0-\u1EF9]/g, ' ')
			.trim()
			.toLowerCase();

		const transformedQuery = await transformQuery(sanitizedQuery, ai);
		if (!sanitizedQuery) {
			return { error: 'Query cannot be empty' };
		}
		let searchQueries = sanitizedQuery;

		if (historyContext) {
			const standaloneQuery = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
				prompt: `Dựa trên lịch sử trò chuyện và câu hỏi mới nhất, hãy viết lại câu hỏi để nó có thể đứng độc lập mà vẫn giữ nguyên ý nghĩa.
        Chỉ trả về câu hỏi đã sửa, không giải thích.
        
        Lịch sử: ${historyContext}
        Câu hỏi mới: ${transformedQuery}
        Câu hỏi độc lập:`,
				max_tokens: 100,
			});
			searchQueries = standaloneQuery.response.trim();
		}

		const [vectorRes, bm25Res] = await Promise.all([
			semanticSearch({
				vectorIndex,
				embeddingSvc,
				query: searchQueries,
				userGroupIds,
			}),
			keywordSearch({
				db,
				query: sanitizedQuery,
				userGroupIds,
			}),
		]);
		

		const topMatches = reciprocalRankFusion(vectorRes.matches, bm25Res.results);

		if (topMatches.length === 0) {
			return {
				role: userRole,
				groups: userGroupIds,
				response: 'No documents found.',
			};
		}

		const ids = topMatches.map((m) => m[0]);
		const placeholders = ids.map(() => '?').join(',');

		const docs = await db
			.prepare(`SELECT id, title, content FROM Documents WHERE id IN (${placeholders})`)
			.bind(...ids)
			.all<{ id: number; title: string; content: string }>();

		if (docs.results.length === 0) {
			return { response: 'No document content found.' };
		}

		const rerankResponse = await ai.run('@cf/baai/bge-reranker-base', {
			query: transformedQuery,
			contexts: docs.results.map((d) => ({
				text: `[${d.title}] ${d.content}`,
			})),
			top_k: 5,
		});

		const sorted = (rerankResponse.response || []).sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

		const rerankedDocs = sorted.map((r: any) => docs.results[r.id]).filter(Boolean);

		const context = rerankedDocs
			.map((d: any) => d.content)
			.join('\n---\n')
			.substring(0, 3000);
		const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fast', {
			prompt: `Bạn đã nói
You are FrensBot, a company assistant that answers questions based only on the provided context documents. The user is authorized to view the context.



Instructions:



1. Base your answer only on the provided context.

2. You may combine information from multiple parts of the context.

3. You may paraphrase or summarize the information for clarity.

4. You may make logical inferences only if they are directly supported by the context.

5. Do not use external knowledge.

6. Use Recent History to maintain conversation context, but do not rely on it for factual information if the context documents do not support it. If the history contradicts the documents, prioritize the documents and clarify any discrepancies in your answer.

7. If the answer is not supported by the context, and Recent History does not provide a clear answer, respond with "Sorry, I don't have enough information in the provided documents." Do not speculate or guess.

Recent History:
        ${historyContext}
Context:
${context}

Question: ${sanitizedQuery}

Answer:`,
			max_tokens: 500,
		});

		const finalResult = {
			role: userRole,
			groups: userGroupIds,
			source: 'hybrid_search',
			response: aiResponse.response,
			documents_referenced: rerankedDocs.map((d: any) => ({
				id: d.id,
				title: d.title,
			})),
		};

		await redis.set(cacheKey, finalResult, { ex: 3600 });

		await redis.rpush(historyKey, `User: ${query}`, `AI: ${aiResponse.response}`);
		await redis.ltrim(historyKey, -10, -1);
		await redis.expire(historyKey, 3600);

		await db
			.prepare('INSERT INTO Messages (conversation_id, role, content) VALUES (?, ?, ?)')
			.bind(conversationId, 'bot', aiResponse.response)
			.run();
		await db.prepare('UPDATE Conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(conversationId).run();
		return finalResult;
	}
};
async function semanticSearch({ vectorIndex, embeddingSvc, query, userGroupIds }: any) {
	const embedRes = await embeddingSvc.fetch('http://user/embed', {
		method: 'POST',
		body: JSON.stringify({ text: query }),
	});

	if (!embedRes.ok) return { matches: [] };

	const { vector } = await embedRes.json();

	const result = await vectorIndex.query(vector, {
		topK: 50,
		filter: {
			allowed_group_id: {
				$in: userGroupIds.map((id: number) => id.toString()),
			},
		},
		returnMetadata: true,
	});

	return result;
}

async function keywordSearch({ db, query, userGroupIds }: any) {
	const placeholders = userGroupIds.map(() => '?').join(',');

	return db
		.prepare(
			`
      SELECT d.id, d.title, d.content
      FROM Documents d
      JOIN DocumentGroups dg ON d.id = dg.document_id
      JOIN Documents_FTS f ON d.id = f.rowid
      WHERE dg.group_id IN (${placeholders})
        AND f.content MATCH ?
      GROUP BY d.id
      ORDER BY rank
      LIMIT 50
    `,
		)
		.bind(...userGroupIds, query)
		.all();
}
