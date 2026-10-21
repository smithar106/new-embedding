import { describe, it, expect } from "vitest";
import { splitIntoChunks } from "~/server/chunking.server";

const SAMPLE = [
	"--- Page 1 ---",
	"",
	"Data centers consume significant electricity. Cooling systems add further demand.",
	"Renewable energy can offset this load in many regions.",
	"",
	"--- Page 2 ---",
	"",
	"Grid operators must balance supply and demand continuously.",
	"",
].join("\n");

describe("splitIntoChunks", () => {
	it("assigns correct page numbers", () => {
		const chunks = splitIntoChunks("doc", SAMPLE);
		expect(chunks.length).toBeGreaterThan(0);
		expect(chunks.every((c) => c.pageNumber === 1 || c.pageNumber === 2)).toBe(true);
	});

	it("produces deterministic chunk ids", () => {
		const chunks = splitIntoChunks("doc", SAMPLE);
		expect(chunks[0].id).toBe("doc:0");
		expect(chunks[0].documentId).toBe("doc");
		expect(chunks.map((c) => c.id)).toEqual(
			chunks.map((c, i) => `doc:${i}`),
		);
	});

	it("is reproducible across calls", () => {
		expect(splitIntoChunks("doc", SAMPLE)).toEqual(splitIntoChunks("doc", SAMPLE));
	});

	it("respects the chunk size bound", () => {
		const chunks = splitIntoChunks("doc", SAMPLE, { chunkSize: 80 });
		for (const chunk of chunks) {
			expect(chunk.text.length).toBeLessThanOrEqual(160);
		}
	});

	it("returns empty for empty input", () => {
		expect(splitIntoChunks("doc", "")).toEqual([]);
	});
});
