import type { Route } from "./+types/api.ingestion.run";
import { jsonError } from "~/server/http.server";
import {
	ingestDocument,
	type IngestDocumentInput,
} from "~/server/ingestion.server";

function isAuthorized(request: Request, env: Env): boolean {
	const expected = env.INGESTION_SECRET;
	if (!expected) {
		return false;
	}
	const provided = request.headers.get("x-ingestion-secret");
	return provided === expected;
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;

	if (!isAuthorized(request, env)) {
		return jsonError(
			401,
			"unauthorized",
			"Missing or invalid ingestion secret (x-ingestion-secret header)",
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonError(400, "invalid_request", "Request body must be valid JSON");
	}

	const doc = (body as Record<string, unknown>)?.document;

	if (typeof doc !== "object" || doc === null) {
		return jsonError(400, "invalid_request", "Missing document payload");
	}

	const input = doc as Record<string, unknown>;
	if (
		typeof input.id !== "string" ||
		input.id.length === 0 ||
		typeof input.title !== "string" ||
		input.title.length === 0 ||
		typeof input.sourceUrl !== "string" ||
		input.sourceUrl.length === 0 ||
		typeof input.text !== "string" ||
		input.text.length === 0 ||
		typeof input.pageCount !== "number" ||
		!Number.isInteger(input.pageCount)
	) {
		return jsonError(
			400,
			"invalid_request",
			"document requires id, title, sourceUrl, text, and pageCount",
		);
	}

	const document: IngestDocumentInput = {
		id: input.id as string,
		title: input.title as string,
		sourceUrl: input.sourceUrl as string,
		pageCount: input.pageCount as number,
		year: typeof input.year === "number" ? (input.year as number) : null,
		text: input.text as string,
	};

	try {
		const result = await ingestDocument(env, document);
		return Response.json({ ok: true, result });
	} catch (err) {
		return jsonError(
			500,
			"ingestion_failed",
			err instanceof Error ? err.message : String(err),
		);
	}
}
