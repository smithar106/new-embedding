import { describe, it, expect } from "vitest";
import { validateSearchInput, MAX_QUERY_LENGTH } from "~/server/http.server";

describe("validateSearchInput", () => {
	it("accepts a valid query and trims whitespace", () => {
		const result = validateSearchInput({ query: "  hello world  ", topK: 3 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.query).toBe("hello world");
			expect(result.value.topK).toBe(3);
		}
	});

	it("defaults topK to 5", () => {
		const result = validateSearchInput({ query: "hello" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.topK).toBe(5);
		}
	});

	it("rejects an empty or whitespace query", () => {
		expect(validateSearchInput({ query: "   " }).ok).toBe(false);
		expect(validateSearchInput({ query: "" }).ok).toBe(false);
		expect(validateSearchInput({}).ok).toBe(false);
	});

	it("rejects a non-object body", () => {
		expect(validateSearchInput(null).ok).toBe(false);
		expect(validateSearchInput("string").ok).toBe(false);
		expect(validateSearchInput(42).ok).toBe(false);
	});

	it("rejects an out-of-range topK", () => {
		expect(validateSearchInput({ query: "q", topK: 0 }).ok).toBe(false);
		expect(validateSearchInput({ query: "q", topK: 11 }).ok).toBe(false);
		expect(validateSearchInput({ query: "q", topK: 2.5 }).ok).toBe(false);
		expect(validateSearchInput({ query: "q", topK: "5" }).ok).toBe(false);
	});

	it("rejects an over-long query", () => {
		expect(
			validateSearchInput({ query: "x".repeat(MAX_QUERY_LENGTH + 1) }).ok,
		).toBe(false);
		expect(
			validateSearchInput({ query: "x".repeat(MAX_QUERY_LENGTH) }).ok,
		).toBe(true);
	});
});
