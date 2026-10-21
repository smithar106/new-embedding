import type { Route } from "./+types/api.ingestion.status";
import type { IngestionStatusResponse } from "~/types";
import { MODELS } from "~/server/models.server";

export async function loader(_args: Route.LoaderArgs) {
	const body: IngestionStatusResponse = {
		documents: [],
		perModel: MODELS.map((m) => ({
			indexName: m.indexName,
			indexedVectors: 0,
			status: "empty",
		})),
		lastRunAt: null,
	};

	return Response.json(body);
}
