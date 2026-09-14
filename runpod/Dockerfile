# Digital Docent voice/face worker — one image, two Python environments.
#
# Supertonic and LAM cannot share an interpreter: Supertonic wants numpy 2.x with
# onnxruntime, LAM wants numpy 1.26 with torch 2.1.2+cu121. "One container" and
# "one venv" are different things, so this image carries both venvs and an
# orchestrator that spawns them.
#
# Everything is baked. On a scale-to-zero endpoint almost every request pays a
# cold start, and a cold start that downloads 780 MB of models is a cold start
# that fails on a bad network and costs money on a good one. The models are
# pinned into layers instead.
#
#   docker build -t dd-voice:1 -f runpod/Dockerfile .
#
# Build context must contain:
#   voice/                      the two worker scripts (unchanged from local)
#   runpod/handler.py
#   models/supertonic-3/        Supertonic ONNX + voice style M1
#   models/lam/                 lam_audio2exp_streaming.tar
#   models/LAM_Audio2Expression/  the inference source tree

# CUDA 12.1 runtime to match torch 2.1.2+cu121 exactly. cudnn8 is required by torch.
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    # LAM builds its audio encoder from a local config rather than downloading
    # 'facebook/wav2vec2-base-960h' — models/network.py takes the else branch
    # because that string is not a path on disk. Offline is therefore correct,
    # and asserting it turns a silent network fetch into a loud failure.
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.10 python3.10-venv python3-pip libsndfile1 ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------- supertonic venv
COPY runpod/requirements-supertonic.txt /tmp/requirements-supertonic.txt
RUN python3.10 -m venv /opt/supertonic-venv \
    && /opt/supertonic-venv/bin/pip install --no-cache-dir -r /tmp/requirements-supertonic.txt

# ---------------------------------------------------------------------- lam venv
# torch cu121 comes from PyTorch's index; everything else from PyPI.
COPY runpod/requirements-lam.txt /tmp/requirements-lam.txt
RUN python3.10 -m venv /opt/lam-venv \
    && /opt/lam-venv/bin/pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cu121 \
        -r /tmp/requirements-lam.txt

# LAM venv 의 나머지 핀 — 검증된 venv 의 freeze 와 위 목록의 차집합. 위 레이어를
# 건드리지 않으려고 따로 얹는다 (P3 에서 발견: yapf 누락 → LAM_FAILED).
COPY runpod/requirements-lam-extra.txt /tmp/requirements-lam-extra.txt
RUN /opt/lam-venv/bin/pip install --no-cache-dir -r /tmp/requirements-lam-extra.txt

# ------------------------------------------------------------- handler runtime
COPY runpod/requirements-handler.txt /tmp/requirements-handler.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements-handler.txt

# ------------------------------------------------------------------- artefacts
# Models go in their own layers so code edits do not invalidate 780 MB of cache.
COPY models/supertonic-3 /models/supertonic-3
COPY models/lam /models/lam
COPY models/LAM_Audio2Expression /opt/LAM_Audio2Expression

COPY voice /app/voice
COPY runpod/handler.py /app/handler.py

ENV DD_SUPERTONIC_PYTHON=/opt/supertonic-venv/bin/python \
    DD_LAM_PYTHON=/opt/lam-venv/bin/python \
    DD_WORKER_DIR=/app/voice \
    DD_SUPERTONIC_MODEL_DIR=/models/supertonic-3 \
    DD_LAM_SRC=/opt/LAM_Audio2Expression \
    DD_LAM_CKPT=/models/lam/lam_audio2exp_streaming.tar \
    DD_VOICE_WORK_DIR=/tmp/dd-voice

WORKDIR /app
CMD ["python3.10", "-u", "/app/handler.py"]
