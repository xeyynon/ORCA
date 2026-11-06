"""
The optional "Ask ORCA" AI backend (Groq): /api/assistant/status and /api/assistant/ask.
Run from the repo root:  python -m unittest discover -s tests -v

Requests go through the real ASGI app (auth guard, routing, handler) with a hand-built ASGI call, because the
installed Starlette TestClient needs a package this project does not depend on. Groq is never called:
assistant._send is mocked, or requests.post is mocked inside it. A throwaway credential file is
used via ORCA_AUTH_FILE, never the real auth.json.
"""
import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import assistant  # noqa: E402
import auth  # noqa: E402

FAKE_KEY = "gsk_test0000notarealkey"
FACTS = ["Catalog holds 9,812 objects", "Last TLE refresh 2026-11-07T06:00Z", "Conjunction search: 14 events in 24 h"]


def call(app, method, path, body=None, token=None, raw=None):
    """One request through the ASGI app. Returns (status, parsed JSON body or text, headers)."""
    data = raw if raw is not None else (json.dumps(body).encode("utf-8") if body is not None else b"")
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(data)).encode())]
    if token:
        headers.append((b"authorization", f"Bearer {token}".encode()))
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
        "scheme": "http", "path": path, "raw_path": path.encode(), "root_path": "", "query_string": b"",
        "headers": headers, "client": ("127.0.0.1", 5000), "server": ("testserver", 80),
    }
    sent = {"done": False}
    out = {"status": None, "headers": {}, "body": b""}

    async def receive():
        if sent["done"]:
            return {"type": "http.disconnect"}
        sent["done"] = True
        return {"type": "http.request", "body": data, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            out["status"] = message["status"]
            out["headers"] = {k.decode().lower(): v.decode() for k, v in message.get("headers", [])}
        elif message["type"] == "http.response.body":
            out["body"] += message.get("body", b"")

    asyncio.run(app(scope, receive, send))
    try:
        parsed = json.loads(out["body"] or b"null")
    except ValueError:
        parsed = out["body"].decode("utf-8", "replace")
    return out["status"], parsed, out["headers"]


DEFAULT = "openai/gpt-oss-120b"


def reply(text="Fourteen events were found in the 24-hour window.", model=DEFAULT, finish_reason="stop"):
    return {"model": model, "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": finish_reason}]}


def ask_body(question="How many conjunctions are there?", facts=None, view="conjunctions"):
    return {"question": question, "context": {"view": view, "facts": FACTS if facts is None else facts}}


class AssistantApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import api_server  # imported late: it opens the TLE database
        cls.api = api_server

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        env = mock.patch.dict(os.environ, {"ORCA_AUTH_FILE": os.path.join(tmp.name, "auth.json")})
        env.start()
        self.addCleanup(env.stop)
        for var in (assistant.ENV_KEY, assistant.ENV_MODEL):
            os.environ.pop(var, None)  # restored by patch.dict on cleanup
        auth.set_credentials("admin", "correct horse battery")
        self.token, _ = auth.issue_token("admin")
        limiter = mock.patch.object(self.api, "_ask_limiter", assistant.AskLimiter())
        limiter.start()
        self.addCleanup(limiter.stop)

    def enable(self, model=None):
        os.environ[assistant.ENV_KEY] = FAKE_KEY
        if model:
            os.environ[assistant.ENV_MODEL] = model

    def get(self, path, token="default"):
        return call(self.api.app, "GET", path, token=self.token if token == "default" else token)

    def post(self, body=None, token="default", raw=None):
        return call(self.api.app, "POST", "/api/assistant/ask", body, self.token if token == "default" else token, raw)

    # ---- off by default ----------------------------------------------------------------------------

    def test_status_is_disabled_without_a_key(self):
        status, body, _ = self.get("/api/assistant/status")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"enabled": False, "model": None, "reason": "No GROQ_API_KEY is set on the server."})

    def test_ask_is_503_without_a_key_and_never_calls_upstream(self):
        with mock.patch.object(assistant, "_send") as send:
            status, body, _ = self.post(ask_body())
        self.assertEqual(status, 503)
        self.assertIn("GROQ_API_KEY", body["detail"])
        send.assert_not_called()

    # ---- enabled -----------------------------------------------------------------------------------

    def test_status_enabled_names_the_default_model_and_not_the_key(self):
        self.enable()
        status, body, _ = self.get("/api/assistant/status")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"enabled": True, "model": DEFAULT, "reason": None})
        self.assertNotIn(FAKE_KEY, json.dumps(body))

    def test_the_model_can_be_overridden(self):
        self.enable(model="llama-3.1-8b-instant")
        self.assertEqual(self.get("/api/assistant/status")[1]["model"], "llama-3.1-8b-instant")

    def test_ask_returns_a_labelled_answer_built_from_the_facts_sent(self):
        self.enable()
        with mock.patch.object(assistant, "_send", return_value=reply()) as send:
            status, body, _ = self.post(ask_body())
        self.assertEqual(status, 200, body)
        self.assertEqual(body, {"answer": "Fourteen events were found in the 24-hour window.",
                                "model": DEFAULT, "label": "AI-generated"})
        sent = send.call_args.args[0]
        self.assertEqual(sent["model"], DEFAULT)
        self.assertEqual(sent["messages"][0], {"role": "system", "content": assistant.SYSTEM_PROMPT})
        user_text = sent["messages"][1]["content"]
        for fact in FACTS:
            self.assertIn(fact, user_text)
        self.assertIn("How many conjunctions are there?", user_text)
        self.assertIn("conjunctions", user_text)
        self.assertNotIn(FAKE_KEY, json.dumps(sent))  # the key travels in the client, never in the prompt

    def test_the_system_prompt_keeps_answers_honest(self):
        prompt = assistant.SYSTEM_PROMPT.lower()
        for phrase in ("public", "only from the facts", "say so plainly", "never invent", "not for operational", "1 to 4 sentences"):
            self.assertIn(phrase, prompt)

    def test_send_posts_to_groq_with_the_key_only_in_the_auth_header(self):
        """Exercise assistant._send itself with requests.post mocked (no network)."""
        self.enable()
        ok = mock.Mock(status_code=200)
        ok.json.return_value = reply()
        with mock.patch("requests.post", return_value=ok) as post:
            status, body, _ = self.post(ask_body())
        self.assertEqual(status, 200, body)
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://api.groq.com/openai/v1/chat/completions")
        self.assertEqual(kwargs["headers"]["Authorization"], f"Bearer {FAKE_KEY}")
        self.assertEqual(kwargs["json"]["model"], DEFAULT)
        self.assertNotIn(FAKE_KEY, json.dumps(kwargs["json"]))
        self.assertGreater(kwargs["timeout"], 0)

    def test_a_non_2xx_from_groq_becomes_a_plain_502(self):
        self.enable()
        for code, words in ((401, "misconfigured"), (429, "busy"), (404, "not available"), (500, "could not answer")):
            bad = mock.Mock(status_code=code)
            bad.json.return_value = {"error": {"message": f"echo {FAKE_KEY}"}}
            with mock.patch("requests.post", return_value=bad):
                status, body, _ = self.post(ask_body())
            self.assertEqual(status, 502, code)
            self.assertIn(words, body["detail"], code)
            self.assertNotIn(FAKE_KEY, body["detail"])

    def test_upstream_failure_is_a_plain_502_without_the_key_or_a_trace(self):
        self.enable()
        boom = RuntimeError(f"connection reset while sending x-api-key: {FAKE_KEY}")
        with mock.patch.object(assistant, "_send", side_effect=boom), self.assertLogs("assistant", "INFO") as logs:
            status, body, _ = self.post(ask_body())
        self.assertEqual(status, 502)
        self.assertEqual(body, {"detail": "The assistant could not answer right now. Try again later."})
        self.assertNotIn(FAKE_KEY, "\n".join(logs.output))
        self.assertIn("outcome=RuntimeError", "\n".join(logs.output))

    def test_an_upstream_status_maps_to_a_plain_message(self):
        self.enable()
        err = assistant.HttpError(401)
        err.status_code = 401
        with mock.patch.object(assistant, "_send", side_effect=err):
            status, body, _ = self.post(ask_body())
        self.assertEqual(status, 502)
        self.assertIn("misconfigured", body["detail"])
        self.assertNotIn("401", body["detail"])

    def test_a_refusal_or_an_empty_reply_is_a_502_not_an_empty_answer(self):
        self.enable()
        for response in (reply(finish_reason="content_filter"), reply(text="   "), {"choices": []}):
            with mock.patch.object(assistant, "_send", return_value=response):
                status, body, _ = self.post(ask_body())
            self.assertEqual(status, 502, body)
            self.assertTrue(body["detail"])

    # ---- input -------------------------------------------------------------------------------------

    def test_bad_input_is_400(self):
        self.enable()
        cases = {
            "empty question": ask_body(question=""),
            "blank question": ask_body(question="   "),
            "question too long": ask_body(question="x" * 501),
            "too many facts": ask_body(facts=[f"fact {i}" for i in range(31)]),
            "fact too long": ask_body(facts=["y" * 301]),
            "fact not a string": ask_body(facts=[42]),
            "no question": {"context": {"view": "home", "facts": []}},
            "not an object": ["a", "list"],
        }
        with mock.patch.object(assistant, "_send") as send:
            for name, payload in cases.items():
                status, body, _ = self.post(payload)
                self.assertEqual(status, 400, f"{name}: {body}")
                self.assertTrue(body["detail"], name)
            status, _, _ = self.post(raw=b"{not json")
            self.assertEqual(status, 400, "malformed JSON")
        send.assert_not_called()

    def test_limits_are_inclusive(self):
        self.enable()
        with mock.patch.object(assistant, "_send", return_value=reply()):
            status, _, _ = self.post(ask_body(question="q" * 500, facts=["f" * 300] * 30))
        self.assertEqual(status, 200)

    # ---- auth and rate limit -----------------------------------------------------------------------

    def test_both_routes_need_a_sign_in(self):
        self.enable()
        with mock.patch.object(assistant, "_send") as send:
            self.assertEqual(self.get("/api/assistant/status", token=None)[0], 401)
            self.assertEqual(self.post(ask_body(), token=None)[0], 401)
            self.assertEqual(self.post(ask_body(), token="forged.token")[0], 401)
        send.assert_not_called()
        self.assertNotIn("/api/assistant/ask", self.api.PUBLIC_PATHS)
        self.assertNotIn("/api/assistant/status", self.api.PUBLIC_PATHS)

    def test_questions_are_rate_limited_per_user(self):
        self.enable()
        with mock.patch.object(self.api, "_ask_limiter", assistant.AskLimiter(max_requests=2, window_s=600)), \
                mock.patch.object(assistant, "_send", return_value=reply()) as send:
            self.assertEqual(self.post(ask_body())[0], 200)
            self.assertEqual(self.post(ask_body())[0], 200)
            status, body, headers = self.post(ask_body())
        self.assertEqual(status, 429)
        self.assertIn("Try again", body["detail"])
        self.assertTrue(int(headers["retry-after"]) > 0)
        self.assertEqual(send.call_count, 2)


class RequestShapeTests(unittest.TestCase):
    def test_the_body_is_a_chat_completion_with_the_system_prompt_first(self):
        body = assistant.build_request(assistant.validate(ask_body()), DEFAULT)
        self.assertEqual([m["role"] for m in body["messages"]], ["system", "user"])
        self.assertLessEqual(body["max_tokens"], 2048)
        self.assertLessEqual(body["temperature"], 0.5)

    def test_reasoning_effort_is_sent_only_to_models_that_accept_it(self):
        req = assistant.validate(ask_body())
        self.assertEqual(assistant.build_request(req, "openai/gpt-oss-120b")["reasoning_effort"], "low")
        self.assertNotIn("reasoning_effort", assistant.build_request(req, "qwen/qwen3.8-27b"))

    def test_no_facts_is_said_out_loud(self):
        req = assistant.validate(ask_body(facts=[]))
        self.assertIn("no facts were provided", assistant.build_request(req, DEFAULT)["messages"][1]["content"])


if __name__ == "__main__":
    unittest.main()
