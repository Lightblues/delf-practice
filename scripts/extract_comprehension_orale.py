"""Extract listening comprehension exercises from DELF B2 PDF."""

import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter

# Exercise structure with explicit page ranges for each activity
# Format: list of (start_page, end_page) tuples (inclusive, 1-indexed)
EXERCISES = {
    "Exercice_I": [
        (15, 15),
        (16, 16),
        (16, 17),
        (17, 18),
        (18, 19),
        (19, 19),
        (20, 20),
        (20, 21),
        (21, 22),
        (22, 23),
        (23, 23),
        (24, 24),
        (24, 25),
        (25, 26),
        (26, 27),
        (27, 27),
    ],
    "Exercice_II": [
        (28, 28),
        (29, 29),
        (29, 30),
        (30, 31),
        (31, 32),
        (32, 33),
        (33, 33),
        (34, 34),
        (34, 35),
        (35, 36),
        (36, 37),
        (37, 37),
        (38, 38),
        (38, 39),
    ],
    "Exercice_III": [
        (39, 40),
        (40, 41),
        (41, 41),
        (42, 42),
        (42, 43),
        (43, 44),
        (44, 44),
        (45, 45),
        (45, 46),
        (46, 47),
        (47, 47),
        (48, 48),
        (48, 49),
        (49, 50),
        (50, 51),
        (51, 51),
    ],
}

# Audio/Transcript file mapping: track number for each exercise's first activity
# Files 004-019 -> Exercice_I (16), 020-033 -> Exercice_II (14), 034-049 -> Exercice_III (16)
AUDIO_START = {"Exercice_I": 4, "Exercice_II": 20, "Exercice_III": 34}
AUDIO_PREFIX = "039805"
AUDIO_DIR = "Audio"
TRANSCRIPT_DIR = "Transcripts"


def extract_activity(reader: PdfReader, start_page: int, end_page: int) -> PdfWriter:
    """Extract pages for a single activity."""
    writer = PdfWriter()
    for page_num in range(start_page, end_page + 1):
        page_idx = page_num - 1  # Convert to 0-indexed
        writer.add_page(reader.pages[page_idx])
    return writer


def extract_comprehension_orale(input_path: Path, output_dir: Path):
    """Extract all listening comprehension exercises."""
    reader = PdfReader(input_path)
    print(f"Source: {input_path}")
    print(f"Total pages: {len(reader.pages)}")

    index = {"section": "Comprehension_orale", "exercises": {}}

    for ex_name, page_ranges in EXERCISES.items():
        ex_dir = output_dir / ex_name
        ex_dir.mkdir(parents=True, exist_ok=True)

        activities = []
        num_acts = len(page_ranges)

        print(f"\n{ex_name}: {num_acts} activities")

        audio_start = AUDIO_START[ex_name]
        for act_num, (start_page, end_page) in enumerate(page_ranges, 1):
            act_name = f"Activite_{act_num}"
            output_path = ex_dir / f"{act_name}.pdf"

            writer = extract_activity(reader, start_page, end_page)
            with open(output_path, "wb") as f:
                writer.write(f)

            # Calculate audio/transcript track number
            track_num = audio_start + act_num - 1
            audio_file = f"{AUDIO_DIR}/{AUDIO_PREFIX}_{track_num:03d}.mp3"
            transcript_file = f"{TRANSCRIPT_DIR}/Transcript{track_num}.pdf"

            activities.append(
                {
                    "name": act_name,
                    "file": f"{ex_name}/{act_name}.pdf",
                    "pages": list(range(start_page, end_page + 1)),
                    "audio": audio_file,
                    "transcript": transcript_file,
                }
            )
            if start_page == end_page:
                print(f"  {act_name}: page {start_page}, track {track_num}")
            else:
                print(f"  {act_name}: pages {start_page}-{end_page}, track {track_num}")

        index["exercises"][ex_name] = {
            "num_activities": num_acts,
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
    output_dir = project_root / ".ea/delf/data/extracted/part-a"

    extract_comprehension_orale(input_pdf, output_dir)
