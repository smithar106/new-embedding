import type { ModelInfo, ModelSearchResult } from "~/types";

const STATUS_STYLES: Record<
	ModelSearchResult["status"],
	{ label: string; className: string }
> = {
	ok: { label: "Retrieved", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
	empty: { label: "No matches", className: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
	unavailable: { label: "Unavailable", className: "bg-amber-50 text-amber-700 ring-amber-200" },
	error: { label: "Error", className: "bg-red-50 text-red-700 ring-red-200" },
};

function StatusBadge({ status }: { status: ModelSearchResult["status"] }) {
	const { label, className } = STATUS_STYLES[status];
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${className}`}
		>
			{label}
		</span>
	);
}

function TimingRow({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex items-baseline justify-between gap-2">
			<span className="text-xs text-neutral-500">{label}</span>
			<span className="font-mono text-xs text-neutral-800">{value.toFixed(1)} ms</span>
		</div>
	);
}

export function ModelPanel({
	result,
	info,
	hasSearched,
}: {
	result: ModelSearchResult | null;
	info: ModelInfo;
	hasSearched: boolean;
}) {
	return (
		<section className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h3 className="text-base font-semibold text-neutral-900">{info.name}</h3>
						<span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-xs font-semibold uppercase text-brand-dark">
							{info.size}
						</span>
					</div>
					<p className="mt-1 text-xs text-neutral-500">
						{info.provider} · {info.dimensions} dims ·{" "}
						<a
							href={info.modelCardUrl}
							target="_blank"
							rel="noreferrer"
							className="text-brand-dark underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
						>
							model card
						</a>
					</p>
				</div>
				{result ? (
					<StatusBadge status={result.status} />
				) : (
					<span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 ring-1 ring-neutral-200">
						Idle
					</span>
				)}
			</div>

			{!result ? (
				<div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-200 py-10">
					<p className="px-6 text-center text-sm text-neutral-400">
						{hasSearched ? "Preparing results…" : "Run a search to compare retrieval."}
					</p>
				</div>
			) : result.status === "unavailable" || result.status === "error" ? (
				<div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-200 py-10">
					<p className="px-6 text-center text-sm text-neutral-500">
						{result.error ?? "This model did not return results."}
					</p>
				</div>
			) : result.results.length === 0 ? (
				<div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-200 py-10">
					<p className="px-6 text-center text-sm text-neutral-400">
						No matching passages for this query.
					</p>
				</div>
			) : (
				<ol className="flex flex-col gap-3">
					{result.results.map((item, i) => (
						<li key={`${item.chunkId}-${i}`} className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
							<div className="mb-1 flex items-center justify-between gap-2">
								<span className="truncate text-xs font-medium text-neutral-700">
									{item.documentTitle}
								</span>
								<span className="shrink-0 font-mono text-xs text-neutral-400">
									p.{item.pageNumber}
								</span>
							</div>
							{item.text ? (
								<p className="mb-2 line-clamp-4 text-sm leading-relaxed text-neutral-700">
									{item.text}
								</p>
							) : (
								<p className="mb-2 text-sm italic text-neutral-400">
									Passage text unavailable for this result.
								</p>
							)}
							<div className="flex items-center justify-between">
								<span className="text-[11px] text-neutral-400">rank #{i + 1}</span>
								<span className="font-mono text-xs text-brand-dark">
									similarity {item.score.toFixed(3)}
								</span>
							</div>
						</li>
					))}
				</ol>
			)}

			<div className="mt-4 space-y-1 border-t border-neutral-100 pt-3">
				<TimingRow label="Embedding" value={result?.timings.embeddingMs ?? 0} />
				<TimingRow label="Vector search" value={result?.timings.searchMs ?? 0} />
				<TimingRow label="Total" value={result?.timings.totalMs ?? 0} />
			</div>
		</section>
	);
}
