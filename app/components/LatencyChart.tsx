import type { ModelSearchResult } from "~/types";

interface Series {
	key: "embeddingMs" | "searchMs" | "totalMs";
	label: string;
	color: string;
}

const SERIES: Series[] = [
	{ key: "embeddingMs", label: "Embedding", color: "bg-brand" },
	{ key: "searchMs", label: "Vector search", color: "bg-neutral-400" },
	{ key: "totalMs", label: "Total", color: "bg-neutral-700" },
];

export function LatencyChart({
	models,
	medianByModel,
}: {
	models: ModelSearchResult[];
	medianByModel: Record<string, number>;
}) {
	const maxValue = Math.max(
		1,
		...models.map((m) => m.timings.totalMs),
	);

	return (
		<div className="space-y-4">
			{models.map((model) => (
				<div key={model.modelId} className="rounded-xl border border-neutral-100 bg-white p-4">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-sm font-medium text-neutral-800">{model.modelName}</span>
						{medianByModel[model.modelId] !== undefined && (
							<span className="font-mono text-xs text-neutral-400">
								median total {medianByModel[model.modelId].toFixed(1)} ms
							</span>
						)}
					</div>
					<div className="space-y-1.5">
						{SERIES.map((series) => {
							const value = model.timings[series.key];
							const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
							return (
								<div key={series.key} className="flex items-center gap-2">
									<span className="w-24 shrink-0 text-xs text-neutral-500">
										{series.label}
									</span>
									<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
										<div
											className={`h-full rounded-full ${series.color}`}
											style={{ width: `${Math.max(pct, 1)}%` }}
										/>
									</div>
									<span className="w-20 shrink-0 text-right font-mono text-xs text-neutral-700">
										{value.toFixed(1)} ms
									</span>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
