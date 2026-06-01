from unittest.mock import MagicMock

from services.answer import AnswerService, REFUSAL_MESSAGE
from services.faq_store import FaqEntry
from services.retriever import SearchResult


def _entry(faq_id: str) -> FaqEntry:
    return FaqEntry(
        id=faq_id,
        category="Test",
        question=f"Question for {faq_id}?",
        answer=f"Answer for {faq_id}.",
        aliases=[],
    )


def _make_service(top_score: float) -> AnswerService:
    retriever = MagicMock()
    retriever.search.return_value = [
        SearchResult(entry=_entry("test_faq"), score=top_score),
    ]
    service = AnswerService(retriever)
    service._query_rewriter.rewrite = lambda msg, hist: msg  # type: ignore[method-assign]
    return service


def test_high_confidence_uses_llm_synthesis():
    service = _make_service(0.9)

    def fake_generate(message, results, history=None):
        return (
            "Master Batch must be uploaded in .csv (MS-DOS) format only.\n\n"
            "- Use only the required columns\n"
            "- Do not add headers"
        )

    service._generate_answer = fake_generate  # type: ignore[method-assign]
    response = service.answer("any question")
    assert response.confidence == "high"
    assert "csv" in response.answer.lower()
    assert response.category == "Test"


def test_low_confidence_returns_refusal():
    service = _make_service(0.5)
    service.retriever.search.return_value = [
        SearchResult(entry=_entry("test_faq"), score=0.5),
        SearchResult(entry=_entry("other_faq"), score=0.48),
    ]
    response = service.answer("any question")
    assert response.confidence == "low"
    assert response.answer == REFUSAL_MESSAGE


def test_clear_match_with_margin_accepts_below_low_threshold():
    service = AnswerService(MagicMock())
    service._query_rewriter.rewrite = lambda msg, hist: msg  # type: ignore[method-assign]
    service.retriever.search.return_value = [
        SearchResult(entry=_entry("certificate_minimum_40"), score=0.55),
        SearchResult(entry=_entry("other_faq"), score=0.28),
    ]

    def fake_generate(message, results, history=None):
        return "You need at least 40% on the online assessment to receive the certificate."

    service._generate_answer = fake_generate  # type: ignore[method-assign]
    response = service.answer("what is minimum pass score")
    assert response.confidence == "medium"
    assert "40" in response.answer


def test_medium_confidence_uses_llm(monkeypatch):
    service = _make_service(0.75)

    def fake_generate(message, results, history=None):
        return "Rephrased answer from LLM."

    monkeypatch.setattr(service, "_generate_answer", fake_generate)
    response = service.answer("any question")
    assert response.confidence == "medium"
    assert response.answer == "Rephrased answer from LLM."
