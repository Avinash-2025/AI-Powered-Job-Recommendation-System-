"""Prepare the downloaded real jobs CSV into the app's compact schema."""

from __future__ import annotations

import csv
from pathlib import Path

from recommender import NORMALIZED_DATASET_PATH, REAL_DATASET_PATH, clean_text, parse_salary_floor, _normalize_real_jobs


def main() -> None:
    if NORMALIZED_DATASET_PATH.exists():
        with NORMALIZED_DATASET_PATH.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames and "search_text" not in reader.fieldnames:
                rows = list(reader)
                _write_normalized(rows)
                print(f"Enriched {len(rows)} normalized jobs at {NORMALIZED_DATASET_PATH}")
                return

    if not REAL_DATASET_PATH.exists():
        raise FileNotFoundError(f"Missing real dataset: {REAL_DATASET_PATH}")

    try:
        import pandas as pd

        rows = _normalize_real_jobs(pd.read_csv(REAL_DATASET_PATH))
    except Exception:
        with REAL_DATASET_PATH.open(newline="", encoding="utf-8") as handle:
            rows = _normalize_real_jobs(list(csv.DictReader(handle)))

    _write_normalized(rows)
    print(f"Wrote {len(rows)} real jobs to {NORMALIZED_DATASET_PATH}")


def _write_normalized(rows: list[dict]) -> None:
    fields = [
        "id",
        "title",
        "company",
        "location",
        "salary",
        "type",
        "experience",
        "education",
        "skills",
        "description",
        "source",
        "skill_list",
        "search_text",
        "role_text",
        "location_text",
        "salary_floor",
    ]
    temp_path = Path(str(NORMALIZED_DATASET_PATH) + ".tmp")
    with temp_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            text = row.get("_text") or " ".join([
                row.get("title", ""),
                row.get("company", ""),
                row.get("skills", ""),
                row.get("description", ""),
                row.get("type", ""),
            ])
            writer.writerow({
                "id": row["id"],
                "title": row["title"],
                "company": row["company"],
                "location": row["location"],
                "salary": row["salary"],
                "type": row["type"],
                "experience": row["experience"],
                "education": row["education"],
                "skills": row["skills"],
                "description": row["description"],
                "source": row["source"],
                "skill_list": row.get("skill_list") or "||".join(row.get("_skill_list", [])),
                "search_text": row.get("search_text") or row.get("_search") or clean_text(text),
                "role_text": row.get("_role") or clean_text(row["title"]),
                "location_text": row.get("_location") or clean_text(row["location"]),
                "salary_floor": row.get("_salary_floor") or parse_salary_floor(row["salary"]),
            })
    temp_path.replace(NORMALIZED_DATASET_PATH)


if __name__ == "__main__":
    main()
