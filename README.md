# Stillwave

Stillwave is a no-account voice noise-reduction SaaS demo. It combines a polished React recording studio with a FastAPI service running the open-source DeepFilterNet3 speech-enhancement model.

## What is implemented

- Modern responsive landing page with product narrative, workflow, pricing, proof, and FAQ sections.
- Browser microphone recording with live levels, elapsed time, pause/resume, and finish controls.
- Audio upload by picker or drag-and-drop (WAV, MP3, M4A, OGG, and WebM; 50 MB maximum).
- Waveform extraction, a waveform-shaped processing meter, and custom seekable original/enhanced players.
- Real DeepFilterNet3 inference—not a filter preset or mocked audio transform.
- One-hour automatic job expiry and an in-memory/tmpfs production storage policy.
- A single multi-stage Docker image that works on native `linux/amd64` and `linux/arm64` hosts.

## Architecture

```text
Browser (React + Web Audio + MediaRecorder)
  -> POST /api/jobs (streamed multipart upload)
  -> poll /api/jobs/:id (actual pipeline stages)
  -> compare /api/jobs/:id/audio/{original,enhanced}

FastAPI (one process / one model instance)
  -> FFmpeg: decode + mono 48 kHz PCM normalization
  -> DeepFilterNet3: full-band speech enhancement
  -> FFmpeg: 24-bit WAV mastering
  -> tmpfs: result storage, deleted after 1 hour
```

One worker is deliberate. DeepFilterNet's model and filtering state are loaded once and protected by an inference lock. Adding Uvicorn workers would duplicate model memory and create isolated queues. Scale horizontally with multiple containers and a shared job system if production traffic outgrows one CPU worker.

## Local frontend development

Prerequisites: Bun or Node.js 22+, Python 3.11, FFmpeg, and libsndfile.

```bash
npm install
npm run dev
```

In another shell, create a Python environment and start the API:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload
```

The Vite server proxies `/api` to port 8000.

## Docker / Coolify

The repository includes the official 7.6 MB DeepFilterNet3 checkpoint archive. The Docker build verifies its SHA-256 checksum (`49c52edc…2284d2`), extracts it into the image, and validates that the Python/native runtime can load it. Neither the image build nor production startup depends on an anonymous GitHub model download. The first build is intentionally large and can take several minutes because it installs CPU PyTorch.

```bash
docker compose build
docker compose up -d
```

Open `http://localhost:3000`. Coolify can deploy this repository directly with the included `docker-compose.yml`. Set the public container port to `8000` when using the Dockerfile deployment type, or let Compose publish it.

### ARM64 notes

- `python:3.11-slim-bookworm` and `node:22-bookworm-slim` are multi-architecture images.
- DeepFilterLib 0.5.6 publishes a CPython 3.11 `manylinux_2_28_aarch64` wheel.
- Build on the target ARM64 Coolify host for the simplest path. To cross-build from a configured Buildx machine, use `docker buildx build --platform linux/arm64 .`.
- Start with at least 2 GB RAM; 4 GB is more comfortable during image builds. Tune `TORCH_NUM_THREADS` to the number of CPU cores allocated to the service.

## Production boundaries

- This version has an intentionally ephemeral, single-node queue. A container restart discards active jobs.
- The displayed paid plans are product presentation only; billing and quota enforcement are not included.
- Reverse-proxy request limits must allow 50 MB uploads and processing requests should remain on HTTPS for browser microphone permission.
- Music is not the target input. DeepFilterNet is optimized for speech enhancement.

## Model attribution

Audio enhancement uses [Rikorose/DeepFilterNet](https://github.com/Rikorose/DeepFilterNet), dual-licensed by its authors under MIT or Apache-2.0. The bundled `backend/models/DeepFilterNet3.zip` is the unmodified official checkpoint archive from that repository. Stillwave defaults to DeepFilterNet3 with its post-filter enabled.
