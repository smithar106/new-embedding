import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/health", "routes/api.health.ts"),
	route("api/models", "routes/api.models.ts"),
	route("api/documents", "routes/api.documents.ts"),
	route("api/search", "routes/api.search.ts"),
	route("api/ingestion/status", "routes/api.ingestion.status.ts"),
	route("api/ingestion/run", "routes/api.ingestion.run.ts"),
	route("api/*", "routes/api.$.ts"),
] satisfies RouteConfig;
