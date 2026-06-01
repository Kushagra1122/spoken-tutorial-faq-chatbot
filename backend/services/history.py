from dataclasses import dataclass


@dataclass(frozen=True)
class HistoryMessage:
    role: str
    content: str

    def __post_init__(self) -> None:
        if self.role not in ("user", "assistant"):
            raise ValueError(f"Invalid role: {self.role}")


def build_search_query(message: str, history: list[HistoryMessage]) -> str:
    """Combine recent turns so follow-up questions retrieve the right FAQs."""
    if not history:
        return message

    recent = history[-6:]
    lines = []
    for item in recent:
        label = "User" if item.role == "user" else "Assistant"
        lines.append(f"{label}: {item.content}")
    lines.append(f"User: {message}")
    return "\n".join(lines)
