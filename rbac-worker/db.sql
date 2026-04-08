CREATE TABLE IF NOT EXISTS Conversations (
    id TEXT PRIMARY KEY, -- Sử dụng UUID hoặc chuỗi ngẫu nhiên
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'Cuộc hội thoại mới',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conv_user_id ON Conversations(user_id);

-- ============================================================
-- 11. MESSAGES (Lưu chi tiết tin nhắn trong từng phiên)
-- ============================================================
CREATE TABLE IF NOT EXISTS Messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'bot')) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv_id ON Messages(conversation_id);