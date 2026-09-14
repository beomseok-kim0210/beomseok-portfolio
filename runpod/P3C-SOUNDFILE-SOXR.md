# P3-C — LAM 전처리에서 librosa 제거 (soundfile + soxr), 로컬 게이트

2026-09-14. Human 결정 `SOUNDFILE_SOXR_IMPLEMENTATION = APPROVED`. 유료 RunPod 실행 없음.
증거: `D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/` (표본 WAV 11 개, 동등성 JSON, LAM 행렬 .npy, Codex).

| 등급 | 뜻 |
|---|---|
| `measured` | 실제 실행에서 잰 값 |
| `derived` | measured 로 계산 |
| `expected` | 근거 명시한 예상 — 실측 아님 |
| `unavailable` | 모른다 |

---

## 1. 무엇이 느렸나 — 정정된 원인 (`measured`)

P3-B 는 "librosa 첫 `load` 의 numba 컴파일" 이라고 했다. 이번 게이트에서 더 정확히 잡았다:
**세금은 `load` 가 아니라 librosa 의 lazy 서브모듈이 처음 import 될 때의 `@vectorize` ufunc
컴파일**이고, 어느 librosa 함수든 *첫 번째로 불리는 쪽*이 낸다. LAM 엔진은 스트리밍 청크마다
`librosa.feature.rms` 를 부른다 (`engines/infer.py:171`).

| 새 프로세스, 빈 numba 캐시 (`measured`) | ms |
|---|---|
| `librosa.feature.rms` 첫 호출 | **28,606.5** |
| 〃 두 번째 | 0.2 |
| 그 뒤 `librosa.load` 첫 호출 | 110.0 |

→ `load` 만 soundfile+soxr 로 바꾸면 세금은 첫 추론(`inference_ms` 안)으로 옮겨 갈 뿐 사라지지
않는다. 그래서 엔진이 부르는 세 함수(`feature.rms`, `resample`, `load`)를 전부 대체했다.

## 2. 구현

`voice/lam_audio.py` — librosa 0.11.0 소스(`core/audio.py`, `feature/spectral.py`, `util/utils.py`)를
그대로 옮긴 재구현. librosa 가 위임하는 같은 라이브러리 위에서:

```
load(path, sr=16000)   sf.SoundFile(path).read(dtype=float32, always_2d=False).T
                       → to_mono (ndim>1 이면 채널 평균) → resample → float32
resample(y, a, b)      soxr.resample(y, a, b, quality="soxr_hq") → fix_length(ceil(n·b/a)) → y.dtype
rms(y, fl, hl)         pad fl//2 양쪽 → frame(as_strided, hop) → mean(square(x, float32), axis=-2) → sqrt
LibrosaShim            .feature.rms / .resample / .load 만 노출. 그 밖의 속성은 AttributeError —
                       조용히 진짜 librosa 로 떨어지지 않는다.
```

`voice/lam_worker.py` — `import librosa` 없음. `engines.infer` 를 import 한 뒤
`_engine.librosa = lam_audio.LibrosaShim()` 으로 엔진 모듈의 바인딩을 교체. 요청 경로는
`lam_audio.load`. 워밍업은 **CUDA 첫 forward 전용**: 0.5 s 합성 무음(청크 1 개 = forward 1 회)을
같은 `lam_audio.load` 로 디코드 → 같은 `run_streaming` 1 회 → 폐기. `np.random` 상태는 워밍업
전후로 복원(엔진 후처리가 눈 깜빡임에 난수를 쓴다). READY 메시지에
`librosa_submodules_loaded` / `librosa_lazy_loaded` 를 실어 세금 경로가 닫혀 있음을 매 기동마다 증명.

LAM 소스 트리는 **편집하지 않았다.** `engines/infer.py` 의 최상위 `import librosa` 는 남아 있다
(10 ms 껍데기) — 그래서 **librosa 는 설치된 채로 남아야 한다** (§8).

## 3. 전처리 동등성 — `measured`, 11 표본, 두 플랫폼

표본 (`make-canonical-samples.py`): 실제 Supertonic canonical WAV 5 개(1.3 / 1.5 / 2.9 / 14.6 / 30.1 s,
44.1 kHz mono PCM_16 — 프로덕션 포맷 그대로), 실제 canonical 2 개(P3 RunPod 콜드 출력 `cold-2.wav`,
M2 시기 문장), 합성 edge 4 개(1 s 디지털 무음 = 정확한 배수 길이, ±1 LSB 3 s, 320 샘플(한 프레임
533 보다 짧음), 홀수 길이 88,207 샘플).

각 표본에 대해 `librosa.load(sr=16000)` vs `lam_audio.load`, 그리고 엔진이 실제로 부르는 방식
그대로의 `librosa.feature.rms` vs `lam_audio.rms`(청크 16,000, `frame_length=min(533,len)`, hop 533,
**마지막 빈 청크의 `frame_length=0` 호출 포함**):

| | Windows LAM venv | Linux 컨테이너 `p3d` |
|---|---|---|
| `load` 비트 동일 | **11 / 11** | **11 / 11** |
| `rms` 비트 동일 (각자 배열 · 같은 입력) | **11 / 11** | **11 / 11** |
| dtype / ndim / shape / 샘플 수 | 전부 일치 (float32, 1-D) | 전부 일치 |
| soxr `"soxr_hq"` == `"HQ"` | 11 / 11 | 11 / 11 |

빈 청크의 `rms` 는 양쪽 다 `[[nan]]` — 엔진이 `volume[:0]` 으로 버리는 값. 비교기는 `equal_nan` 으로
같다고 판정한다(처음엔 NaN≠NaN 으로 2 건이 FAIL 로 보였다 — 비교기 버그였고 고쳤다).

플랫폼 *간* 차이: 리샘플 배열이 Windows 와 Linux 에서 다르다 — **max 5.96e-08 (float32 1 ulp)**,
librosa 경로와 lam_audio 경로에서 정확히 같은 크기. soxr 빌드의 성질이며 기존 프로덕션에도 있던 것.

## 4. LAM 출력 동등성 — `measured`, [N,52] 전체

`lam-output-runner.py` 로 old(실제 librosa) / new(shim) 를 각각 **새 프로세스**로 돌려 11 표본의
전체 expression 행렬을 비교. old 를 두 번 돌려 노이즈 바닥도 쟀다.

| | 결과 |
|---|---|
| 시드 미고정, old-1 vs new-1 | 채널 **8, 9 (eyeBlink L/R)** 만 다름, 나머지 50 채널 비트 동일 |
| 시드 미고정, old-1 vs old-2 | **똑같이** 채널 8, 9 만 다름 — 후처리 `apply_random_eye_blinks_context` 의 `np.random` |
| 입 4 채널 (24/37/42/45/46, 우리가 emit 하는 것) old vs new | **11 / 11 비트 동일** |
| `np.random.seed` 고정, old vs new, 52 채널 전체 | **11 / 11 비트 동일** |

`LAM_OUTPUT_EQUIVALENCE = PASS`. 눈 깜빡임 난수는 기존 성질이고 워커가 emit 하지 않는다.

## 5. 성능 — 로컬 (`measured`, GTX 1060, 새 프로세스, 빈 numba 캐시)

| 지표 | OLD (librosa) | NEW (soundfile+soxr) |
|---|---|---|
| PREPROCESS_FIRST_MS (`load`, 표본 1) | 20,153.5 / 22,214.4 (2 회) | **2.7 / 2.0** |
| PREPROCESS_SECOND_MS | 1.7 | 2.1 – 2.5 |
| FIRST_LAM_TOTAL_MS (load + 첫 추론, 표본 1) | 22,544 / 24,256 | **234.5 / 239.8** |
| 첫 추론만 (CUDA 첫 호출) | 2,390.7 / 2,041.5 | 231.8 / 237.8 |

워커 수준 (`lam-worker-smoke.py`, 3 회 새 프로세스):

| 지표 | P3-B 워커 (librosa 워밍업) | NEW 워커 |
|---|---|---|
| BOOTSTRAP_TOTAL_MS (spawn → READY) | 30,271.8 | **12,210 / 14,613.9 / 27,414.7** |
| 모델 로드 | 1,804.8 | 1,930.6 / 2,014.5 / 6,391.5 |
| 워밍업 합계 | 19,537.0 | **294.8 / 266.3 / 3,491** |
| ├ decode (`warmup_decode_ms`) | 17,447.0 (librosa) | 2.3 / 2.2 / 2.0 |
| └ CUDA 첫 forward (`NEW_CUDA_WARMUP_MS`) | 2,086.9 | 252.6 / 261.0 / 3,475.2 |
| NEW_FIRST_REQUEST_LAM_MS (추론) | 171.2 | **83.7 / 76.8 / 106.6** |
| NEW_SECOND_REQUEST_LAM_MS | 99.5 | 101.7 – 77.5 |
| `librosa_submodules_loaded` | (23 개 모듈) | `["librosa.version"]` |
| 피크 VRAM 워밍업 후 = 요청 후 | 458,095,616 B | 458,095,616 B |

세 번째 실행(27.4 s)은 모델 로드 6.4 s·CUDA 3.5 s 로 기계가 느렸던 순간이다 — 숨기지 않는다.

실제 라우트 E2E (`local-path.mjs`, 새 워커, 실제 Supertonic + LAM): 첫 요청 **14,399 ms**
(P3-B 41,056 / 58,740), LAM 83.4 ms; 둘째 1,753, 셋째 1,999 ms. 세 요청 모두 `synthesisCount 1`,
3-way 해시 일치, WAV SHA 서로 다름.

`derived`: PREPROCESS_SPEEDUP_X = 20,153.5 / 2.7 ≈ **7,464×**, REDUCTION ≈ **99.987 %** (첫 호출,
표본 1, Windows). 이전 탐색치(31,614.6 / 33.4 ≈ 947×)도 baseline 으로 보존
(`librosa-equivalence-probe.json`). **이것은 전처리 첫 호출 구간만이다** — RunPod 스케줄링·
모델 로드·TTS·CUDA 첫 forward 는 별도.

## 6. 실패·복구 (`measured`)

- 존재하지 않는 경로 / WAV 아닌 파일 → 워커 `ok:false` (`LibsndfileError`), 0.9–2.3 ms, 계속 서빙,
  다음 정상 요청 성공 (84.9 ms).
- 워밍업 fault 주입 → `ready:false / stage warmup / 사유`, exit 3, 임시 파일 0.
- 기존 수명주기: Node 77/77, Python 52/52 (`WORKER_TIMEOUT_RECOVERY = PASS`), tsc 0.

## 7. Codex (gpt-5.6-sol, 86,159 토큰) — BLOCKING 0 · HIGH 0 · MEDIUM 1 · LOW 5, 전부 수정

Q1 parity NONE · Q2 shim CONFIRMED · Q3 bootstrap PARTIAL → 수정 후 해소 · Q4 invariant CONFIRMED ·
Q5 dependency CONFIRMED. MEDIUM: 1 s 워밍업이 청크 2 개(둘째는 빈 청크)라 forward 2 회 →
0.5 s 로. LOW: `np.random` 상태 복원 / "librosa 를 import 하지 않는다" 문구 정정 / 빈 청크 rms 호출을
증거에 포함 / 진단 주석 정정 / 해시 시점 문구 정정("디코드 전"이 아니라 "추론 후 재개방").
처분: `digital-docent/.bcos/reviews/T-005-p3c-soundfile-soxr.md`.

## 8. 의존성

librosa 는 **남는다** — 엔진 모듈이 최상위에서 import 한다(교체는 그 뒤). 제거 후보:
`engines/infer.py:21` 을 지연 import 로 바꾸면 librosa·numba·llvmlite 를 이미지에서 뺄 수 있다
(LAM venv 의 llvmlite 116 MB + numba 20 MB). 이번 게이트에서는 **하지 않았다** — 벤더 소스 편집이고
목표는 콜드 경로 제거지 의존성 정리가 아니다.

## 9. RunPod A/B — 설계만, 실행 없음

후보 이미지 `ghcr.io/beomseok-kim0210/dd-voice:p3d` (digest `sha256:c0814e70…`, 푸시 완료, 무료).
컨테이너 안에서 동등성 11/11 과 shim 동작을 확인했다(CPU). 기존 검증 엔드포인트 미변경.

`expected` (실측 아님): 캐시된-이미지 콜드에서 워커 준비 ≈ 5.3 s(P3 실측 bootstrap) + CUDA 워밍업
~1.7 s(P3 컨테이너 첫 추론 기준) ≈ 7 s; 요청 실행 ≈ TTS 2 s + LAM 0.05 s ≈ 3 s; 총 콜드 E2E
≈ 16 (delay) + 7 + 3 ≈ 26 s vs P3 36 s; 과금 초 ≈ 15–20 s 감소. 전부 A/B 에서 확정할 것.
예상 비용 콜드 2 + 웜 5 ≈ **$0.015–0.045** (`estimated`, 실측 요율 0.58/h).
