import json
from dataclasses import dataclass
from pathlib import Path

from config import settings


@dataclass(frozen=True)
class FaqEntry:
    id: str
    category: str
    question: str
    answer: str
    aliases: list[str]

    def searchable_text(self) -> str:
        alias_text = " ".join(self.aliases)
        return f"{self.category}. {self.question} {alias_text}"


def load_faqs(path: Path | None = None) -> list[FaqEntry]:
    faq_path = path or settings.faqs_path
    with open(faq_path, encoding="utf-8") as f:
        raw = json.load(f)

    return [
        FaqEntry(
            id=item["id"],
            category=item["category"],
            question=item["question"],
            answer=item["answer"],
            aliases=item.get("aliases", []),
        )
        for item in raw
    ]


def save_faqs(entries: list[FaqEntry], path: Path | None = None) -> None:
    faq_path = path or settings.faqs_path
    payload = [
        {
            "id": entry.id,
            "category": entry.category,
            "question": entry.question,
            "answer": entry.answer,
            "aliases": entry.aliases,
        }
        for entry in entries
    ]
    with open(faq_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
