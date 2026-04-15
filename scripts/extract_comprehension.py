"""Extract reading comprehension exercises from DELF B2 PDF."""

import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter

# Exercise structure: (start_page, pages_per_activity, num_activities)
EXERCISES = {
    "Exercice_I": (62, 2, 16),  # pages 62-93, 2 pages each, 16 activities
    "Exercice_II": (94, 2, 14),  # pages 94-121, 2 pages each, 14 activities
    "Exercice_III": (122, 1, 16),  # pages 122-138, 1 page each (simplified)
}


def extract_activity(reader: PdfReader, start_page: int, num_pages: int) -> PdfWriter:
    """Extract pages for a single activity."""
    writer = PdfWriter()
    for i in range(num_pages):
        page_idx = start_page - 1 + i  # Convert to 0-indexed
        writer.add_page(reader.pages[page_idx])
    return writer


def extract_comprehension(input_path: Path, output_dir: Path):
    """Extract all reading comprehension exercises."""
    reader = PdfReader(input_path)
    print(f"Source: {input_path}")
    print(f"Total pages: {len(reader.pages)}")

    index = {"section": "Comprehension_des_ecrits", "exercises": {}}

    for ex_name, (start_page, pages_per_act, num_acts) in EXERCISES.items():
        ex_dir = output_dir / ex_name
        ex_dir.mkdir(parents=True, exist_ok=True)

        activities = []
        current_page = start_page

        print(f"\n{ex_name}: {num_acts} activities starting at page {start_page}")

        for act_num in range(1, num_acts + 1):
            act_name = f"Activite_{act_num}"
            output_path = ex_dir / f"{act_name}.pdf"

            writer = extract_activity(reader, current_page, pages_per_act)
            with open(output_path, "wb") as f:
                writer.write(f)

            activities.append(
                {
                    "name": act_name,
                    "file": f"{ex_name}/{act_name}.pdf",
                    "pages": list(range(current_page, current_page + pages_per_act)),
                }
            )
            print(f"  {act_name}: pages {current_page}-{current_page + pages_per_act - 1}")
            current_page += pages_per_act

        index["exercises"][ex_name] = {
            "num_activities": num_acts,
            "pages_per_activity": pages_per_act,
            "activities": activities,
        }

    # Write index file
    index_path = output_dir / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    print(f"\nIndex written to: {index_path}")


if __name__ == "__main__":
    project_root = Path(__file__).parent.parent.parent.parent
    input_pdf = project_root / ".ea/delf/ABC DELF B2/ABC DELF B2 - 2025.pdf"
    output_dir = project_root / ".ea/delf/data/extracted/part-b"

    extract_comprehension(input_pdf, output_dir)
