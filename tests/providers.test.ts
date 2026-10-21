import { describe, it, expect, vi } from "vitest";
import { WorkersAIEmbeddingProvider } from "~/server/providers/workersai.server";
import { getModel } from "~/server/models.server";

function fakeEnv(run: (model: string, inputs: unknown) => Promise<unknown>): Env {
	return { AI: { run } } as unknown as Env;
}

const base = getModel("bge-base-en-v1.5");

describe("WorkersAIEmbeddingProvider", () => {
	it("embeds a query and validates the dimension", async () => {
		const run = vi.fn().mockResolvedValue({ data: [Array(768).fill(0.1)] });
		const provider = new WorkersAIEmbeddingProvider(base, fakeEnv(run));

		const result = await provider.embedQuery("hello");

		expect(result.dimensions).toBe(768);
		expect(run).toHaveBeenCalledWith("@cf/baai/bge-base-en-v1.5", {
			text: ["hello"],
		});
	});

	it("rejects an embedding with the wrong dimension", async () => {
		const run = vi.fn().mockResolvedValue({ data: [[1, 2, 3]] });
		const provider = new WorkersAIEmbeddingProvider(base, fakeEnv(run));

		await expect(provider.embedQuery("hello")).rejects.toThrow(/dimension/);
	});

	it("rejects an empty embedding", async () => {
		const run = vi.fn().mockResolvedValue({ data: [] });
		const provider = new WorkersAIEmbeddingProvider(base, fakeEnv(run));

		await expect(provider.embedQuery("hello")).rejects.toThrow();
	});

	it("embeds documents in a single batch", async () => {
		const run = vi
			.fn()
			.mockResolvedValue({ data: [Array(768).fill(0), Array(768).fill(0)] });
		const provider = new WorkersAIEmbeddingProvider(base, fakeEnv(run));

		const results = await provider.embedDocuments(["a", "b"]);

		expect(results).toHaveLength(2);
		expect(run).toHaveBeenCalledWith("@cf/baai/bge-base-en-v1.5", {
			text: ["a", "b"],
		});
	});
});
