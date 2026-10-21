import type { Route } from "./+types/api.documents";
import type { DocumentsResponse, DocumentMeta } from "~/types";

interface DocumentRow {
	id: string;
	title: string;
	source_url: string;
	page_count: number;
	chunk_count: number;
	status: DocumentMeta["status"];
}

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const { results } = await env.EMBEDDING_DB.prepare(
		"SELECT id, title, source_url, page_count, chunk_count, status FROM documents ORDER BY id",
	).all<DocumentRow>();

	const documents: DocumentMeta[] = results.map((row) => ({
		id: row.id,
		title: row.title,
		sourceUrl: row.source_url,
		pageCount: row.page_count,
		chunkCount: row.chunk_count,
		status: row.status,
	}));

	const body: DocumentsResponse = { documents };
	return Response.json(body);
}
