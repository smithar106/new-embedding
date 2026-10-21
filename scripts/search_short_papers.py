#!/usr/bin/env python3
"""Search arXiv for short (5-10 page) papers on AI energy/data-center topics.

Queries the arXiv API for a set of topic strings, downloads each candidate PDF,
counts its pages, and prints eligible candidates (5-10 pages inclusive) with
their titles and years so a human can verify topical relevance before they are
added to the corpus.

Usage:
  python3 scripts/search_short_papers.py
"""

import io
import re
import sys
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

USER_AGENT = "EmbeddingEvolutionLab/0.1 (corpus search; research use)"
MIN_PAGES = 5
MAX_PAGES = 10
NS = {"a": "http://www.w3.org/2005/Atom"}

QUERIES = [
    "data center energy consumption",
    "AI electricity demand",
    "data center cooling",
    "AI carbon emissions",
    "machine learning energy grid",
    "data center sustainability",
    "AI power grid reliability",
]


def api_query(search_query: str, max_results: int = 30) -> list[dict]:
    q = urllib.parse.quote(search_query)
    url = f"https://export.arxiv.org/api/query?search_query=all:{q}&start=0&max_results={max_results}&sortBy=relevance"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    out = []
    for entry in root.findall("a:entry", NS):
        eid = entry.findtext("a:id", default="", namespaces=NS)
        m = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})", eid)
        if not m:
            continue
        title = " ".join(entry.findtext("a:title", default="", namespaces=NS).split())
        published = entry.findtext("a:published", default="", namespaces=NS)
        year = int(published[:4]) if published else None
        out.append({"id": m.group(1), "title": title, "year": year})
    return out


def count_pages(pdf_url: str) -> int | None:
    req = urllib.request.Request(pdf_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
    if data[:5] != b"%PDF-":
        return None
    reader = PdfReader(io.BytesIO(data))
    return len(reader.pages)


def main() -> int:
    if PdfReader is None:
        print("pypdf required", file=sys.stderr)
        return 2

    seen: dict[str, dict] = {}
    for query in QUERIES:
        try:
            results = api_query(query)
        except Exception as exc:  # noqa: BLE001
            print(f"! query failed ({query}): {exc}", file=sys.stderr)
            continue
        for r in results:
            seen.setdefault(r["id"], r)
        print(f"* query '{query}': {len(results)} results", file=sys.stderr)
        time.sleep(3)

    print(f"\nTotal unique candidates: {len(seen)}", file=sys.stderr)
    eligible = []
    for i, (arxiv_id, meta) in enumerate(seen.items(), start=1):
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
        try:
            pages = count_pages(pdf_url)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! {arxiv_id}: download failed ({exc})", file=sys.stderr)
            continue
        flag = ""
        if pages is not None and MIN_PAGES <= pages <= MAX_PAGES:
            eligible.append({**meta, "pages": pages, "pdf_url": pdf_url})
            flag = "ELIGIBLE"
        print(f"  {arxiv_id}: {pages} pages {flag} - {meta['title'][:70]}", file=sys.stderr)
        time.sleep(2)

    print("\n===== ELIGIBLE (5-10 pages) =====", file=sys.stderr)
    for e in eligible:
        print(f"{e['id']}  {e['year']}  {e['pages']}p  {e['title']}", file=sys.stderr)
    print(f"\nEligible count: {len(eligible)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
