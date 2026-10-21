import type { Route } from "./+types/home";
import type { ModelMeta } from "~/types";
import { MODELS } from "~/server/models.server";
import { getProviderAvailability } from "~/server/providers/index.server";
import { SearchDashboard } from "~/components/SearchDashboard";

export function meta(): Route.MetaDescriptors {
	return [
		{ title: "Embedding Evolution Lab" },
		{
			name: "description",
			content:
				"Compare semantic retrieval across three embedding model sizes running on Cloudflare Workers AI.",
		},
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const models: ModelMeta[] = MODELS.map((m) => ({
		...m,
		availability: getProviderAvailability(m.id, env),
	}));
	return { models };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<header className="mb-12 max-w-3xl">
				<p className="mb-3 inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-dark">
					Embedding Evolution Lab
				</p>
				<h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
					Comparing semantic retrieval across embedding model sizes
				</h1>
				<p className="mt-4 text-base leading-relaxed text-neutral-600">
					Query a shared document corpus with three embedding models of
					different sizes running on Cloudflare Workers AI, and inspect how
					citations, similarity scores, and latency scale with model capacity.
				</p>
			</header>

			<SearchDashboard models={loaderData.models} />

			<section className="mt-16 border-t border-neutral-200 pt-10">
				<h2 className="mb-6 text-lg font-semibold text-neutral-900">Methodology</h2>
				<div className="grid gap-6 text-sm leading-relaxed text-neutral-600 md:grid-cols-2">
					<div>
						<h3 className="mb-2 font-semibold text-neutral-800">
							Vector embeddings
						</h3>
						<p>
							An embedding model maps text into a fixed-length vector of numbers.
							Texts with similar meaning land near each other in that vector
							space, so retrieval becomes a nearest-neighbour search rather than a
							keyword match.
						</p>
					</div>
					<div>
						<h3 className="mb-2 font-semibold text-neutral-800">
							Semantic similarity
						</h3>
						<p>
							The query is embedded with each model and compared to document
							chunks using cosine similarity. Scores reflect distance within a
							single model&apos;s space, so they are meaningful only within that
							model — not across different models.
						</p>
					</div>
					<div>
						<h3 className="mb-2 font-semibold text-neutral-800">
							Retrieval evaluation
						</h3>
						<p>
							Quality is measured with Recall@5 and Mean Reciprocal Rank over a
							fixed set of test queries with manually labeled relevant chunks,
							alongside median latency and per-model error rates. Measured
							results are kept distinct from illustrative examples.
						</p>
					</div>
					<div>
						<h3 className="mb-2 font-semibold text-neutral-800">
							Limitations of comparing model sizes
						</h3>
						<p>
							Model size alone does not determine retrieval quality. Training
							data, the inference provider, index configuration, and
							query/document formatting all differ, so a larger model is not
							guaranteed to outperform a smaller one on every corpus.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
