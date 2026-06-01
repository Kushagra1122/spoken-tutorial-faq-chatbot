from services.history import HistoryMessage, build_search_query


def test_build_search_query_without_history():
    assert build_search_query("student limit", []) == "student limit"


def test_build_search_query_includes_prior_turns():
    history = [
        HistoryMessage(role="user", content="What is Master Batch?"),
        HistoryMessage(
            role="assistant",
            content="Master Batch is the participant list uploaded by organiser.",
        ),
    ]
    query = build_search_query("And validation time?", history)
    assert "Master Batch" in query
    assert "validation time" in query.lower()
