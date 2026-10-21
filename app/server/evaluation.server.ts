export interface RankedResult {
	documentId: string;
}

export function recallAtK(
	results: RankedResult[],
	relevantIds: string[],
	k = 5,
): number {
	if (relevantIds.length === 0) {
		return 0;
	}
	const relevant = new Set(relevantIds);
	const topIds = uniqueIds(results).slice(0, k);
	const hits = topIds.filter((id) => relevant.has(id)).length;
	return hits / relevantIds.length;
}

export function meanReciprocalRank(
	results: RankedResult[],
	relevantIds: string[],
): number {
	if (relevantIds.length === 0) {
		return 0;
	}
	const relevant = new Set(relevantIds);
	const ids = uniqueIds(results);
	for (let i = 0; i < ids.length; i += 1) {
		if (relevant.has(ids[i])) {
			return 1 / (i + 1);
		}
	}
	return 0;
}

export function median(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

export function errorRate(statuses: string[]): number {
	if (statuses.length === 0) {
		return 0;
	}
	const errors = statuses.filter(
		(s) => s === "error" || s === "unavailable",
	).length;
	return errors / statuses.length;
}

export function uniqueIds(results: RankedResult[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const result of results) {
		if (result.documentId && !seen.has(result.documentId)) {
			seen.add(result.documentId);
			out.push(result.documentId);
		}
	}
	return out;
}
