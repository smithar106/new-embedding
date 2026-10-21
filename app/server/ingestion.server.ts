import type { ModelId } from "~/types";
import { MODELS } from "./models.server";
import { getVectorizeIndex } from "./bindings.server";
import { getProvider } from "./providers/index.server";
import { splitIntoChunks } from "./chunking.server";

export interface IngestDocumentInput {
	id: string;
	title: string;
	sourceUrl: string;
	pageCount: number;
	year?: number | null;
	text: string;
}

export interface IngestDocumentResult {
	documentId: string;
	chunkCount: number;
	perModel: {
		modelId: ModelId;
		dimensions: number;
		upserted: number;
	}[];
}

export async function ingestDocument(
	env: Env,
	input: IngestDocumentInput,
): Promise<IngestDocumentResult> {
	const chunks = splitIntoChunks(input.id, input.text);
	const chunkTexts = chunks.map((c) => c.text);

	const perModel: IngestDocumentResult["perModel"] = [];

	for (const model of MODELS) {
		const provider = getProvider(model.id, env);
		const index = getVectorizeIndex(model.id, env);

		const embeddings = await provider.embedDocuments(chunkTexts);

		if (index) {
			await index.upsert(
				chunks.map((chunk, i) => ({
					id: chunk.id,
					values: embeddings[i].vector,
					metadata: {
						chunkId: chunk.id,
						documentId: input.id,
						documentTitle: input.title,
						sourceUrl: input.sourceUrl,
						pageNumber: chunk.pageNumber,
					},
				})),
			);
		}

		perModel.push({
			modelId: model.id,
			dimensions: model.dimensions,
			upserted: chunks.length,
		});
	}

	const now = new Date().toISOString();
	const statements = [
		env.EMBEDDING_DB.prepare(
			`INSERT INTO documents
				(id, title, source_url, page_count, year, status, chunk_count, ingested_at)
			 VALUES (?, ?, ?, ?, ?, 'ingested', ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				title = excluded.title,
				source_url = excluded.source_url,
				page_count = excluded.page_count,
				year = excluded.year,
				chunk_count = excluded.chunk_count,
				ingested_at = excluded.ingested_at`,
		).bind(
			input.id,
			input.title,
			input.sourceUrl,
			input.pageCount,
			input.year ?? null,
			chunks.length,
			now,
		),
		...chunks.map((chunk) =>
			env.EMBEDDING_DB.prepare(
				`INSERT INTO chunks (id, document_id, chunk_index, page_number, text)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET text = excluded.text`,
			).bind(chunk.id, input.id, chunk.index, chunk.pageNumber, chunk.text),
		),
	];

	await env.EMBEDDING_DB.batch(statements);

	return {
		documentId: input.id,
		chunkCount: chunks.length,
		perModel,
	};
}
