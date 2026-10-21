#!/usr/bin/env python3
"""Run the retrieval evaluation for Embedding Evolution Lab.

Sends a fixed set of manually labeled queries to the deployed /api/search
endpoint, repeated several times per query, and computes per-model Recall@5,
Mean Reciprocal Rank (MRR), median latency, and error rate. Results are written
to data/evaluation-results.json and data/evaluation-report.md.

Usage:
  python3 scripts/evaluate.py [--url https://...] [--runs 5]
"""

import argparse
import json
import statistics
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUERIES_PATH = ROOT / "data" / "evaluation-queries.json"
RESULTS_PATH = ROOT / "data" / "evaluation-results.json"
REPORT_PATH = ROOT / "data" / "evaluation-report.md"

UA = "EmbeddingEvolutionLab/0.1 (evaluation driver)"


def search(url: str, query: str, top_k: int = 5) -> dict:
    req = urllib.request.Request(
        f"{url.rstrip('/')}/api/search",
        data=json.dumps({"query": query, "topK": top_k}).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def unique_ids(results: list[dict]) -> list[str]:
    seen = set()
    out = []
    for r in results:
        doc_id = r.get("documentId")
        if doc_id and doc_id not in seen:
            seen.add(doc_id)
            out.append(doc_id)
    return out


def recall_at_k(results: list[dict], relevant: list[str], k: int = 5) -> float:
    if not relevant:
        return 0.0
    top = unique_ids(results)[:k]
    hits = sum(1 for d in top if d in set(relevant))
    return hits / len(relevant)


def mrr(results: list[dict], relevant: list[str]) -> float:
    rel = set(relevant)
    for i, doc_id in enumerate(unique_ids(results), start=1):
        if doc_id in rel:
            return 1.0 / i
    return 0.0


def median(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="https://new-embedding.smithar106.workers.dev")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args(argv)

    queries = json.loads(QUERIES_PATH.read_text(encoding="utf-8"))["queries"]
    print(f"Evaluating {len(queries)} queries x {args.runs} runs against {args.url}\n", file=sys.stderr)

    model_ids: list[str] | None = None
    # per-model accumulators
    per_model: dict[str, dict] = {}

    for q in queries:
        print(f"* {q['id']}", file=sys.stderr)
        runs: list[dict] = []
        for _ in range(args.runs):
            runs.append(search(args.url, q["query"]))

        if model_ids is None:
            model_ids = [m["modelId"] for m in runs[0]["models"]]
            for mid in model_ids:
                per_model[mid] = {
                    "recalls": [],
                    "mrrs": [],
                    "latencies": [],
                    "ok_runs": 0,
                    "total_runs": 0,
                    "errors": [],
                }

        for model in runs[0]["models"]:
            mid = model["modelId"]
            acc = per_model[mid]
            acc["total_runs"] += args.runs

            for run in runs:
                m = next((x for x in run["models"] if x["modelId"] == mid), None)
                if not m:
                    continue
                if m["status"] == "ok":
                    acc["ok_runs"] += 1
                    acc["latencies"].append(m["timings"]["totalMs"])
                else:
                    acc["errors"].append(m.get("error") or m["status"])

            first_ok = next(
                (
                    m
                    for run in runs
                    for m in run["models"]
                    if m["modelId"] == mid and m["status"] == "ok"
                ),
                None,
            )
            if first_ok:
                acc["recalls"].append(
                    recall_at_k(first_ok["results"], q["relevantDocumentIds"])
                )
                acc["mrrs"].append(mrr(first_ok["results"], q["relevantDocumentIds"]))
            else:
                acc["recalls"].append(0.0)
                acc["mrrs"].append(0.0)

    summary = {}
    for mid, acc in per_model.items():
        summary[mid] = {
            "mean_recall_at_5": round(sum(acc["recalls"]) / len(acc["recalls"]), 4) if acc["recalls"] else 0.0,
            "mean_mrr": round(sum(acc["mrrs"]) / len(acc["mrrs"]), 4) if acc["mrrs"] else 0.0,
            "median_total_latency_ms": round(median(acc["latencies"]), 2),
            "error_rate": round(len(acc["errors"]) / acc["total_runs"], 4) if acc["total_runs"] else 0.0,
            "runs": acc["total_runs"],
            "ok_runs": acc["ok_runs"],
        }

    results = {
        "generated_at": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(),
        "url": args.url,
        "runs_per_query": args.runs,
        "query_count": len(queries),
        "labeling": "document-level, manually authored",
        "models": summary,
    }

    RESULTS_PATH.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    REPORT_PATH.write_text(build_report(results, queries), encoding="utf-8")

    print(f"\nWrote {RESULTS_PATH}", file=sys.stderr)
    print(f"Wrote {REPORT_PATH}", file=sys.stderr)
    for mid, s in summary.items():
        print(
            f"  {mid}: recall@5={s['mean_recall_at_5']} mrr={s['mean_mrr']} "
            f"median_lat={s['median_total_latency_ms']}ms err={s['error_rate']}",
            file=sys.stderr,
        )
    return 0


def build_report(results: dict, queries: list[dict]) -> str:
    lines = [
        "# Embedding Evolution Lab — Retrieval Evaluation Report",
        "",
        f"Generated: `{results['generated_at']}`",
        "",
        "**Important:** the relevance labels used here are *manual* (hand-authored "
        "against the corpus), while the Recall@5, MRR, latency, and error-rate numbers "
        "below are *measured* from live retrieval. Labels and measurements are kept "
        "distinct.",
        "",
        f"- Endpoint: `{results['url']}`",
        f"- Queries: {results['query_count']}",
        f"- Runs per query: {results['runs_per_query']}",
        "",
        "## Summary",
        "",
        "| Model | Recall@5 | MRR | Median total latency | Error rate |",
        "| --- | --- | --- | --- | --- |",
    ]
    for mid, s in results["models"].items():
        lines.append(
            f"| {mid} | {s['mean_recall_at_5']} | {s['mean_mrr']} "
            f"| {s['median_total_latency_ms']} ms | {s['error_rate']} |"
        )
    lines.append("")
    lines.append("## Labeled queries")
    lines.append("")
    for q in queries:
        lines.append(
            f"- **{q['id']}** — “{q['query']}” → relevant: {', '.join(q['relevantDocumentIds'])}"
        )
    lines.append("")
    lines.append(
        "## Method notes\n\n"
        "Recall@5 and MRR are computed at the *document* level (deduplicated by "
        "`documentId` across the top-5 returned chunks). Similarity scores are "
        "comparable within a model, not across models. Model size alone does not "
        "determine retrieval quality; training data, the inference provider, and "
        "index configuration also differ."
    )
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
