from services.speech_text import prepare_text_for_speech


def test_prepare_text_strips_markdown():
    text = "**What it is**\nMaster Batch is the list.\n- First Name\n- Last Name"
    result = prepare_text_for_speech(text)
    assert "**" not in result
    assert "What it is" in result
    assert "First Name" in result


def test_prepare_text_truncates_long_input():
    text = "word " * 1000
    result = prepare_text_for_speech(text, max_length=100)
    assert len(result) <= 100
