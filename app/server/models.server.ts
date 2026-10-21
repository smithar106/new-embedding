import type { ModelId, ModelInfo } from "~/types";

export const MODELS: ModelInfo[] = [
	{
		id: "bge-small-en-v1.5",
		name: "BGE Small v1.5",
		size: "small",
		provider: "BAAI · Cloudflare Workers AI",
		dimensions: 384,
		cfModelId: "@cf/baai/bge-small-en-v1.5",
		indexName: "embedding-bge-small",
		modelCardUrl: "https://huggingface.co/BAAI/bge-small-en-v1.5",
	},
	{
		id: "bge-base-en-v1.5",
		name: "BGE Base v1.5",
		size: "base",
		provider: "BAAI · Cloudflare Workers AI",
		dimensions: 768,
		cfModelId: "@cf/baai/bge-base-en-v1.5",
		indexName: "embedding-bge-base",
		modelCardUrl: "https://huggingface.co/BAAI/bge-base-en-v1.5",
	},
	{
		id: "bge-large-en-v1.5",
		name: "BGE Large v1.5",
		size: "large",
		provider: "BAAI · Cloudflare Workers AI",
		dimensions: 1024,
		cfModelId: "@cf/baai/bge-large-en-v1.5",
		indexName: "embedding-bge-large",
		modelCardUrl: "https://huggingface.co/BAAI/bge-large-en-v1.5",
	},
];

export function getModel(id: ModelId): ModelInfo {
	const model = MODELS.find((m) => m.id === id);
	if (!model) {
		throw new Error(`Unknown model id: ${id}`);
	}
	return model;
}
