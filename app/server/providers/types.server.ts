import type { ModelId } from "~/types";

export interface EmbeddingResult {
	vector: number[];
	dimensions: number;
}

export interface EmbeddingProvider {
	readonly modelId: ModelId;
	readonly name: string;
	embedQuery(query: string): Promise<EmbeddingResult>;
	embedDocument(text: string): Promise<EmbeddingResult>;
}

export class ProviderUnavailableError extends Error {
	constructor(modelId: ModelId, reason: string) {
		super(`Embedding provider for "${modelId}" is unavailable: ${reason}`);
		this.name = "ProviderUnavailableError";
	}
}

export class ProviderRequestError extends Error {
	constructor(modelId: ModelId, message: string) {
		super(`Embedding request failed for "${modelId}": ${message}`);
		this.name = "ProviderRequestError";
	}
}
