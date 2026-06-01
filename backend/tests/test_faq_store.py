from services.faq_store import load_faqs


def test_load_faqs_count():
    faqs = load_faqs()
    assert len(faqs) == 35


def test_faq_entries_have_required_fields():
    faqs = load_faqs()
    for entry in faqs:
        assert entry.id
        assert entry.category
        assert entry.question
        assert entry.answer
        assert isinstance(entry.aliases, list)
