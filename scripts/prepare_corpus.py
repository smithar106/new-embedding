#!/usr/bin/env python3
"""Reproducible PDF corpus preparation for Embedding Evolution Lab.

Downloads candidate PDFs from arXiv, verifies they open as valid PDFs, counts
their pages, and accepts only documents with 5-10 pages inclusive. Accepted
documents are saved under data/pdfs/, their text is extracted with page-number
attribution under data/text/, and two artifacts are generated:

  data/corpus-manifest.json - machine-readable manifest
  data/corpus-report.md     - human-readable report

No embeddings are generated and no paid inference APIs are called.

Usage:
  python3 scripts/prepare_corpus.py [URL ...]
"""

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None

USER_AGENT = "EmbeddingEvolutionLab/0.1 (corpus preparation; research use)"

MIN_PAGES = 5
MAX_PAGES = 10
TARGET_COUNT = 10

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "data" / "pdfs"
TEXT_DIR = ROOT / "data" / "text"
MANIFEST_PATH = ROOT / "data" / "corpus-manifest.json"
REPORT_PATH = ROOT / "data" / "corpus-report.md"

ARXIV_ID_RE = re.compile(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})")


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def arxiv_id_from_url(url: str) -> str | None:
    m = ARXIV_ID_RE.search(url)
    return m.group(1) if m else None


def fetch_metadata(ids: list[str]) -> dict[str, dict]:
    """Fetch title/authors/year for a batch of arXiv IDs via the arXiv API."""
    out: dict[str, dict] = {}
    if not ids:
        return out
    query = ",".join(ids)
    url = f"https://export.arxiv.org/api/query?id_list={query}&max_results={len(ids)}"
    try:
        data = http_get(url, timeout=60)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! metadata fetch failed: {exc}", file=sys.stderr)
        return out

    ns = {"a": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(data)
    for entry in root.findall("a:entry", ns):
        eid = entry.findtext("a:id", default="", namespaces=ns)
        m = ARXIV_ID_RE.search(eid)
        if not m:
            continue
        arxiv_id = m.group(1)
        title = " ".join(entry.findtext("a:title", default="", namespaces=ns).split())
        authors = [
            " ".join(a.findtext("a:name", default="", namespaces=ns).split())
            for a in entry.findall("a:author", ns)
        ]
        published = entry.findtext("a:published", default="", namespaces=ns)
        year = None
        if published:
            year = int(published[:4])
        out[arxiv_id] = {"title": title, "authors": authors, "year": year}
    return out


def is_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"


def count_pages(data: bytes) -> int | None:
    if PdfReader is None:
        raise RuntimeError("pypdf is required to count pages")
    reader = PdfReader(io_bytes(data))
    return len(reader.pages)


def io_bytes(data: bytes):
    import io

    return io.BytesIO(data)


def extract_text_with_pages(data: bytes) -> tuple[str, int]:
    """Returns (page-attributed text, number of pages with text)."""
    reader = PdfReader(io_bytes(data))
    parts: list[str] = []
    nonempty = 0
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:  # noqa: BLE001
            text = ""
        text = text.strip()
        if text:
            nonempty += 1
        parts.append(f"\n\n--- Page {i} ---\n\n{text}")
    return "".join(parts), nonempty


def slug_id(arxiv_id: str) -> str:
    return arxiv_id.replace("/", "_")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("urls", nargs="*", help="Candidate PDF URLs (arXiv).")
    args = parser.parse_args(argv)

    if not args.urls:
        print("No candidate URLs provided.", file=sys.stderr)
        return 2

    if PdfReader is None:
        print("pypdf is not installed. Run: pip install pypdf", file=sys.stderr)
        return 2

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    TEXT_DIR.mkdir(parents=True, exist_ok=True)

    # De-duplicate while preserving order.
    seen: set[str] = set()
    urls: list[str] = []
    for u in args.urls:
        if u not in seen:
            seen.add(u)
            urls.append(u)

    candidates: list[dict] = []
    ids: list[str] = []
    for url in urls:
        arxiv_id = arxiv_id_from_url(url)
        if arxiv_id:
            ids.append(arxiv_id)
        candidates.append(
            {
                "url": url,
                "arxiv_id": arxiv_id,
                "status": "pending",
                "page_count": None,
                "reason": None,
            }
        )

    metadata = fetch_metadata(ids)

    accepted: list[dict] = []
    rejected: list[dict] = []

    for cand in candidates:
        url = cand["url"]
        arxiv_id = cand["arxiv_id"] or "unknown"
        print(f"* {arxiv_id}: {url}", file=sys.stderr)

        try:
            data = http_get(url)
        except urllib.error.HTTPError as exc:
            cand.update(status="rejected", reason=f"HTTP {exc.code}")
            rejected.append(cand)
            print(f"    rejected: HTTP {exc.code}", file=sys.stderr)
            continue
        except Exception as exc:  # noqa: BLE001
            cand.update(status="rejected", reason=f"download_failed: {exc}")
            rejected.append(cand)
            print(f"    rejected: download failed ({exc})", file=sys.stderr)
            continue

        if not is_pdf(data):
            cand.update(status="rejected", reason="not_a_pdf")
            rejected.append(cand)
            print("    rejected: not a PDF", file=sys.stderr)
            continue

        try:
            pages = count_pages(data)
        except Exception as exc:  # noqa: BLE001
            cand.update(status="rejected", reason=f"unreadable: {exc}")
            rejected.append(cand)
            print(f"    rejected: unreadable ({exc})", file=sys.stderr)
            continue

        cand["page_count"] = pages
        if pages < MIN_PAGES or pages > MAX_PAGES:
            cand.update(
                status="rejected",
                reason=f"page_count_out_of_range ({pages} pages)",
            )
            rejected.append(cand)
            print(f"    rejected: {pages} pages (outside {MIN_PAGES}-{MAX_PAGES})", file=sys.stderr)
            continue

        cand["status"] = "accepted"
        accepted.append(cand)
        print(f"    accepted: {pages} pages", file=sys.stderr)

    # Select exactly TARGET_COUNT eligible documents.
    selected = accepted[:TARGET_COUNT]
    for cand in accepted[TARGET_COUNT:]:
        cand.update(status="rejected", reason="overflow (more than 10 eligible)")
        rejected.append(cand)

    # Save selected PDFs + text, and build manifest entries.
    corpus: list[dict] = []
    for cand in selected:
        arxiv_id = cand["arxiv_id"] or "unknown"
        meta = metadata.get(arxiv_id, {})
        pdf_path = PDF_DIR / f"{slug_id(arxiv_id)}.pdf"
        text_path = TEXT_DIR / f"{slug_id(arxiv_id)}.txt"

        # Re-download once more for saving (cached from memory).
        data = http_get(cand["url"])
        pdf_path.write_bytes(data)

        text, nonempty = extract_text_with_pages(data)
        text_path.write_text(text, encoding="utf-8")
        extraction_status = "ok" if nonempty else "no_text"

        corpus.append(
            {
                "id": arxiv_id,
                "title": meta.get("title", ""),
                "authors": meta.get("authors", []),
                "year": meta.get("year"),
                "source_url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id != "unknown" else cand["url"],
                "pdf_url": cand["url"],
                "local_path": str(pdf_path.relative_to(ROOT)),
                "text_path": str(text_path.relative_to(ROOT)),
                "page_count": cand["page_count"],
                "extraction_status": extraction_status,
            }
        )

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target_count": TARGET_COUNT,
        "page_range": [MIN_PAGES, MAX_PAGES],
        "accepted_count": len(corpus),
        "corpus": corpus,
        "rejected": [
            {
                "id": c.get("arxiv_id"),
                "url": c["url"],
                "page_count": c.get("page_count"),
                "reason": c.get("reason"),
            }
            for c in rejected
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    report = build_report(manifest)
    REPORT_PATH.write_text(report, encoding="utf-8")

    print(f"\nAccepted {len(corpus)} / {TARGET_COUNT} eligible documents.")
    print(f"Manifest: {MANIFEST_PATH}")
    print(f"Report:   {REPORT_PATH}")
    if len(corpus) < TARGET_COUNT:
        print(
            f"WARNING: short by {TARGET_COUNT - len(corpus)} document(s). "
            "Add more candidates and re-run.",
            file=sys.stderr,
        )
        return 1
    return 0


def build_report(manifest: dict) -> str:
    lines: list[str] = []
    lines.append("# Embedding Evolution Lab — Corpus Report\n")
    lines.append(f"Generated: `{manifest['generated_at']}`\n")
    lines.append(
        f"Accepted **{manifest['accepted_count']}** of "
        f"**{manifest['target_count']}** target documents "
        f"(page range {manifest['page_range'][0]}–{manifest['page_range'][1]}).\n"
    )
    lines.append("\n## Accepted documents\n")
    if not manifest["corpus"]:
        lines.append("_None_\n")
    else:
        lines.append(
            "| # | arXiv ID | Title | Year | Pages | Extraction |\n"
            "|---|----------|-------|------|-------|------------|"
        )
        for i, doc in enumerate(manifest["corpus"], start=1):
            title = doc["title"].replace("|", "\\|")
            lines.append(
                f"| {i} | {doc['id']} | {title} | {doc['year'] or '?'} "
                f"| {doc['page_count']} | {doc['extraction_status']} |"
            )
    lines.append("\n## Rejected candidates\n")
    if not manifest["rejected"]:
        lines.append("_None_\n")
    else:
        lines.append("| arXiv ID | URL | Pages | Reason |\n|---|---|---|---|")
        for r in manifest["rejected"]:
            rid = r["id"] or "unknown"
            pages = str(r["page_count"]) if r["page_count"] is not None else "?"
            reason = (r["reason"] or "").replace("|", "\\|")
            lines.append(f"| {rid} | {r['url']} | {pages} | {reason} |")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
