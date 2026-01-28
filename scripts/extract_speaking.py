#!/usr/bin/env python3
"""Extract speaking activities from question.md and answer.md to JSON format."""

import json
import re
from pathlib import Path


def extract_activities_from_question_md(content: str) -> list[dict]:
    """Extract activities from question.md content."""
    activities = []

    # Pattern to match activity headers and content
    # ## Activité N or ## Activite N
    activity_pattern = re.compile(
        r"## Activit[ée]\s+(\d+)\s*\n"
        r"\*\*.*?\*\*\s*\n\n"  # instruction line
        r"### ([^\n]+)\n"  # title
        r"(.*?)(?=\n## Activit[ée]|\n---|\Z)",  # content until next activity or section
        re.DOTALL,
    )

    for match in activity_pattern.finditer(content):
        activity_id = int(match.group(1))
        title = match.group(2).strip()
        body = match.group(3).strip()

        # Extract source if present
        source = None
        source_match = re.search(r"D'après\s*:\s*(.+?)$", body, re.MULTILINE)
        if source_match:
            source = source_match.group(0).strip()
            body = body[: source_match.start()].strip()

        activities.append(
            {"id": activity_id, "title": title, "content": body, "source": source, "duration": "5 à 7 minutes"}
        )

    return activities


def build_index(activities: list[dict]) -> dict:
    """Build index.json structure."""
    return {
        "section": "Production_orale",
        "exercises": {
            "monologue_suivi": {
                "title": "Monologue suivi : défense d'un point de vue argumenté",
                "num_activities": len(activities),
                "activities": activities,
            }
        },
    }


def extract_answers_from_answer_md(content: str) -> dict:
    """Extract answers from answer.md content."""
    answers = {}

    # Pattern to match activity answers
    activity_pattern = re.compile(
        r"## Activit[ée]\s+(\d+)\s*\n\n"
        r"(.*?)(?=\n## Activit[ée]|\Z)",
        re.DOTALL,
    )

    for match in activity_pattern.finditer(content):
        activity_id = match.group(1)
        body = match.group(2).strip()

        # Parse the structure: Introduction, Development (numbered sections), Conclusion
        introduction = ""
        development = []
        conclusion = ""

        # Extract introduction
        intro_match = re.search(r"\*\*Introduction\.?\*\*\s*(.*?)(?=\*\*\d+\.|\*\*Conclusion|\Z)", body, re.DOTALL)
        if intro_match:
            introduction = intro_match.group(1).strip()

        # Extract development sections (numbered)
        dev_pattern = re.compile(r"\*\*(\d+)\.\s*([^*]+)\*\*\s*(.*?)(?=\*\*\d+\.|\*\*Conclusion|\Z)", re.DOTALL)
        for dev_match in dev_pattern.finditer(body):
            section_title = dev_match.group(2).strip()
            section_content = dev_match.group(3).strip()
            development.append(f"**{section_title}** {section_content}")

        # Extract conclusion
        concl_match = re.search(r"\*\*Conclusion\.?\*\*\s*(.*?)(?=\n---|\Z)", body, re.DOTALL)
        if concl_match:
            conclusion = concl_match.group(1).strip()

        answers[f"Activite_{activity_id}"] = {
            "introduction": introduction,
            "development": development,
            "conclusion": conclusion,
        }

    return {"Production_orale": {"monologue_suivi": answers}}


def main():
    base_path = Path(__file__).parent.parent.parent.parent / ".ea" / "delf" / "data" / "extracted" / "part-d"

    # Read question.md
    question_path = base_path / "question.md"
    with open(question_path, encoding="utf-8") as f:
        question_content = f.read()

    # Extract activities
    activities = extract_activities_from_question_md(question_content)
    print(f"Extracted {len(activities)} activities from question.md")

    # Build and save index.json
    index_data = build_index(activities)
    index_path = base_path / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    print(f"Saved index.json to {index_path}")

    # Read answer.md
    answer_path = base_path / "answer.md"
    with open(answer_path, encoding="utf-8") as f:
        answer_content = f.read()

    # Extract and save answers
    answers_data = extract_answers_from_answer_md(answer_content)
    answers_path = base_path / "answer.json"
    with open(answers_path, "w", encoding="utf-8") as f:
        json.dump(answers_data, f, ensure_ascii=False, indent=2)
    print(f"Saved answer.json to {answers_path}")


if __name__ == "__main__":
    main()
