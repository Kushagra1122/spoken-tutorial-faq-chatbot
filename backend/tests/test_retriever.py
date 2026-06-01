import os
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from services.faq_store import load_faqs
from services.retriever import FaqRetriever

PARAPHRASE_CASES = [
    ("max students in one upload", "master_batch_limit_500"),
    ("same person invigilate and organise", "organiser_invigilator_different"),
    ("minimum marks for certificate", "certificate_minimum_40"),
    ("which browser", "recommended_browser"),
]


def _has_real_openai_key() -> bool:
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key) and not key.startswith("test-key")


@pytest.mark.skipif(
    not _has_real_openai_key(),
    reason="Set a valid OPENAI_API_KEY for embedding integration tests",
)
def test_retriever_paraphrase_matches():
    retriever = FaqRetriever()
    retriever.initialize()

    for query, expected_id in PARAPHRASE_CASES:
        results = retriever.search(query, top_k=1)
        assert results, f"No results for: {query}"
        assert results[0].entry.id == expected_id, (
            f"Query '{query}' matched '{results[0].entry.id}', expected '{expected_id}'"
        )


def test_retriever_search_returns_top_k():
    faqs = load_faqs()
    retriever = FaqRetriever()
    retriever._entries = faqs

    def fake_embed(texts: list[str]) -> np.ndarray:
        vectors = []
        for text in texts:
            vec = np.zeros(len(faqs), dtype=np.float32)
            lower = text.lower()
            for i, entry in enumerate(faqs):
                if entry.id in lower or entry.question.lower() in lower:
                    vec[i] = 1.0
            if vec.sum() == 0:
                vec[0] = 0.1
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)

    with patch.object(retriever, "_embed", side_effect=fake_embed):
        retriever._vectors = retriever._normalize(
            fake_embed([e.searchable_text() for e in faqs])
        )
        results = retriever.search("master_batch_limit_500", top_k=3)
        assert len(results) == 3
        assert results[0].entry.id == "master_batch_limit_500"
