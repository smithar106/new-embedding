import type { Route } from "./+types/api.health";
import type { HealthResponse } from "~/types";
import { MODELS } from "~/server/models.server";
import { getVectorizeIndex } from "~/server/bindings.server";
import { getProviderAvailability } from "~/server/providers/index.server";

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const body: HealthResponse = {
		status: "ok",
		app: "Embedding Evolution Lab",
		version: "0.1.0",
		timestamp: new Date().toISOString(),
		models: MODELS.map((m) => ({
			...m,
			availability: getProviderAvailability(m.id, env),
		})),
		vectorize: MODELS.map((m) => ({
			modelId: m.id,
			indexName: m.indexName,
			bound: Boolean(getVectorizeIndex(m.id, env)),
		})),
	};

	return Response.json(body);
}
