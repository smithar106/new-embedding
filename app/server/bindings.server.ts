import type { ModelId } from "~/types";

export function getVectorizeIndex(
	modelId: ModelId,
	env: Env,
): VectorizeIndex | undefined {
	switch (modelId) {
		case "bge-small-en-v1.5":
			return env.EMBEDDING_BGE_SMALL;
		case "bge-base-en-v1.5":
			return env.EMBEDDING_BGE_BASE;
		case "bge-large-en-v1.5":
			return env.EMBEDDING_BGE_LARGE;
		default:
			return undefined;
	}
}
