import type { Route } from "./+types/api.$";
import type { ApiError } from "~/types";

export async function loader(): Promise<Response> {
	const body: ApiError = {
		error: "not_found",
		message: "Unknown API route",
		status: 404,
	};
	return Response.json(body, { status: 404 });
}

export async function action(): Promise<Response> {
	const body: ApiError = {
		error: "not_found",
		message: "Unknown API route",
		status: 404,
	};
	return Response.json(body, { status: 404 });
}
