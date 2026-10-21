CREATE TABLE IF NOT EXISTS documents (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	source_url TEXT NOT NULL,
	page_count INTEGER NOT NULL,
	year INTEGER,
	status TEXT NOT NULL DEFAULT 'ingested',
	chunk_count INTEGER NOT NULL DEFAULT 0,
	ingested_at TEXT
);

CREATE TABLE IF NOT EXISTS chunks (
	id TEXT PRIMARY KEY,
	document_id TEXT NOT NULL REFERENCES documents(id),
	chunk_index INTEGER NOT NULL,
	page_number INTEGER NOT NULL,
	text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
