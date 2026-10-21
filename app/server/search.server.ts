import type {
	ModelSearchResult,
	SearchResponse,
	SearchResultItem,
} from "~/types";
import { MODELS } from "./models.server";
import { getVectorizeIndex } from "./bindings.server";
import { getProvider, getProviderAvailability } from "./providers/index.server";

interface VectorMetadata {
	chunkId?: string;
	documentId?: string;
	documentTitle?: string;
	sourceUrl?: string;
	pageNumber?: number | string;
}

export async function searchAllModels(
	env: Env,
	query: string,
	topK: number,
): Promise<SearchResponse> {
	const models: ModelSearchResult[] = [];

	for (const model of MODELS) {
		const timings = { embeddingMs: 0, searchMs: 0, totalMs: 0 };
		const totalStart = Date.now();

		const availability = getProviderAvailability(model.id, env);
		if (!availability.available) {
			timings.totalMs = Date.now() - totalStart;
			models.push({
				modelId: model.id,
				modelName: model.name,
				size: model.size,
				status: "unavailable",
				error: availability.reason,
				results: [],
				timings,
			});
			continue;
		}

		const index = getVectorizeIndex(model.id, env);
		if (!index) {
			timings.totalMs = Date.now() - totalStart;
			models.push({
				modelId: model.id,
				modelName: model.name,
				size: model.size,
				status: "unavailable",
				error: `Vectorize index "${model.indexName}" is not bound to the worker`,
				results: [],
				timings,
			});
			continue;
		}

		try {
			const provider = getProvider(model.id, env);

			const embedStart = Date.now();
			const { vector } = await provider.embedQuery(query);
			timings.embeddingMs = Date.now() - embedStart;

			const searchStart = Date.now();
			const matches = await index.query(vector, {
				topK,
				returnValues: false,
				returnMetadata: true,
			});
			timings.searchMs = Date.now() - searchStart;

			const results: SearchResultItem[] = (matches.matches ?? []).map(
				(match) => {
					const meta = (match.metadata ?? {}) as unknown as VectorMetadata;
					return {
						chunkId: String(meta.chunkId ?? match.id ?? ""),
						documentId: String(meta.documentId ?? ""),
						documentTitle: String(meta.documentTitle ?? "Unknown document"),
						sourceUrl: String(meta.sourceUrl ?? ""),
						pageNumber: Number(meta.pageNumber ?? 0),
						text: "",
						score: match.score ?? 0,
					};
				},
			);

			const texts = await fetchChunkTexts(env, results.map((r) => r.chunkId));
			for (const result of results) {
				result.text = texts.get(result.chunkId) ?? "";
			}

			timings.totalMs = Date.now() - totalStart;
			models.push({
				modelId: model.id,
				modelName: model.name,
				size: model.size,
				status: results.length > 0 ? "ok" : "empty",
				results,
				timings,
			});
		} catch (err) {
			timings.totalMs = Date.now() - totalStart;
			models.push({
				modelId: model.id,
				modelName: model.name,
				size: model.size,
				status: "error",
				error: err instanceof Error ? err.message : String(err),
				results: [],
				timings,
			});
		}
	}

	return {
		query,
		topK,
		searchedAt: new Date().toISOString(),
		models,
	};
}

async function fetchChunkTexts(
	env: Env,
	chunkIds: string[],
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	const unique = [...new Set(chunkIds.filter((id) => id.length > 0))];
	if (unique.length === 0) {
		return map;
	}

	const statements = unique.map((id) =>
		env.EMBEDDING_DB.prepare("SELECT id, text FROM chunks WHERE id = ?").bind(id),
	);

	try {
		const rows = await env.EMBEDDING_DB.batch(statements);
		for (const result of rows) {
			const row = result.results?.[0] as { id?: string; text?: string } | undefined;
			if (row?.id && typeof row.text === "string") {
				map.set(row.id, row.text);
			}
		}
	} catch {
		// Text lookup is best-effort; provenance still comes from Vectorize metadata.
	}

	return map;
}
