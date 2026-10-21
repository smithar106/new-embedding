import type { Route } from "./+types/api.models";
import type { ModelsResponse } from "~/types";
import { MODELS } from "~/server/models.server";
import { getProviderAvailability } from "~/server/providers/index.server";

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const body: ModelsResponse = {
		models: MODELS.map((m) => ({
			...m,
			availability: getProviderAvailability(m.id, env),
		})),
	};

	return Response.json(body);
}
