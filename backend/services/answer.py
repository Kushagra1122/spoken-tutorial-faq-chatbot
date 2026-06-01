from dataclasses import dataclass

from openai import OpenAI

from config import settings
from services.faq_store import FaqEntry
from services.retriever import FaqRetriever, SearchResult

SYSTEM_PROMPT = """You are the official Spoken Tutorial FAQ assistant for organisers and students.
Answer ONLY using the FAQ context provided below.
Preserve all numbers, percentages, time limits, steps, and bullet lists exactly.
Use clear, professional language suitable for an educational training portal.
If the context does not contain enough information, politely state that the FAQ does not cover that topic.
Do not invent policies, steps, or contact details.
Keep answers concise and well-structured."""


REFUSAL_MESSAGE = (
    "I could not find a matching answer in the official Spoken Tutorial FAQ. "
    "Please try rephrasing your question. "
    "For account-specific help, contact your training coordinator or Spoken Tutorial support."
)


@dataclass
class ChatResponse:
    answer: str
    confidence: str
    category: str | None
    sources: list[dict[str, str]]


class AnswerService:
    def __init__(self, retriever: FaqRetriever) -> None:
        self.retriever = retriever
        self._client = OpenAI(api_key=settings.openai_api_key)

    def _format_context(self, results: list[SearchResult]) -> str:
        blocks = []
        for i, result in enumerate(results, start=1):
            entry = result.entry
            blocks.append(
                f"FAQ {i} (score={result.score:.2f}):\n"
                f"Category: {entry.category}\n"
                f"Question: {entry.question}\n"
                f"Answer: {entry.answer}"
            )
        return "\n\n".join(blocks)

    @staticmethod
    def _sources_from_results(results: list[SearchResult]) -> list[dict[str, str]]:
        seen: set[str] = set()
        sources: list[dict[str, str]] = []
        for result in results:
            entry = result.entry
            if entry.id in seen:
                continue
            seen.add(entry.id)
            sources.append({"id": entry.id, "question": entry.question})
        return sources

    def _generate_with_llm(self, message: str, results: list[SearchResult]) -> str:
        context = self._format_context(results)
        response = self._client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"User question: {message}\n\n"
                        f"FAQ context:\n{context}\n\n"
                        "Answer the user question using only the FAQ context."
                    ),
                },
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content
        return content.strip() if content else REFUSAL_MESSAGE

    @staticmethod
    def _is_clear_match(results: list[SearchResult]) -> bool:
        top = results[0]
        if top.score >= settings.similarity_low:
            return True
        if top.score < settings.similarity_min_absolute:
            return False
        if len(results) < 2:
            return True
        margin = top.score - results[1].score
        return margin >= settings.similarity_margin

    def answer(self, message: str) -> ChatResponse:
        results = self.retriever.search(message, top_k=3)
        if not results:
            return ChatResponse(
                answer=REFUSAL_MESSAGE,
                confidence="low",
                category=None,
                sources=[],
            )

        top = results[0]
        sources = self._sources_from_results(results)
        category = top.entry.category

        if not self._is_clear_match(results):
            return ChatResponse(
                answer=REFUSAL_MESSAGE,
                confidence="low",
                category=None,
                sources=sources,
            )

        if top.score >= settings.similarity_high:
            return ChatResponse(
                answer=top.entry.answer,
                confidence="high",
                category=category,
                sources=sources,
            )

        llm_answer = self._generate_with_llm(message, results)
        return ChatResponse(
            answer=llm_answer,
            confidence="medium",
            category=category,
            sources=sources,
        )
