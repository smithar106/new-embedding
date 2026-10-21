# Embedding Evolution Lab

An interactive semantic-search laboratory that compares three free embedding models
of different sizes, running as a full-stack Cloudflare application
(React Router 7 + Cloudflare Workers + Workers AI + Vectorize).

| Model | Size | Dimensions |
| --- | --- | --- |
| [BGE Small v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) | small | 384 |
| [BGE Base v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) | base | 768 |
| [BGE Large v1.5](https://huggingface.co/BAAI/bge-large-en-v1.5) | large | 1024 |

All three are served by **Cloudflare Workers AI** (keyless, free tier), so no
inference API token is required.

## Status

- **Stage 1 (foundation) — complete.** Frontend dashboard, JSON API routes,
  TypeScript interfaces, and the provider-adapter architecture.
- **Stage 2 (embedding inference) — complete.** Workers AI embedding verified for
  all three models (dimensions 384/768/1024 confirmed against live responses).
- **Stage 3 (vector retrieval) — complete.** Three Vectorize indexes
  (`embedding-bge-small`, `embedding-bge-base`, `embedding-bge-large`) are bound in
  `wrangler.json` and queried per model with source metadata.
- **Stage 4 (PDF ingestion) — complete.** Ten verified 5–10 page arXiv PDFs are
  ingested (700 chunks) through a protected `POST /api/ingestion/run` endpoint that
  chunks reproducibly, embeds with all three models, upserts to Vectorize, and stores
  full text + metadata in D1.
- **Stage 5 (evaluation) — pending.**

## Architecture

- **Frontend:** React Router 7 (SSR + client hydration), React 19, Tailwind CSS.
- **Backend:** Cloudflare Workers, with the React Router request handler at
  `workers/app.ts` dispatching both pages and JSON resource routes.
- **Inference:** Cloudflare Workers AI via the `AI` binding, behind a
  provider-adapter interface under `app/server/providers/`.
- **Vectors:** three independent Cloudflare Vectorize indexes, one per model.
- **Storage:** Vectorize metadata stores per-chunk provenance (`chunkId`,
  `documentId`, `documentTitle`, `sourceUrl`, `pageNumber`). Full chunk text is kept
  in a separate store (D1) rather than Vectorize metadata, because Vectorize metadata
  is size-limited and unsuitable for full passage text; this is wired up in Stage 4.

```
app/
  routes.ts                 route table (page + API resource routes)
  routes/home.tsx           dashboard page (SSR)
  routes/api.*.ts           JSON API endpoints
  components/               client dashboard components
  server/                   server-only modules
    models.server.ts        model registry
    providers/              embedding provider adapters (Workers AI)
    search.server.ts        per-model search orchestration
  types.ts                  shared types
workers/app.ts              Worker entry point
scripts/                    corpus + index setup scripts
data/                       corpus PDFs, text, manifest, report
```

## API endpoints

All endpoints return JSON, including errors. Unknown API routes return a JSON 404.

- `GET  /api/health` — application status and non-sensitive configuration diagnostics.
- `GET  /api/models` — model metadata, availability, dimensions, size.
- `GET  /api/documents` — ingested document metadata.
- `POST /api/search` — `{ "query": "...", "topK": 5 }`; per-model results, timings, and errors.
- `GET  /api/ingestion/status` — corpus and indexing status (no credentials).

## Local development

Workers AI is keyless, but Vectorize and D1 require the resources to exist and a
Cloudflare login.

```bash
npm install
npx wrangler login
./scripts/create-vectorize-indexes.sh
npm run dev                      # http://localhost:5173
```

Note: Vectorize bindings only work against Cloudflare's edge, so full retrieval is
tested against a deployed Worker (`npm run deploy`) rather than the local dev server.

## Type generation, checks, and build

```bash
npm run typegen     # regenerate worker-configuration.d.ts + route types
npm run typecheck   # typegen + tsc -b
npm run build       # production build
npm run check       # full check incl. `wrangler deploy --dry-run` (requires login)
```

## Required configuration

### 1. Vectorize indexes

Create the three indexes (matches the bindings in `wrangler.json`):

```bash
./scripts/create-vectorize-indexes.sh
```

### 2. Deploy

```bash
npx wrangler login
npm run deploy
```

## Notes on the comparison

Similarity scores are comparable within a single model's vector space, not directly
across models. Model size alone does not determine retrieval quality: training data,
the inference provider, index configuration, and query/document formatting all
differ, so a larger model is not guaranteed to outperform a smaller one on every
corpus. Measured results are kept distinct from illustrative examples; no mock data
is presented as real retrieval output.
