import { describe, it, expect } from "vitest";
import { formatMatchResult } from "~/server/search.server";

describe("formatMatchResult", () => {
	it("maps Vectorize metadata to a search result item", () => {
		const result = formatMatchResult({
			id: "2507.08011:3",
			score: 0.82,
			metadata: {
				chunkId: "2507.08011:3",
				documentId: "2507.08011",
				documentTitle: "Energy Management",
				sourceUrl: "https://arxiv.org/abs/2507.08011",
				pageNumber: 2,
			},
		});

		expect(result).toEqual({
			chunkId: "2507.08011:3",
			documentId: "2507.08011",
			documentTitle: "Energy Management",
			sourceUrl: "https://arxiv.org/abs/2507.08011",
			pageNumber: 2,
			text: "",
			score: 0.82,
		});
	});

	it("falls back gracefully when metadata is missing", () => {
		const result = formatMatchResult({ id: "doc:0", score: 0.5 });
		expect(result.chunkId).toBe("doc:0");
		expect(result.documentTitle).toBe("Unknown document");
		expect(result.pageNumber).toBe(0);
		expect(result.score).toBe(0.5);
	});

	it("defaults a missing score to 0", () => {
		const result = formatMatchResult({ id: "doc:0" });
		expect(result.score).toBe(0);
	});
});
