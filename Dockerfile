# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    XDG_CACHE_HOME=/app/.cache \
    JOB_ROOT=/tmp/stillwave-jobs \
    STATIC_ROOT=/app/static \
    DF_MODEL=/app/models/DeepFilterNet3

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg libsndfile1 libgomp1 ca-certificates git \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system stillwave \
    && useradd --system --gid stillwave --home-dir /app --create-home stillwave

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/app ./backend/app
COPY backend/models/DeepFilterNet3.zip /tmp/DeepFilterNet3.zip
COPY --from=frontend /build/dist ./static
RUN echo "49c52edc8947ae1f9bf50d81530beaf3a2c3245aeaf34b6f31ff535cd22284d2  /tmp/DeepFilterNet3.zip" | sha256sum -c - \
    && mkdir -p /app/models \
    && python -m zipfile -e /tmp/DeepFilterNet3.zip /app/models \
    && rm /tmp/DeepFilterNet3.zip \
    && mkdir -p /app/.cache /tmp/stillwave-jobs \
    && chown -R stillwave:stillwave /app /tmp/stillwave-jobs

USER stillwave
# Validate the bundled checkpoint and Python/native runtime during the image build.
# The model path is local, so this never makes a network request.
RUN python -c "from df.enhance import init_df; init_df('/app/models/DeepFilterNet3', post_filter=True, log_level='ERROR', log_file=None)"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--app-dir", "/app/backend", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips=*", "--limit-concurrency", "64", "--timeout-keep-alive", "5"]
