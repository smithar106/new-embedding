#!/usr/bin/env bash
set -euo pipefail

# Creates the three Cloudflare Vectorize indexes used by Embedding Evolution Lab.
# Each index uses cosine similarity (the default for semantic search).

npx wrangler vectorize create embedding-bge-small --dimensions=384 --metric=cosine
npx wrangler vectorize create embedding-bge-base --dimensions=768 --metric=cosine
npx wrangler vectorize create embedding-bge-large --dimensions=1024 --metric=cosine
