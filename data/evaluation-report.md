# Embedding Evolution Lab — Retrieval Evaluation Report

Generated: `2026-10-21T23:38:42.482516+00:00`

**Important:** the relevance labels used here are *manual* (hand-authored against the corpus), while the Recall@5, MRR, latency, and error-rate numbers below are *measured* from live retrieval. Labels and measurements are kept distinct.

- Endpoint: `https://new-embedding.smithar106.workers.dev`
- Queries: 10
- Runs per query: 3

## Summary

| Model | Recall@5 | MRR | Median total latency | Error rate |
| --- | --- | --- | --- | --- |
| bge-small-en-v1.5 | 0.7333 | 1.0 | 231.0 ms | 0.0 |
| bge-base-en-v1.5 | 0.8333 | 0.95 | 191.5 ms | 0.0 |
| bge-large-en-v1.5 | 0.8 | 0.95 | 234.0 ms | 0.0 |

## Labeled queries

- **eval-carbon-reduction** — “How can data centers reduce their carbon emissions?” → relevant: 2403.12698, 1910.09700, 2602.16042
- **eval-ai-electricity-demand** — “What is the relationship between AI and electricity demand?” → relevant: 2603.10498, 2507.08011
- **eval-data-center-cooling** — “How do data centers manage cooling efficiently?” → relevant: 2508.03160, 1911.03730, 1509.05875
- **eval-ml-carbon-footprint** — “What is the carbon footprint of training machine learning models?” → relevant: 1910.09700, 2602.16042
- **eval-renewable-data-centers** — “How can renewable energy power data centers?” → relevant: 2507.08011, 2403.12698
- **eval-weather-climate-energy** — “How do weather and climate affect data center energy use?” → relevant: 1804.01754, 1911.03730
- **eval-sustainable-computing** — “How can we make computing infrastructure more sustainable?” → relevant: 2403.12698, 1509.05875
- **eval-grid-reliability** — “What threatens the reliability of the power grid?” → relevant: 2207.08146
- **eval-electricity-pricing** — “How does electricity pricing affect data center operations?” → relevant: 2508.03160
- **eval-future-ai-energy** — “How much energy will future AI systems consume?” → relevant: 2603.10498, 1910.09700

## Method notes

Recall@5 and MRR are computed at the *document* level (deduplicated by `documentId` across the top-5 returned chunks). Similarity scores are comparable within a model, not across models. Model size alone does not determine retrieval quality; training data, the inference provider, and index configuration also differ.
