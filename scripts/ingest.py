#!/usr/bin/env python3
"""Drive the Embedding Evolution Lab ingestion endpoint.

Reads data/corpus-manifest.json and the page-attributed text files under
data/text/, and POSTs each document to the Worker's protected ingestion
endpoint (POST /api/ingestion/run), which chunks, embeds with all three models,
upserts to Vectorize, and writes full text to D1.

Usage:
  INGESTION_SECRET=... python3 scripts/ingest.py [--url https://...] [--secret ...]
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "corpus-manifest.json"


def post_json(url: str, payload: dict, secret: str) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "EmbeddingEvolutionLab/0.1 (ingestion driver)",
            "x-ingestion-secret": secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="https://new-embedding.smithar106.workers.dev")
    parser.add_argument("--secret", default=os.environ.get("INGESTION_SECRET"))
    args = parser.parse_args(argv)

    if not args.secret:
        print("Missing INGESTION_SECRET (use --secret or env var)", file=sys.stderr)
        return 2

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    corpus = manifest.get("corpus", [])

    if not corpus:
        print("No corpus documents in manifest.", file=sys.stderr)
        return 1

    endpoint = f"{args.url.rstrip('/')}/api/ingestion/run"
    print(f"Ingesting {len(corpus)} documents into {endpoint}\n", file=sys.stderr)

    ok = 0
    failed = 0
    for doc in corpus:
        text_path = ROOT / doc["text_path"]
        text = text_path.read_text(encoding="utf-8")
        payload = {
            "document": {
                "id": doc["id"],
                "title": doc["title"],
                "sourceUrl": doc["source_url"],
                "pageCount": doc["page_count"],
                "year": doc.get("year"),
                "text": text,
            }
        }

        print(f"* {doc['id']}: {doc['title'][:60]}", file=sys.stderr)
        try:
            result = post_json(endpoint, payload, args.secret)
            r = result.get("result", {})
            print(
                f"    ok: {r.get('chunkCount')} chunks, "
                f"models={[m['modelId'] for m in r.get('perModel', [])]}",
                file=sys.stderr,
            )
            ok += 1
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            print(f"    FAILED ({exc.code}): {body[:200]}", file=sys.stderr)
            failed += 1
        except Exception as exc:  # noqa: BLE001
            print(f"    FAILED: {exc}", file=sys.stderr)
            failed += 1

    print(f"\nIngested {ok} documents, {failed} failed.", file=sys.stderr)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
