import type { Route } from "./+types/api.search";
import { searchAllModels } from "~/server/search.server";
import { validateSearchInput } from "~/server/http.server";

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ error: "invalid_request", message: "Request body must be valid JSON", status: 400 },
			{ status: 400 },
		);
	}

	const validation = validateSearchInput(body);
	if (!validation.ok) {
		return validation.response;
	}

	const results = await searchAllModels(env, validation.value.query, validation.value.topK);
	return Response.json(results);
}
