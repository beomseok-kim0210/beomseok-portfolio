"""Audio preprocessing for the LAM worker without librosa on the request path.

Why this exists. On a cold RunPod worker the first LAM call cost 15,840 ms
against 1,711 ms of inference. Measured cause: the first call into *any* lazy
librosa submodule compiles numba `@vectorize` ufuncs at import time — 20 s of a
25 s profile in the container, 21.7–28.6 s locally with an empty cache — and
that compile is not served by numba's disk cache (baking one into the image was
tried and rejected). Replacing only `librosa.load` would move the tax, not
remove it: LAM's own `infer_streaming_audio` calls `librosa.feature.rms` on
every chunk (engines/infer.py:171), and that first call costs the same 28.6 s.

So this module reimplements the three librosa entry points the production path
touches, with the exact semantics of the installed librosa 0.11.0, on top of the
same libraries librosa itself delegates to — `soundfile` for decoding and `soxr`
for resampling. It is not an approximation: the equivalence suite compares the
arrays bit for bit against `librosa.load` / `librosa.feature.rms` on real
canonical Supertonic WAVs.

What is reproduced (from librosa/core/audio.py and librosa/feature/spectral.py):

  load(path, sr)     sf.SoundFile(path).read(dtype=float32, always_2d=False).T
                     → mono: mean over channel axes if ndim > 1
                     → resample(orig → sr, res_type="soxr_hq", fix=True, scale=False)
                     → float32
  resample(y, a, b)  soxr.resample(y, a, b, quality="soxr_hq")
                     → fix_length to ceil(n * b / a) (zero-pad or trim)
                     → astype(y.dtype)
  rms(y, fl, hl)     pad fl//2 zeros both sides → frame(as_strided, hop) →
                     mean(square(x, float32), axis=-2, keepdims) → sqrt

`LibrosaShim` exposes these under the attribute names LAM's engine uses
(`librosa.feature.rms`, `librosa.resample`, `librosa.load`) so the worker can
swap it in for the engine module's `librosa` binding without editing the vendored
LAM source. Anything else the engine might reach for raises loudly rather than
silently falling back to the real librosa.
"""
from __future__ import annotations

import numpy as np
import soundfile as sf
import soxr
from numpy.lib.stride_tricks import as_strided

# librosa.load's default; passed through to soxr unchanged, exactly as librosa does.
RES_TYPE = "soxr_hq"


def fix_length(data: np.ndarray, size: int, axis: int = -1) -> np.ndarray:
    """librosa.util.fix_length: zero-pad or trim `data` to `size` along `axis`."""
    n = data.shape[axis]
    if n > size:
        slices = [slice(None)] * data.ndim
        slices[axis] = slice(0, size)
        return data[tuple(slices)]
    if n < size:
        lengths = [(0, 0)] * data.ndim
        lengths[axis] = (0, size - n)
        return np.pad(data, lengths, mode="constant")
    return data


def resample(y: np.ndarray, orig_sr: float, target_sr: float) -> np.ndarray:
    """librosa.resample(y, orig_sr, target_sr, res_type="soxr_hq", fix=True, scale=False)."""
    if orig_sr == target_sr:
        return y
    ratio = float(target_sr) / orig_sr
    n_samples = int(np.ceil(y.shape[-1] * ratio))
    y_hat = np.apply_along_axis(
        soxr.resample, axis=-1, arr=y, in_rate=orig_sr, out_rate=target_sr, quality=RES_TYPE,
    )
    y_hat = fix_length(y_hat, n_samples)
    return np.asarray(y_hat, dtype=y.dtype)


def to_mono(y: np.ndarray) -> np.ndarray:
    """librosa.to_mono: average every leading (channel) axis."""
    if y.ndim > 1:
        y = np.mean(y, axis=tuple(range(y.ndim - 1)))
    return y


def load(path, sr: int | float | None = 16000, dtype=np.float32):
    """librosa.load(path, sr=sr, mono=True, dtype=float32, res_type="soxr_hq")."""
    with sf.SoundFile(path) as desc:
        sr_native = desc.samplerate
        y = desc.read(frames=-1, dtype=dtype, always_2d=False).T
    y = to_mono(y)
    if sr is not None:
        y = resample(y, orig_sr=sr_native, target_sr=sr)
    else:
        sr = sr_native
    return y, sr


def frame(x: np.ndarray, frame_length: int, hop_length: int) -> np.ndarray:
    """librosa.util.frame(x, frame_length, hop_length, axis=-1) — the stride-trick view."""
    x = np.asarray(x)
    if x.shape[-1] < frame_length:
        raise ValueError(f"Input is too short (n={x.shape[-1]:d}) for frame_length={frame_length:d}")
    if hop_length < 1:
        raise ValueError(f"Invalid hop_length: {hop_length:d}")
    out_strides = x.strides + (x.strides[-1],)
    shape = list(x.shape)
    shape[-1] -= frame_length - 1
    xw = as_strided(x, strides=out_strides, shape=tuple(shape) + (frame_length,), writeable=False)
    xw = np.moveaxis(xw, -1, -2)
    slices = [slice(None)] * xw.ndim
    slices[-1] = slice(0, None, hop_length)
    return xw[tuple(slices)]


def rms(*, y: np.ndarray, frame_length: int, hop_length: int) -> np.ndarray:
    """librosa.feature.rms(y=y, frame_length, hop_length, center=True, pad_mode="constant", dtype=float32)."""
    padding = [(0, 0)] * y.ndim
    padding[-1] = (int(frame_length // 2), int(frame_length // 2))
    y = np.pad(y, padding, mode="constant")
    x = frame(y, frame_length=frame_length, hop_length=hop_length)
    power = np.mean(np.square(x, dtype=np.float32), axis=-2, keepdims=True)
    return np.sqrt(power)


class _Feature:
    rms = staticmethod(rms)


class LibrosaShim:
    """Drop-in for the `librosa` name inside LAM's engine module.

    Only the three members the streaming path uses exist. Anything else fails
    loudly — a silent fallback to real librosa would re-introduce the cold tax
    without anyone noticing.
    """

    feature = _Feature()

    @staticmethod
    def resample(y, *, orig_sr, target_sr, **kwargs):
        if kwargs:
            raise AttributeError(f"LibrosaShim.resample does not accept {sorted(kwargs)}")
        return resample(y, orig_sr=orig_sr, target_sr=target_sr)

    @staticmethod
    def load(path, *, sr=16000, **kwargs):
        if kwargs:
            raise AttributeError(f"LibrosaShim.load does not accept {sorted(kwargs)}")
        return load(path, sr=sr)

    def __getattr__(self, name):
        raise AttributeError(
            f"LibrosaShim has no '{name}': the LAM engine reached for a librosa member "
            "outside the streaming path. Extend the shim deliberately instead of importing librosa.")
