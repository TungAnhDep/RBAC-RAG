import { Context } from 'hono';
import { Bindings, Variables } from '../index';
import { ingestDocumentService } from '../services/ingest.services';

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const ingestDocumentController = async (c: AppContext) => {
	const { title, content, group_ids } = await c.req.json();

	if (!content || !title || !group_ids?.length) {
		return c.json({ error: 'Thiếu thông tin tiêu đề, nội dung hoặc group_ids' }, 400);
	}

	try {
		const result = await ingestDocumentService(c.env, title, content, group_ids);
		return c.json({
			success: true,
			doc_id: result.docId,
			message: `Đã nạp thành công "${title}" với ${result.chunksCount} đoạn.`,
		});
	} catch (e) {
		return c.json({ error: 'Ingestion failed', details: String(e) }, 500);
	}
};
