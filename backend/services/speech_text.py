import re


def prepare_text_for_speech(text: str, max_length: int = 2400) -> str:
    """Strip markdown and section labels for natural TTS."""
    cleaned = text
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"^[•\-*]\s+", "- ", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\d+[.)]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = cleaned.strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[: max_length - 3].rsplit(" ", 1)[0] + "..."
    return cleaned
