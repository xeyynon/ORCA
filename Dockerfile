# ORCA: API + built frontend in one image (target "full", the default), or the API alone (target "api",
# for when the frontend is hosted elsewhere, e.g. Vercel). Multi-arch bases, so it builds as-is on an Oracle Ampere (arm64) VM.

# ---- frontend ----
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- api ----
FROM python:3.12-slim AS api
ENV PYTHONIOENCODING=utf-8 \
    PYTHONUNBUFFERED=1 \
    ORCA_DB_PATH=/data/ssa_data.db \
    ORCA_AUTH_FILE=/data/auth.json
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py ./
RUN useradd --create-home orca && mkdir /data && chown orca /data
USER orca
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
# One worker: SQLite takes one writer. --proxy-headers so the login throttle sees the visitor, not Caddy.
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]

# ---- api + frontend ----
FROM api AS full
ENV ORCA_STATIC_DIR=/app/static
COPY --from=web /web/dist ./static
