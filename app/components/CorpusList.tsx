import type { DocumentMeta, IngestionStatusResponse } from "~/types";

export function CorpusList({
	documents,
	ingestion,
}: {
	documents: DocumentMeta[];
	ingestion: IngestionStatusResponse | null;
}) {
	return (
		<div className="space-y-4">
			{ingestion && (
				<div className="grid gap-2 sm:grid-cols-3">
					{ingestion.perModel.map((m) => (
						<div
							key={m.indexName}
							className="rounded-lg border border-neutral-100 bg-white p-3"
						>
							<div className="text-xs font-medium text-neutral-700">{m.indexName}</div>
							<div className="mt-1 flex items-center justify-between">
								<span className="text-xs text-neutral-400">{m.status}</span>
								<span className="font-mono text-xs text-neutral-700">
									{m.indexedVectors} vectors
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			{documents.length === 0 ? (
				<div className="rounded-xl border border-dashed border-neutral-200 py-10">
					<p className="text-center text-sm text-neutral-400">
						No documents indexed yet. Ingest the corpus to enable retrieval.
					</p>
				</div>
			) : (
				<ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white">
					{documents.map((doc) => (
						<li key={doc.id} className="flex items-center justify-between gap-3 p-4">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-neutral-800">
									{doc.title}
								</p>
								<p className="mt-0.5 text-xs text-neutral-400">
									{doc.pageCount} pages · {doc.chunkCount} chunks
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-3">
								<a
									href={doc.sourceUrl}
									target="_blank"
									rel="noreferrer"
									className="text-xs text-brand-dark underline decoration-brand/40 underline-offset-2"
								>
									source
								</a>
								<span
									className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
										doc.status === "ingested"
											? "bg-emerald-50 text-emerald-700 ring-emerald-200"
											: doc.status === "failed"
												? "bg-red-50 text-red-700 ring-red-200"
												: "bg-neutral-100 text-neutral-500 ring-neutral-200"
									}`}
								>
									{doc.status}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
