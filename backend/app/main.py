from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
import time
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import torch
from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.model_runtime import unpack_df_runtime

LOGGER = logging.getLogger("stillwave")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

APP_ROOT = Path(__file__).resolve().parents[2]
STATIC_ROOT = Path(os.getenv("STATIC_ROOT", APP_ROOT / "static"))
JOB_ROOT = Path(os.getenv("JOB_ROOT", "/tmp/stillwave-jobs"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
MAX_DURATION_SECONDS = int(os.getenv("MAX_DURATION_SECONDS", "600"))
JOB_TTL_SECONDS = int(os.getenv("JOB_TTL_SECONDS", "3600"))
DF_MODEL = os.getenv("DF_MODEL", "DeepFilterNet3")
DF_MODEL_LABEL = Path(DF_MODEL).name
ALLOWED_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/webm", "video/webm",
    "application/octet-stream",
}

model_store: dict[str, Any] = {}
inference_lock = asyncio.Lock()


class JobResponse(BaseModel):
    id: str
    status: str
    phase: str
    progress: float
    message: str
    created_at: str
    duration_seconds: float | None = None
    error: str | None = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def job_path(job_id: str) -> Path:
    try:
        canonical = str(UUID(job_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    return JOB_ROOT / canonical


def status_path(job_dir: Path) -> Path:
    return job_dir / "status.json"


def read_status(job_dir: Path) -> dict[str, Any]:
    try:
        return json.loads(status_path(job_dir).read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=404, detail="Job not found or expired") from exc


def write_status(job_dir: Path, **updates: Any) -> dict[str, Any]:
    path = status_path(job_dir)
    try:
        current = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        current = {}
    current.update(updates)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(current, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, path)
    return current


def run_command(command: list[str], timeout: int = 180) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, capture_output=True, text=True, timeout=timeout)


def normalize_audio(source: Path, destination: Path) -> float:
    run_command([
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source), "-vn", "-ac", "1", "-ar", "48000",
        "-c:a", "pcm_s24le", str(destination),
    ])
    result = run_command([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(destination),
    ], timeout=30)
    duration = float(result.stdout.strip())
    if duration <= 0 or duration > MAX_DURATION_SECONDS:
        raise ValueError(f"Recordings must be between 1 second and {MAX_DURATION_SECONDS // 60} minutes.")
    return duration


def enhance_audio(source: Path, destination: Path) -> None:
    from df.enhance import enhance, load_audio, save_audio

    model = model_store["model"]
    df_state = model_store["df_state"]
    audio, _ = load_audio(str(source), sr=df_state.sr())
    enhanced = enhance(model, df_state, audio, pad=True)
    save_audio(str(destination), enhanced, df_state.sr())


async def process_job(job_id: str) -> None:
    job_dir = job_path(job_id)
    try:
        async with inference_lock:
            queued = read_status(job_dir)
            wait_seconds = max(0.0, time.time() - float(queued.get("queued_at", time.time())))
            write_status(job_dir, status="processing", phase="normalizing", progress=18,
                         message="Preparing a full-band 48 kHz signal")
            duration = await asyncio.to_thread(normalize_audio, job_dir / "upload", job_dir / "original.wav")
            write_status(job_dir, phase="analyzing", progress=31, duration_seconds=round(duration, 2),
                         message="Mapping speech and room texture")
            await asyncio.sleep(0.2)
            write_status(job_dir, phase="enhancing", progress=38,
                         message="Removing noise while preserving voice")

            inference = asyncio.create_task(asyncio.to_thread(
                enhance_audio, job_dir / "original.wav", job_dir / "enhanced.wav"
            ))
            started = time.monotonic()
            while not inference.done():
                # DeepFilterNet exposes one full-file inference call, so report bounded
                # elapsed progress while the real inference task owns this stage.
                estimate = min(88.0, 38.0 + (time.monotonic() - started) * (42.0 / max(duration, 4.0)))
                write_status(job_dir, progress=round(estimate, 1))
                await asyncio.sleep(0.55)
            await inference

            write_status(job_dir, phase="mastering", progress=94,
                         message="Balancing the final waveform")
            # Re-encode to a broadly playable PCM WAV and strip incidental metadata.
            raw_enhanced = job_dir / "enhanced.wav"
            mastered = job_dir / "mastered.wav"
            await asyncio.to_thread(run_command, [
                "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(raw_enhanced), "-map_metadata", "-1", "-c:a", "pcm_s24le", str(mastered),
            ])
            os.replace(mastered, raw_enhanced)
            write_status(job_dir, status="complete", phase="complete", progress=100,
                         message="Your quiet room is ready", completed_at=utc_now(),
                         queue_wait_seconds=round(wait_seconds, 2))
    except Exception as exc:  # Keep client-facing state deterministic; details stay in logs.
        LOGGER.exception("Processing failed for job %s", job_id)
        safe_error = str(exc) if isinstance(exc, ValueError) else "The audio engine could not process this file. Try another recording."
        write_status(job_dir, status="failed", phase="failed", progress=0,
                     message="Processing failed", error=safe_error, failed_at=utc_now())


async def cleanup_jobs() -> None:
    while True:
        await asyncio.sleep(600)
        cutoff = time.time() - JOB_TTL_SECONDS
        for child in JOB_ROOT.iterdir():
            if not child.is_dir():
                continue
            with suppress(OSError):
                if child.stat().st_mtime < cutoff:
                    shutil.rmtree(child)


@asynccontextmanager
async def lifespan(_: FastAPI):
    JOB_ROOT.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", str(os.cpu_count() or 1)))))
    cleanup_task = asyncio.create_task(cleanup_jobs())
    if os.getenv("STILLWAVE_SKIP_MODEL") != "1":
        from df.enhance import init_df
        LOGGER.info("Loading %s", DF_MODEL_LABEL)
        initialized = await asyncio.to_thread(
            init_df, DF_MODEL, True, "WARNING", None
        )
        model, df_state = unpack_df_runtime(initialized)
        model.eval()
        model_store.update(model=model, df_state=df_state)
        LOGGER.info("%s ready", DF_MODEL_LABEL)
    yield
    cleanup_task.cancel()
    with suppress(asyncio.CancelledError):
        await cleanup_task
    model_store.clear()


app = FastAPI(
    title="Stillwave Audio API",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENABLE_API_DOCS") == "1" else None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    if "model" not in model_store and os.getenv("STILLWAVE_SKIP_MODEL") != "1":
        raise HTTPException(status_code=503, detail="Audio engine is not ready")
    return {"status": "ok", "model": DF_MODEL_LABEL}


@app.post("/api/jobs", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(audio: UploadFile, background_tasks: BackgroundTasks) -> dict[str, Any]:
    content_type = (audio.content_type or "application/octet-stream").split(";", 1)[0].lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Upload a WAV, MP3, M4A, OGG, or WebM audio file.")
    if "model" not in model_store:
        raise HTTPException(status_code=503, detail="The audio engine is still warming up. Try again shortly.")

    job_id = str(uuid4())
    job_dir = JOB_ROOT / job_id
    job_dir.mkdir(mode=0o700)
    destination = job_dir / "upload"
    size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await audio.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Audio files are limited to 50 MB.")
                output.write(chunk)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise
    finally:
        await audio.close()

    created = utc_now()
    payload = write_status(
        job_dir, id=job_id, status="queued", phase="queued", progress=14,
        message="Warming up the audio engine", created_at=created, queued_at=time.time(),
        upload_bytes=size,
    )
    background_tasks.add_task(process_job, job_id)
    return payload


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str) -> dict[str, Any]:
    return read_status(job_path(job_id))


@app.get("/api/jobs/{job_id}/audio/{kind}")
async def get_audio(job_id: str, kind: str) -> FileResponse:
    if kind not in {"original", "enhanced"}:
        raise HTTPException(status_code=404, detail="Audio version not found")
    directory = job_path(job_id)
    state = read_status(directory)
    if state.get("status") != "complete":
        raise HTTPException(status_code=409, detail="Audio is still processing")
    path = directory / f"{kind}.wav"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Audio version not found")
    return FileResponse(path, media_type="audio/wav", filename=f"stillwave-{kind}.wav")


if STATIC_ROOT.is_dir():
    assets = STATIC_ROOT / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        candidate = (STATIC_ROOT / full_path).resolve()
        if candidate.is_relative_to(STATIC_ROOT.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_ROOT / "index.html")
