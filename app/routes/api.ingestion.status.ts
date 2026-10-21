import type { Route } from "./+types/api.ingestion.status";
import type {
	DocumentMeta,
	IngestionStatusResponse,
	IngestionPerModelStatus,
} from "~/types";
import { MODELS } from "~/server/models.server";
import { getVectorizeIndex } from "~/server/bindings.server";

interface DocumentRow {
	id: string;
	title: string;
	source_url: string;
	page_count: number;
	chunk_count: number;
	status: DocumentMeta["status"];
}

interface LastRunRow {
	last_ingested_at: string | null;
}

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const docs = await env.EMBEDDING_DB.prepare(
		"SELECT id, title, source_url, page_count, chunk_count, status FROM documents ORDER BY id",
	).all<DocumentRow>();

	const documents: DocumentMeta[] = docs.results.map((row) => ({
		id: row.id,
		title: row.title,
		sourceUrl: row.source_url,
		pageCount: row.page_count,
		chunkCount: row.chunk_count,
		status: row.status,
	}));

	const lastRun = await env.EMBEDDING_DB.prepare(
		"SELECT MAX(ingested_at) AS last_ingested_at FROM documents",
	).first<LastRunRow>();

	const totalChunks = await env.EMBEDDING_DB.prepare(
		"SELECT COALESCE(SUM(chunk_count), 0) AS total FROM documents",
	).first<{ total: number }>();

	const perModel: IngestionPerModelStatus[] = [];
	for (const model of MODELS) {
		const index = getVectorizeIndex(model.id, env);
		perModel.push({
			indexName: model.indexName,
			indexedVectors: totalChunks?.total ?? 0,
			status: index
				? (totalChunks?.total ?? 0) > 0
					? "ready"
					: "empty"
				: "unavailable",
		});
	}

	const body: IngestionStatusResponse = {
		documents,
		perModel,
		lastRunAt: lastRun?.last_ingested_at ?? null,
	};

	return Response.json(body);
}
