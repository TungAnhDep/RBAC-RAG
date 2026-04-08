
export const conversationService = {
	
	async getUserConversations(db: D1Database, userId: number) {
		return await db
			.prepare(
				`SELECT id, title, created_at FROM Conversations 
       WHERE user_id = ? ORDER BY updated_at DESC`,
			)
			.bind(userId)
			.all();
	},

	
	async getConversationMessages(db: D1Database, conversationId: string) {
		return await db
			.prepare(
				`SELECT role, content, created_at FROM Messages 
       WHERE conversation_id = ? ORDER BY created_at ASC`,
			)
			.bind(conversationId)
			.all();
	},

	
	async createConversation(db: D1Database, userId: number, title?: string) {
		const id = crypto.randomUUID(); 
		await db
			.prepare(`INSERT INTO Conversations (id, user_id, title) VALUES (?, ?, ?)`)
			.bind(id, userId, title || 'Cuộc hội thoại mới')
			.run();
		return id;
	},
	async deleteConversation(db: D1Database, conversationId: string) {
		
		await db.prepare(`DELETE FROM Messages WHERE conversation_id = ?`).bind(conversationId).run();
		await db.prepare(`DELETE FROM Conversations WHERE id = ?`).bind(conversationId).run();
		return true;
	},

	
	async renameConversation(db: D1Database, conversationId: string, newTitle: string) {
		await db
			.prepare(`UPDATE Conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
			.bind(newTitle, conversationId)
			.run();
		return true;
	},

	
	async generateAndSaveTitle(db: D1Database, ai: any, conversationId: string, firstMessage: string) {
		const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			prompt: `Tóm tắt câu sau thành một tiêu đề ngắn gọn (tối đa 5 từ) bằng tiếng Việt để làm tên lịch sử chat: "${firstMessage}". Chỉ trả về tiêu đề, không giải thích, không dùng dấu ngoặc kép.`,
			max_tokens: 15,
		});

		let title = aiResponse.response.trim().replace(/["']/g, '');
		if (!title) title = 'Hội thoại mới';

		await this.renameConversation(db, conversationId, title);
		return title;
	},
};
