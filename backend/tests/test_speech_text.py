from services.speech_text import prepare_text_for_speech


def test_prepare_text_strips_markdown_and_keeps_direct_answer():
    text = "**Master Batch** is the participant list uploaded by the organiser."
    result = prepare_text_for_speech(text)
    assert "**" not in result
    assert "Master Batch" in result
    assert result.endswith(".")


def test_prepare_text_skips_disclaimer_lines():
    text = (
        "Maximum 500 students per batch.\n"
        "For account-specific help, contact your training coordinator."
    )
    result = prepare_text_for_speech(text)
    assert "500 students" in result
    assert "training coordinator" not in result


def test_prepare_text_collapses_short_lists():
    text = "Required columns:\n• First Name\n• Last Name\n• Email ID\n• Gender"
    result = prepare_text_for_speech(text)
    assert "First Name" in result
    assert "Gender" in result
    assert "•" not in result


def test_prepare_text_limits_long_lists():
    items = "\n".join(f"• Item {i}" for i in range(1, 9))
    text = f"Common errors:\n{items}"
    result = prepare_text_for_speech(text)
    assert "Item 5" not in result
    assert "Item 4" in result


def test_prepare_text_truncates_long_input():
    text = "word " * 1000
    result = prepare_text_for_speech(text, max_length=100)
    assert len(result) <= 100
