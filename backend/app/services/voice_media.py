from __future__ import annotations

import base64
import mimetypes
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..core.config import get_settings
from ..core.secrets import get_secret
from .llm import LLMConfig, _openrouter_chat_create, extract_openrouter_chat_text


SUPPORTED_VOICE_MEDIA_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/aac",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
}


@dataclass(frozen=True)
class VoiceTranscriptionResult:
    text: str
    source: str
    model: str
    media_type: str
    file_name: str
    file_size: int
    limitations: list[str]


def voice_media_transcription_available() -> bool:
    return bool(get_secret("OPENROUTER_API_KEY", "").strip())


def infer_voice_media_type(filename: str, media_type: str) -> str:
    cleaned_type = media_type.strip().lower()
    if cleaned_type in SUPPORTED_VOICE_MEDIA_TYPES:
        return cleaned_type

    guessed_type, _ = mimetypes.guess_type(filename)
    if guessed_type and guessed_type.lower() in SUPPORTED_VOICE_MEDIA_TYPES:
        return guessed_type.lower()

    return cleaned_type or "application/octet-stream"


def ensure_supported_voice_media(filename: str, media_type: str) -> str:
    resolved_type = infer_voice_media_type(filename, media_type)
    if resolved_type not in SUPPORTED_VOICE_MEDIA_TYPES:
        raise ValueError("Voice upload currently supports common audio and MP4/WebM/QuickTime voicemail files.")
    return resolved_type


def build_transcript_segments(text: str) -> list[dict[str, str]]:
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]
    if not sentences:
        return []
    return [{"text": sentence, "timestamp": ""} for sentence in sentences[:20]]


def transcribe_voice_media(
    file_bytes: bytes,
    *,
    filename: str,
    media_type: str,
    language: str = "en",
) -> VoiceTranscriptionResult:
    resolved_type = ensure_supported_voice_media(filename, media_type)
    api_key = get_secret("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "Automatic voicemail transcription is not configured. Add OPENROUTER_API_KEY or paste a transcript override."
        )

    settings = get_settings()
    model = get_secret("VOICE_MEDIA_MODEL", settings.default_voice_media_model).strip() or settings.default_voice_media_model
    llm_config = LLMConfig(
        provider="openrouter",
        api_key=api_key,
        model=model,
        source="env",
        secret_name="OPENROUTER_API_KEY",
        site_url=get_secret("OPENROUTER_SITE_URL"),
        app_name=get_secret("OPENROUTER_APP_NAME", "CyberCoach"),
        second_model=get_secret("SECOND_MODEL", settings.default_second_model),
        live_voice_model=get_secret("LIVE_VOICE_MODEL", settings.default_live_voice_model),
    )

    encoded = base64.b64encode(file_bytes).decode("utf-8")
    prompt = (
        "Transcribe the spoken audio from this suspicious phone call or voicemail.\n"
        "Return only the transcript as plain text.\n"
        "Do not add speaker labels, headings, summaries, or explanations.\n"
        f"Transcript language hint: {language}."
    )

    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    if resolved_type.startswith("audio/"):
        media_format = (Path(filename).suffix.lower().lstrip(".") or resolved_type.split("/", 1)[-1]).replace("x-wav", "wav")
        if media_format == "mpga":
            media_format = "mp3"
        content.append(
            {
                "type": "input_audio",
                "input_audio": {
                    "data": encoded,
                    "format": media_format,
                },
            }
        )
    else:
        content.append(
            {
                "type": "video_url",
                "video_url": {
                    "url": f"data:{resolved_type};base64,{encoded}",
                },
            }
        )

    response = _openrouter_chat_create(
        {
            "model": model,
            "temperature": 0,
            "messages": [{"role": "user", "content": content}],
        },
        llm_config,
    )
    transcript = extract_openrouter_chat_text(response).strip()
    transcript = re.sub(r"^```(?:text)?\s*", "", transcript, flags=re.IGNORECASE).strip()
    transcript = re.sub(r"\s*```$", "", transcript).strip()

    if not transcript:
        raise RuntimeError("The configured transcription model returned an empty transcript.")

    limitations = [
        "Transcript quality depends on the uploaded recording, background noise, and the configured transcription model.",
        "CyberCoach analyzes the transcript and supportive audio hints, but does not prove whether a caller is AI-generated.",
    ]

    return VoiceTranscriptionResult(
        text=transcript,
        source="openrouter_multimodal",
        model=model,
        media_type=resolved_type,
        file_name=filename,
        file_size=len(file_bytes),
        limitations=limitations,
    )
