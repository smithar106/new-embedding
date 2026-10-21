export type ModelId =
	| "bge-small-en-v1.5"
	| "bge-base-en-v1.5"
	| "bge-large-en-v1.5";

export type ModelSize = "small" | "base" | "large";

export type ModelStatus = "ok" | "empty" | "unavailable" | "error";

export interface ModelInfo {
	id: ModelId;
	name: string;
	size: ModelSize;
	provider: string;
	dimensions: number;
	cfModelId: string;
	indexName: string;
	modelCardUrl: string;
}

export interface ModelAvailability {
	available: boolean;
	reason?: string;
}

export interface ModelMeta extends ModelInfo {
	availability: ModelAvailability;
}

export interface Timing {
	embeddingMs: number;
	searchMs: number;
	totalMs: number;
}

export interface SearchResultItem {
	chunkId: string;
	documentId: string;
	documentTitle: string;
	sourceUrl: string;
	pageNumber: number;
	text: string;
	score: number;
}

export interface ModelSearchResult {
	modelId: ModelId;
	modelName: string;
	size: ModelSize;
	status: ModelStatus;
	error?: string;
	results: SearchResultItem[];
	timings: Timing;
}

export interface SearchResponse {
	query: string;
	topK: number;
	searchedAt: string;
	models: ModelSearchResult[];
}

export type DocumentStatus = "ingested" | "pending" | "failed";

export interface DocumentMeta {
	id: string;
	title: string;
	sourceUrl: string;
	pageCount: number;
	chunkCount: number;
	status: DocumentStatus;
	error?: string;
}

export interface IngestionPerModelStatus {
	indexName: string;
	indexedVectors: number;
	status: "ready" | "empty" | "unavailable";
}

export interface IngestionStatusResponse {
	documents: DocumentMeta[];
	perModel: IngestionPerModelStatus[];
	lastRunAt: string | null;
}

export interface HealthResponse {
	status: "ok";
	app: string;
	version: string;
	timestamp: string;
	models: ModelMeta[];
	vectorize: {
		modelId: ModelId;
		indexName: string;
		bound: boolean;
	}[];
}

export interface ModelsResponse {
	models: ModelMeta[];
}

export interface DocumentsResponse {
	documents: DocumentMeta[];
}

export interface ApiError {
	error: string;
	message: string;
	status: number;
}
