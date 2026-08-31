from dataclasses import dataclass

import numpy as np
from openai import OpenAI

from config import settings
from services.faq_store import FaqEntry, load_faqs

_STOP_WORDS = frozenset(
    {
        "a", "an", "the", "is", "are", "was", "were", "what", "how", "can", "do",
        "i", "my", "for", "to", "in", "of", "and", "or", "be", "it", "if", "when",
        "who", "should", "why", "does", "did", "will", "would", "could", "about",
    }
)


@dataclass
class SearchResult:
    entry: FaqEntry
    score: float


class FaqRetriever:
    def __init__(self) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key)
        self._entries = load_faqs()
        self._vectors: np.ndarray | None = None

    @property
    def entries(self) -> list[FaqEntry]:
        return self._entries

    def _embed(self, texts: list[str]) -> np.ndarray:
        response = self._client.embeddings.create(
            model=settings.openai_embedding_model,
            input=texts,
        )
        vectors = [item.embedding for item in response.data]
        return np.array(vectors, dtype=np.float32)

    @staticmethod
    def _normalize(vectors: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        return vectors / norms

    def initialize(self) -> None:
        texts = [entry.searchable_text() for entry in self._entries]
        self._vectors = self._normalize(self._embed(texts))

    def reload(self) -> None:
        self._entries = load_faqs()
        self.initialize()

    @staticmethod
    def _keyword_score(query: str, entry: FaqEntry) -> float:
        q = query.lower().strip()
        if not q:
            return 0.0

        phrases = [entry.question.lower(), * [a.lower() for a in entry.aliases]]
        for phrase in phrases:
            if phrase in q or q in phrase:
                return 1.0

        query_tokens = [
            t for t in q.split() if t not in _STOP_WORDS and len(t) > 1
        ]
        if not query_tokens:
            return 0.0

        corpus = entry.searchable_text().lower()
        matches = sum(1 for token in query_tokens if token in corpus)
        return matches / len(query_tokens)

    def search(self, query: str, top_k: int = 3) -> list[SearchResult]:
        if self._vectors is None:
            self.initialize()

        query_vec = self._normalize(self._embed([query]))[0]
        embed_scores = self._vectors @ query_vec  # type: ignore[operator]

        keyword_scores = np.array(
            [self._keyword_score(query, entry) for entry in self._entries],
            dtype=np.float32,
        )
        kw_weight = settings.keyword_weight
        combined = (1.0 - kw_weight) * embed_scores + kw_weight * keyword_scores

        top_indices = np.argsort(combined)[::-1][:top_k]
        return [
            SearchResult(entry=self._entries[i], score=float(combined[i]))
            for i in top_indices
        ]
