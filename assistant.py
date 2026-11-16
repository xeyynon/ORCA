"""
Optional AI backend for the "Ask ORCA" assistant, using Groq. OFF by default.

ORCA's core never needs a paid key (MD/intent.md, principle 1). This module adds an extra that a server operator
switches on by setting GROQ_API_KEY (in the environment or in the git-ignored .env file next to api_server.py).
Without it, /api/assistant/status says why the feature is off and /api/assistant/ask answers 503, and the frontend
keeps its deterministic answers.

- Groq's API is OpenAI-compatible; it is called with `requests` (already a dependency), so nothing new is installed.
- What goes upstream: the question, the view name and up to MAX_FACTS short aggregate facts the browser already
  shows (public TLE data). Nothing from auth.json, the database file or the environment.
- The key stays on the server and is never logged. Logs carry only the model, an outcome code and latency.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError

import auth

logger = logging.getLogger(__name__)

PROVIDER = "Groq"
ENV_KEY = "GROQ_API_KEY"
ENV_MODEL = "ORCA_ASSISTANT_MODEL"
# A general-purpose chat model Groq serves (checked against /openai/v1/models on 2026-11-07: llama-3.3-70b-versatile
# had been retired). Groq retires models from time to time: override with ORCA_ASSISTANT_MODEL.
DEFAULT_MODEL = "openai/gpt-oss-120b"
ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
LABEL = "AI-generated"

MAX_QUESTION = 500
MAX_FACTS = 30
MAX_FACT = 300
MAX_VIEW = 64

# The visible answer is 1-4 sentences. Reasoning models (gpt-oss) also spend tokens thinking before they answer,
# so leave headroom or the answer can come back empty; still small enough that a runaway reply costs little.
MAX_TOKENS = 1024
# Reasoning models accept an effort setting; this is short factual chat, so low. Sent only to models that accept it.
REASONING_EFFORT = "low"
_REASONING_PREFIXES = ("openai/gpt-oss",)
TEMPERATURE = 0.2  # factual answers from given facts: little creativity wanted
TIMEOUT_S = 30.0

# Per user: at most this many questions reach the provider in the window. Same sliding window as the login throttle.
ASK_LIMIT = int(os.environ.get("ORCA_ASSISTANT_LIMIT", "20"))
ASK_WINDOW_S = int(os.environ.get("ORCA_ASSISTANT_WINDOW_S", "600"))

SYSTEM_PROMPT = (
    "You are the assistant inside ORCA, an educational space-situational-awareness tool built on public "
    "two-line element sets (TLEs) from CelesTrak. Answer only from the facts provided with the question and "
    "from general orbital-mechanics knowledge. If the facts do not contain the answer, say so plainly. "
    "Never invent catalog numbers, object names, positions, distances, times or collision probabilities. "
    "ORCA's figures come from simplified propagation of public TLEs and an assumed covariance model, so it is "
    "not for operational decisions; say so if asked to act on a result. "
    "Reply in 1 to 4 sentences of plain text, with no Markdown, lists or headings. "
    "Write the way a person would explain it out loud: everyday words, short complete sentences, 'we' and 'our' "
    "when speaking for ORCA, no semicolons or dashes joining clauses, and no filler or hype. Keep technical terms "
    "(TLE, Pc, TCA, SGP4, NORAD) and every number exactly as given."
)


class AskContext(BaseModel):
    view: str = Field(default="", max_length=MAX_VIEW)
    facts: List[str] = Field(default_factory=list, max_length=MAX_FACTS)


class AskRequest(BaseModel):
    question: str = Field(max_length=MAX_QUESTION)
    context: AskContext = Field(default_factory=AskContext)


class AskLimiter(auth.LoginThrottle):
    """The login throttle's sliding window, counting questions instead of failed logins."""

    def __init__(self, max_requests: int = ASK_LIMIT, window_s: int = ASK_WINDOW_S):
        super().__init__(max_failures=max_requests, window_s=window_s)

    def record(self, key: str, now: Optional[float] = None) -> None:
        self.record_failure(key, now)


class UpstreamError(Exception):
    """The provider could not give an answer. The message is safe to show; it never carries the key or a trace."""


class HttpError(Exception):
    """A non-2xx answer from the provider. Only the status code is kept: the body may echo request details."""

    def __init__(self, status_code: int):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


# ---- configuration ---------------------------------------------------------------------------------

def _api_key() -> str:
    return os.environ.get(ENV_KEY, "").strip()


def model() -> str:
    return os.environ.get(ENV_MODEL, "").strip() or DEFAULT_MODEL


def status() -> Dict[str, Any]:
    """Shape: {"enabled": bool, "model": str | None, "reason": str | None}."""
    if not _api_key():
        return {"enabled": False, "model": None, "reason": f"No {ENV_KEY} is set on the server."}
    return {"enabled": True, "model": model(), "reason": None}


# ---- input -----------------------------------------------------------------------------------------

def validate(payload: Any) -> AskRequest:
    """Parse and check the body. Raises ValueError with a message fit for a 400."""
    if not isinstance(payload, dict):
        raise ValueError("Send a JSON object with a question and a context.")
    try:
        req = AskRequest.model_validate(payload)
    except ValidationError as exc:
        first = exc.errors()[0]
        where = ".".join(str(p) for p in first.get("loc", ())) or "body"
        raise ValueError(f"Invalid {where}: {first.get('msg', 'bad value')}.") from None
    req.question = req.question.strip()
    if not req.question:
        raise ValueError(f"Ask a question of 1 to {MAX_QUESTION} characters.")
    for fact in req.context.facts:
        if len(fact) > MAX_FACT:
            raise ValueError(f"Each fact must be at most {MAX_FACT} characters.")
    req.context.facts = [f.strip() for f in req.context.facts if f.strip()]
    return req


# ---- the upstream call -----------------------------------------------------------------------------

def build_request(req: AskRequest, model_id: str) -> Dict[str, Any]:
    """The JSON body sent to the chat-completions endpoint. Pure, so tests can read exactly what goes upstream."""
    facts = "\n".join(f"- {f}" for f in req.context.facts) or "(no facts were provided)"
    user = (
        f"Current ORCA view: {req.context.view or 'unknown'}\n"
        f"Facts shown on screen (the only ORCA data you have):\n{facts}\n\n"
        f"Question: {req.question}"
    )
    body: Dict[str, Any] = {
        "model": model_id,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}],
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
    }
    if model_id.startswith(_REASONING_PREFIXES):
        body["reasoning_effort"] = REASONING_EFFORT
    return body


def _send(body: Dict[str, Any]) -> Dict[str, Any]:
    """The one place the network is touched. Returns the parsed JSON; raises HttpError on a non-2xx status."""
    import requests

    resp = requests.post(
        ENDPOINT,
        json=body,
        headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
        timeout=TIMEOUT_S,
    )
    if resp.status_code >= 400:
        raise HttpError(resp.status_code)
    return resp.json()


def _text_of(response: Dict[str, Any]) -> str:
    choices = response.get("choices") or []
    first = choices[0] if choices and isinstance(choices[0], dict) else {}
    if first.get("finish_reason") == "content_filter":
        raise UpstreamError("The assistant declined to answer this question.")
    text = ((first.get("message") or {}).get("content") or "").strip()
    if not text:
        raise UpstreamError("The assistant returned no answer. Try rephrasing the question.")
    return text


def ask(req: AskRequest) -> Dict[str, str]:
    """Blocking call to the provider. Returns {"answer", "model"}; raises UpstreamError on any failure.
    Logs one line per call: model, outcome (ok, an HTTP status or an exception class name) and latency."""
    model_id = model()
    started = time.monotonic()
    outcome = "ok"
    try:
        try:
            response = _send(build_request(req, model_id))
        except Exception as exc:  # HTTP errors, timeouts, network errors: one safe message each
            outcome = str(getattr(exc, "status_code", None) or type(exc).__name__)
            raise UpstreamError(_failure_message(exc)) from None
        try:
            answer = _text_of(response)
        except UpstreamError:
            outcome = "refusal" if ((response.get("choices") or [{}])[0] or {}).get("finish_reason") == "content_filter" else "empty"
            raise
        return {"answer": answer, "model": str(response.get("model") or model_id)}
    finally:
        logger.info("assistant: provider=%s model=%s outcome=%s latency_ms=%d", PROVIDER, model_id, outcome, (time.monotonic() - started) * 1000)


def _failure_message(exc: Exception) -> str:
    """Plain words by status class. Never str(exc): keep upstream detail out of the response."""
    code = getattr(exc, "status_code", None)
    if code in (401, 403):
        return "The assistant is misconfigured on the server (the API key was rejected)."
    if code == 429:
        return "The assistant is busy right now. Try again in a minute."
    if code in (400, 404):
        return f"The configured assistant model is not available. Check {ENV_MODEL} on the server."
    return "The assistant could not answer right now. Try again later."
