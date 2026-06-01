from openai import OpenAI

from config import settings
from services.history import HistoryMessage, build_search_query
from services.prompts import QUERY_REWRITE_PROMPT


class QueryRewriter:
    def __init__(self) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key)

    def rewrite(self, message: str, history: list[HistoryMessage]) -> str:
        if not history:
            return message

        messages: list[dict[str, str]] = [
            {"role": "system", "content": QUERY_REWRITE_PROMPT},
        ]
        for item in history[-8:]:
            messages.append({"role": item.role, "content": item.content})
        messages.append({"role": "user", "content": message})

        try:
            response = self._client.chat.completions.create(
                model=settings.openai_chat_model,
                messages=messages,
                temperature=0,
                max_tokens=80,
            )
            rewritten = response.choices[0].message.content
            if rewritten and rewritten.strip():
                return rewritten.strip()
        except Exception:
            pass

        return build_search_query(message, history)
