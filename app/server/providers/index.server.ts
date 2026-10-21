import type { ModelAvailability, ModelId } from "~/types";
import { getModel } from "../models.server";
import { WorkersAIEmbeddingProvider } from "./workersai.server";
import type { EmbeddingProvider } from "./types.server";

export function getProviderAvailability(
	_modelId: ModelId,
	env: Env,
): ModelAvailability {
	if (!env.AI) {
		return {
			available: false,
			reason: "Workers AI binding is not configured",
		};
	}

	return { available: true };
}

export function getProvider(modelId: ModelId, env: Env): EmbeddingProvider {
	return new WorkersAIEmbeddingProvider(getModel(modelId), env);
}
