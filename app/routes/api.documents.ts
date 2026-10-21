import type { Route } from "./+types/api.documents";
import type { DocumentsResponse } from "~/types";

export async function loader(_args: Route.LoaderArgs) {
	const body: DocumentsResponse = {
		documents: [],
	};

	return Response.json(body);
}
