import type { ApiError } from "~/types";

export function jsonError(
	status: number,
	error: string,
	message: string,
): Response {
	const body: ApiError = { error, message, status };
	return Response.json(body, { status });
}

export interface ValidatedSearchInput {
	query: string;
	topK: number;
}

export const MAX_QUERY_LENGTH = 500;
export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 10;

export function validateSearchInput(
	body: unknown,
):
	| { ok: true; value: ValidatedSearchInput }
	| { ok: false; response: Response } {
	if (typeof body !== "object" || body === null) {
		return {
			ok: false,
			response: jsonError(
				400,
				"invalid_request",
				"Request body must be a JSON object",
			),
		};
	}

	const { query, topK } = body as Record<string, unknown>;

	if (typeof query !== "string" || query.trim().length === 0) {
		return {
			ok: false,
			response: jsonError(
				400,
				"invalid_query",
				"Query must be a non-empty string",
			),
		};
	}

	const trimmed = query.trim();
	if (trimmed.length > MAX_QUERY_LENGTH) {
		return {
			ok: false,
			response: jsonError(
				400,
				"query_too_long",
				`Query must be ${MAX_QUERY_LENGTH} characters or fewer`,
			),
		};
	}

	let resolvedTopK = DEFAULT_TOP_K;
	if (topK !== undefined) {
		if (
			typeof topK !== "number" ||
			!Number.isInteger(topK) ||
			topK < 1 ||
			topK > MAX_TOP_K
		) {
			return {
				ok: false,
				response: jsonError(
					400,
					"invalid_top_k",
					`topK must be an integer between 1 and ${MAX_TOP_K}`,
				),
			};
		}
		resolvedTopK = topK;
	}

	return { ok: true, value: { query: trimmed, topK: resolvedTopK } };
}
