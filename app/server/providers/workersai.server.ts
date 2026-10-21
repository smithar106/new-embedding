import type { ModelId, ModelInfo } from "~/types";
import {
	ProviderRequestError,
	type EmbeddingProvider,
	type EmbeddingResult,
} from "./types.server";

interface WorkersAIEmbeddingOutput {
	shape?: number[];
	data?: number[][];
}

export class WorkersAIEmbeddingProvider implements EmbeddingProvider {
	readonly modelId: ModelId;
	readonly name: string;

	constructor(
		private readonly model: ModelInfo,
		private readonly env: Env,
	) {
		this.modelId = model.id;
		this.name = model.name;
	}

	async embedQuery(query: string): Promise<EmbeddingResult> {
		return this.run(query);
	}

	async embedDocument(text: string): Promise<EmbeddingResult> {
		return this.run(text);
	}

	async embedDocuments(texts: string[]): Promise<EmbeddingResult[]> {
		if (texts.length === 0) {
			return [];
		}
		const output = (await this.env.AI.run(this.model.cfModelId, {
			text: texts,
		})) as WorkersAIEmbeddingOutput;

		const rows = output?.data ?? [];
		if (rows.length !== texts.length) {
			throw new ProviderRequestError(
				this.modelId,
				`expected ${texts.length} embeddings, received ${rows.length}`,
			);
		}

		return rows.map((vector) => {
			if (!vector || vector.length !== this.model.dimensions) {
				throw new ProviderRequestError(
					this.modelId,
					`unexpected embedding dimension ${vector?.length ?? 0} (expected ${this.model.dimensions})`,
				);
			}
			return { vector, dimensions: vector.length };
		});
	}

	private async run(text: string): Promise<EmbeddingResult> {
		const output = (await this.env.AI.run(this.model.cfModelId, {
			text: [text],
		})) as WorkersAIEmbeddingOutput;

		const vector = output?.data?.[0];
		if (!vector || vector.length === 0) {
			throw new ProviderRequestError(
				this.modelId,
				"empty embedding returned by Workers AI",
			);
		}

		if (vector.length !== this.model.dimensions) {
			throw new ProviderRequestError(
				this.modelId,
				`unexpected embedding dimension ${vector.length} (expected ${this.model.dimensions})`,
			);
		}

		return { vector, dimensions: vector.length };
	}
}
