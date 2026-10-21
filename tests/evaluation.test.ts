import { describe, it, expect } from "vitest";
import {
	recallAtK,
	meanReciprocalRank,
	median,
	errorRate,
} from "~/server/evaluation.server";

describe("recallAtK", () => {
	it("counts relevant documents in the top-k", () => {
		const results = [{ documentId: "a" }, { documentId: "b" }, { documentId: "c" }];
		expect(recallAtK(results, ["a", "b"], 2)).toBe(1);
		expect(recallAtK(results, ["a", "x"], 2)).toBe(0.5);
	});

	it("deduplicates by document id", () => {
		const results = [
			{ documentId: "a" },
			{ documentId: "a" },
			{ documentId: "b" },
		];
		expect(recallAtK(results, ["a", "b"], 5)).toBe(1);
	});

	it("returns 0 for empty relevance labels", () => {
		expect(recallAtK([{ documentId: "a" }], [], 5)).toBe(0);
	});
});

describe("meanReciprocalRank", () => {
	it("returns the reciprocal of the first relevant rank", () => {
		expect(
			meanReciprocalRank(
				[{ documentId: "x" }, { documentId: "a" }, { documentId: "b" }],
				["a"],
			),
		).toBe(0.5);
	});

	it("returns 0 when nothing is relevant", () => {
		expect(
			meanReciprocalRank(
				[{ documentId: "x" }, { documentId: "y" }],
				["z"],
			),
		).toBe(0);
	});
});

describe("median", () => {
	it("computes the median", () => {
		expect(median([1, 2, 3])).toBe(2);
		expect(median([1, 2, 3, 4])).toBe(2.5);
		expect(median([5])).toBe(5);
		expect(median([])).toBe(0);
	});
});

describe("errorRate", () => {
	it("counts error/unavailable statuses", () => {
		expect(errorRate(["ok", "error", "ok", "unavailable"])).toBe(0.5);
		expect(errorRate(["ok", "ok"])).toBe(0);
		expect(errorRate([])).toBe(0);
	});
});
