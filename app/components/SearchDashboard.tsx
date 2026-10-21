import { useCallback, useEffect, useMemo, useState } from "react";
import type {
	DocumentMeta,
	DocumentsResponse,
	IngestionStatusResponse,
	ModelMeta,
	ModelSearchResult,
	SearchResponse,
} from "~/types";
import { ModelPanel } from "./ModelPanel";
import { LatencyChart } from "./LatencyChart";
import { CorpusList } from "./CorpusList";

const EXAMPLE_QUERIES = [
	"How much electricity do AI data centers consume?",
	"What sustainability challenges do GPU clusters create?",
	"How do hyperscale data centers manage grid demand?",
];

export function SearchDashboard({ models }: { models: ModelMeta[] }) {
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<SearchResponse | null>(null);
	const [history, setHistory] = useState<SearchResponse[]>([]);
	const [documents, setDocuments] = useState<DocumentMeta[]>([]);
	const [ingestion, setIngestion] = useState<IngestionStatusResponse | null>(null);

	useEffect(() => {
		Promise.allSettled([
			fetch("/api/documents").then((r) => r.json() as Promise<DocumentsResponse>),
			fetch("/api/ingestion/status").then(
				(r) => r.json() as Promise<IngestionStatusResponse>,
			),
		]).then(([docsResult, ingestionResult]) => {
			if (docsResult.status === "fulfilled") {
				setDocuments(docsResult.value.documents ?? []);
			}
			if (ingestionResult.status === "fulfilled") {
				setIngestion(ingestionResult.value);
			}
		});
	}, []);

	const runSearch = useCallback(async (rawQuery: string) => {
		const q = rawQuery.trim();
		if (!q) return;

		setLoading(true);
		setError(null);
		setHasSearched(true);

		try {
			const res = await fetch("/api/search", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query: q, topK: 5 }),
			});
			const data = (await res.json()) as SearchResponse & {
				error?: string;
				message?: string;
			};
			if (!res.ok) {
				setError(data.message ?? data.error ?? "Search failed");
				setResult(null);
				return;
			}
			setResult(data);
			setHistory((prev) => [...prev.slice(-9), data]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
			setResult(null);
		} finally {
			setLoading(false);
		}
	}, []);

	const medianByModel = useMemo(() => {
		const medians: Record<string, number> = {};
		for (const model of models) {
			const totals = history
				.map((run) => run.models.find((m) => m.modelId === model.id)?.timings.totalMs)
				.filter((v): v is number => typeof v === "number" && v > 0)
				.sort((a, b) => a - b);
			if (totals.length > 0) {
				const mid = Math.floor(totals.length / 2);
				medians[model.id] =
					totals.length % 2 === 0
						? (totals[mid - 1] + totals[mid]) / 2
						: totals[mid];
			}
		}
		return medians;
	}, [history, models]);

	const resultsByModel = useMemo(() => {
		const map = new Map<string, ModelSearchResult>();
		if (result) {
			for (const m of result.models) {
				map.set(m.modelId, m);
			}
		}
		return map;
	}, [result]);

	return (
		<div className="space-y-12">
			<section>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						runSearch(query);
					}}
					className="mx-auto max-w-3xl"
				>
					<label htmlFor="query" className="mb-2 block text-sm font-medium text-neutral-700">
						Search the corpus
					</label>
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							id="query"
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Ask a question about AI energy demand, data centers, or the grid…"
							maxLength={500}
							className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
						/>
						<button
							type="submit"
							disabled={loading || query.trim().length === 0}
							className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? "Searching…" : "Search"}
						</button>
					</div>
				</form>

				<div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2">
					<span className="text-xs text-neutral-400">Try:</span>
					{EXAMPLE_QUERIES.map((example) => (
						<button
							key={example}
							type="button"
							onClick={() => {
								setQuery(example);
								runSearch(example);
							}}
							className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 transition hover:border-brand hover:text-brand-dark"
						>
							{example}
						</button>
					))}
				</div>

				{error && (
					<div className="mx-auto mt-4 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				)}
			</section>

			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-neutral-900">
						Model comparison
					</h2>
					<p className="text-xs text-neutral-400">
						Similarity scores are comparable within a model, not across models.
					</p>
				</div>
				<div className="grid gap-5 lg:grid-cols-3">
					{models.map((model) => (
						<ModelPanel
							key={model.id}
							info={model}
							result={resultsByModel.get(model.id) ?? null}
							hasSearched={hasSearched}
						/>
					))}
				</div>
			</section>

			{result && result.models.some((m) => m.timings.totalMs > 0) && (
				<section>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-neutral-900">
							Performance
						</h2>
						<p className="text-xs text-neutral-400">
							Measured per model · latest run
						</p>
					</div>
					<LatencyChart models={result.models} medianByModel={medianByModel} />
				</section>
			)}

			<section>
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">Corpus</h2>
				<CorpusList documents={documents} ingestion={ingestion} />
			</section>
		</div>
	);
}
