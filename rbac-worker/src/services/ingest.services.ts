// ingest.services.ts
import { Bindings } from '../index';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
export interface EmbeddingResponse {
	vector: number[];
}

export async function chunkText(text: string, chunkSize: number = 1000, chunkOverlap: number = 100): Promise<string[]> {
	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: chunkSize,
		chunkOverlap: chunkOverlap,
		separators: ['\n\n', '\n', ' ', ''],
	});

	return await splitter.splitText(text);
}

export const ingestDocumentService = async (env: Bindings, title: string, content: string, groupIds: number[]) => {
	const docResult = await env.DB.prepare('INSERT INTO Documents (title, content, access_level) VALUES (?, ?, ?)')
		.bind(title, content, 'PRIVATE')
		.run();

	const docId = docResult.meta.last_row_id;
	if (!docId) throw new Error('Không thể tạo tài liệu trong D1');

	for (const groupId of groupIds) {
		await env.DB.prepare('INSERT OR IGNORE INTO DocumentGroups (document_id, group_id) VALUES (?, ?)').bind(docId, groupId).run();
	}

	const chunks = await chunkText(content);

	const embeddingPromises = chunks.map(async (chunk, index) => {
		const embedRes = await env.EMBEDDING_SVC.fetch('http://user/embed', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: chunk }),
		});

		if (!embedRes.ok) throw new Error(`Embedding Service lỗi: ${embedRes.statusText}`);

		const { vector }: EmbeddingResponse = await embedRes.json();

		return groupIds.map((groupId) => ({
			id: `${docId}_${index}_g${groupId}`,
			values: vector,
			metadata: {
				document_id: docId,
				title,
				allowed_group_id: groupId.toString(),
				chunk_index: index,
			},
		}));
	});
	const results = await Promise.all(embeddingPromises);

	const vectorsToUpsert = results.flat();
	await env.VECTOR_INDEX.upsert(vectorsToUpsert);
	return { docId, chunksCount: chunks.length };
};
