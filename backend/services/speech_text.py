import re

_SKIP_LINE = re.compile(
    r"(account-specific|training coordinator|spoken tutorial support|"
    r"try rephrasing|official faq does not|could not find a matching answer)",
    re.I,
)
_BULLET = re.compile(r"^[•\-*]\s+")
_NUMBERED = re.compile(r"^\d+[.)]\s+")
_MAX_LIST_ITEMS = 5
_DEFAULT_MAX_LENGTH = 1100


def prepare_text_for_speech(text: str, max_length: int = _DEFAULT_MAX_LENGTH) -> str:
    """Build concise, natural text for TTS — direct answer only, slower-friendly."""
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", text.strip())
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    prose: list[str] = []
    list_items: list[str] = []

    for raw_line in cleaned.splitlines():
        line = raw_line.strip()
        if not line or _SKIP_LINE.search(line):
            continue

        if _BULLET.match(line) or _NUMBERED.match(line):
            item = _BULLET.sub("", line)
            item = _NUMBERED.sub("", item).strip()
            if item and len(list_items) < _MAX_LIST_ITEMS:
                list_items.append(item)
            continue

        if list_items:
            prose.append(_format_list_for_speech(list_items))
            list_items = []

        if len(prose) < 2:
            prose.append(line)

    if list_items:
        prose.append(_format_list_for_speech(list_items))

    spoken = " ".join(prose)
    spoken = re.sub(r"\s+", " ", spoken).strip()
    spoken = _normalize_for_speech(spoken)

    if len(spoken) > max_length:
        spoken = spoken[: max_length - 3].rsplit(" ", 1)[0] + "..."
    return spoken


def _format_list_for_speech(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) <= 4:
        return ", ".join(items[:-1]) + ", and " + items[-1] + "."
    head = ", ".join(items[:4]) + ", and more."
    return head


def _normalize_for_speech(text: str) -> str:
    text = text.replace(" & ", " and ")
    text = re.sub(r"\s+([,.])", r"\1", text)
    text = re.sub(r"\.{2,}", ".", text)
    if text and text[-1] not in ".!?":
        text += "."
    return text
