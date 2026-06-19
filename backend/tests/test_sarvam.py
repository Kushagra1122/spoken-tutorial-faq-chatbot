from services.sarvam import normalize_audio_content_type


def test_normalize_webm_with_codecs():
    assert normalize_audio_content_type("audio/webm;codecs=opus") == "audio/webm"


def test_normalize_plain_webm():
    assert normalize_audio_content_type("audio/webm") == "audio/webm"
