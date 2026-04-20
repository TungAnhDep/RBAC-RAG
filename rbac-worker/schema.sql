
-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS Roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roles_name ON Roles(name);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON Users(role_id);

-- ============================================================
-- 3. GROUPS (Permission groups: e.g., HR_TEAM, PUBLIC_TEAM)
-- ============================================================
CREATE TABLE IF NOT EXISTS Groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_groups_name ON Groups(name);

-- ============================================================
-- 4. GROUP_ROLES (Many-to-many: Maps Roles to Groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS GroupRoles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, role_id),
    FOREIGN KEY (group_id) REFERENCES Groups(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_group_roles_group_id ON GroupRoles(group_id);
CREATE INDEX IF NOT EXISTS idx_group_roles_role_id ON GroupRoles(role_id);

-- ============================================================
-- 5. DOCUMENTS (Document/content storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS Documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    access_level TEXT DEFAULT 'PRIVATE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_reference TEXT -- e.g., PDF filename or external ID
);
CREATE INDEX IF NOT EXISTS idx_documents_title ON Documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON Documents(access_level);

-- ============================================================
-- 6. DOCUMENT_GROUPS (Many-to-many: Documents to Groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS DocumentGroups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, group_id),
    FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES Groups(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doc_groups_document_id ON DocumentGroups(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_groups_group_id ON DocumentGroups(group_id);

-- ============================================================
-- 7. VECTORS (Metadata mapping for Vectorize)
-- ============================================================
-- This table no longer stores the actual embedding (that's in Vectorize).
-- Use it to store sync status, chunk metadata, or fallback info.
-- ============================================================
CREATE TABLE IF NOT EXISTS Vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    allowed_groups_json TEXT, 
    vectorize_id TEXT UNIQUE, 
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vectors_document_id ON Vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_vectors_vectorize_id ON Vectors(vectorize_id);
CREATE INDEX IF NOT EXISTS idx_vectors_synced_at ON Vectors(synced_at);

-- ============================================================
-- 8. SEARCH_CACHE (Semantic cache for frequently searched queries)
-- ============================================================
CREATE TABLE IF NOT EXISTS SearchCache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    query_hash TEXT NOT NULL, -- Hash of the sanitized query
    result_json TEXT, -- JSON of search results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE(user_id, query_hash)
);
CREATE INDEX IF NOT EXISTS idx_search_cache_user_id ON SearchCache(user_id);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON SearchCache(expires_at);

-- ============================================================
-- 9. DOCUMENTS_FTS (Full-Text Search Virtual Table for BM25)
-- ============================================================
CREATE VIRTUAL TABLE IF NOT EXISTS Documents_FTS USING fts5(
    title,
    content,
    content=Documents,
    content_rowid=id
);


CREATE TRIGGER IF NOT EXISTS docs_ai AFTER INSERT ON Documents BEGIN
  INSERT INTO Documents_FTS(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS docs_ad AFTER DELETE ON Documents BEGIN
  INSERT INTO Documents_FTS(Documents_FTS, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON Documents BEGIN
  INSERT INTO Documents_FTS(Documents_FTS, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  INSERT INTO Documents_FTS(rowid, title, content) VALUES (new.id, new.title, new.content);
END;