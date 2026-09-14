# P3-B — 과금 정산 + LAM bootstrap 워밍업 (로컬 게이트)

2026-09-14. 유료 RunPod 실행 없음. 증거: `D:/dd-runpod-evidence/2026-09-14-p3-billing-warmup/`.

| 등급 | 뜻 |
|---|---|
| `measured` | 실제 응답/실행에서 잰 값 |
| `official-current` | 오늘 공식 문서에서 읽음 |
| `derived` | 계산 |
| `estimated` / `expected` | 근거 명시한 추정 — 실측 아님 |
| `unavailable` | 모른다. 0 으로 대체하지 않는다 |

---

## 1. 과금 정산 — `measured` (RunPod `GET /v1/billing/endpoints`)

P3 직후에는 빈 배열이었다. 원인은 집계 지연이 *아니라* **조회창**이었다 — 09-14 의
`billing-deep.mjs` 는 2 일 창이라 09-11 실행을 벗어났다. 창을 09-10 부터로 넓히자
34 조합 중 32 가 레코드를 돌려줬다.

| 항목 | 값 |
|---|---|
| 버킷 | 2026-09-11 06:00 (hour) — P3 의 모든 잡이 이 한 시간 안 |
| **amount** | **USD 0.02228182728867978** |
| **timeBilledMs** | **138,301** |
| GPU | `NVIDIA RTX A4500` (gpuTypeId 그룹) |
| pod 별 | 17,557 ms / $0.002829 · 54,400 ms / $0.008764 · 66,344 ms / $0.010689 |
| diskSpaceBilledGB | 60 (= pod 3 × 20 GB 컨테이너 디스크) |
| 계정 잔액 | USD 32.2334760956 — 09-11 06:39 이후 변동 없음 |
| `currentSpendPerHr` | 0 |

### 유효 요율 — `derived from measured`

0.02228183 USD ÷ 138.301 s = **0.00016111 USD/s = 0.58 USD/h**. 공개 요금표와 일치.
워커 레코드의 `costPerHr 0.25` 는 청구에 쓰이지 않았다. `ACTUAL_EFFECTIVE_GPU_RATE = 0.58/h`.

컨테이너 디스크 60 GB 는 레코드에 보이지만 amount 는 GPU 초 × 요율과 8 자리까지 일치한다
→ 디스크 몫은 이 정밀도에서 **0** 이거나 표시되지 않는다. (`derived`; "디스크가 절대
무료" 라고 일반화하지 않는다.)

### 초기화 과금 판정 — `PARTIAL`

| 비교 대상 | 초 |
|---|---|
| 워커 컨테이너 생존 합 (레코드 `lastStartedAt` → `Exited`) | ≈ 125 (`derived`) |
| **timeBilledMs** | **138.3** (`measured`) |
| 생존 합 + 스케줄링/이미지 풀 대기 (≈ 176 + 193) | ≈ 494 (`derived`) |

138.3 s 는 컨테이너 생존 합(125 s)에 가깝고 풀 대기를 더한 값(494 s)과는 멀다. pod 별로
보면 cold-1 의 pod 가 17,557 ms — 그 워커의 생존(06:13:31.99 → 06:13:49 ≈ 17 s)과 일치하고,
그 앞의 ≈193 s 풀/스케줄링은 들어 있지 않다.

판정: **컨테이너 시작부터 종료까지 과금** — 프로세스 기동 + 모델 로드(5.3 s) + 실행 + idle
5 s 는 과금, **컨테이너가 뜨기 전의 이미지 풀/스케줄링 대기는 과금되지 않았다.**
공식 문서 두 페이지의 모순은 이렇게 읽힌다: `workers/overview` 의 "Initializing = No
billing" 은 컨테이너 이전 단계, `pricing` 의 "Start time — loading models" 는 컨테이너
이후 단계. 이것은 P3 한 번의 관측(n=1 시간 버킷, pod 3)이고, RunPod 전체 과금 규칙으로
일반화하지 않는다.

`TOTAL_VERIFICATION_SPEND_USD = 0.02228` (예산 1.00 의 2.2 %).

---

## 2. LAM 첫 호출의 원인 — `CONFIRMED`

P3 관측: 콜드 워커 첫 LAM 호출 15,840 ms, 그중 `inference_ms` 1,711 ms.
코드: `inference_ms` 는 `infer_streaming_audio` 루프만 감싸고, `librosa.load` 는 그 밖이다.

### 로컬 재현 (`measured`, LAM venv, GTX 1060, 새 프로세스)

| 단계 | 빈 numba 캐시 | 캐시 있음 |
|---|---|---|
| `librosa.load` 첫 호출 (44.1 k → 16 k) | **21,699.7 ms** | 1,762.6 ms |
| `librosa.load` 두 번째 | 1.7 ms | 1.7 ms |
| 첫 추론 | 3,549.3 ms | 314.4 ms |
| 두 번째 추론 | 161.7 ms | 54.9 ms |

### 컨테이너 안 (`measured`, CPU, 같은 이미지)

cProfile: 25.3 s 중 **20.2 s 가 `numba/np/ufunc/ufuncbuilder.compile` ×20** —
librosa 서브모듈이 `lazy_loader` 로 첫 `load` 때 import 되며 `@vectorize` ufunc 이 **import
시점에 eager 컴파일**된다. `NUMBA_DEBUG_CACHE=1`: 디스크 캐시 "index loaded" 는
`@jit(cache=True)` 함수(`_localmax`, `__peak_pick`, `_zc_wrapper`)에만 찍혔고 ufunc 은 캐시를
타지 않았다.

결론: 첫 호출 15.8 s = **numba ufunc 컴파일(지배, CPU)** + 첫 CUDA forward(컨테이너
~1.7 s) + librosa lazy import. 모델 로드는 이미 bootstrap 에 있었다.

### 시도했다가 버린 것 — 빌드 시 numba 캐시 굽기

이미지 `530a0b2e…` 에 `/opt/numba-cache`(46 파일, `NUMBA_CPU_NAME=generic`)를 구웠다.
컨테이너 CPU 실측: **캐시 있음 28,540.7 ms / 빈 캐시 18,699.7 ms / CPU 이름 미지정 17,912.2 ms.**
효과 없음(오히려 느림). ufunc 컴파일은 캐시 대상이 아니기 때문이다. Dockerfile 에서
제거했고, 테스트가 재도입을 막는다. 스크립트는 `numba_cache_warm.py.rejected` 로 보존.

---

## 3. 구현 — bootstrap 워밍업

`voice/lam_worker.py`:
- 모델 로드 뒤, READY 전에 `warm_up()`: 프로세스 안에서 **합성 1 s 무음 WAV**(44.1 kHz mono
  PCM_16 — canonical WAV 와 같은 포맷)를 만들고 → 요청과 같은 `librosa.load(sr=cfg.audio_sr)`
  → 요청과 같은 `run_streaming()` 1 회 → 출력 폐기 → `finally` 로 파일 삭제.
- READY 메시지에 `warmup_ms / warmup_librosa_ms / warmup_infer_ms / warmup_frames /
  warmup_peak_vram_allocated / ready_ms / numba_cache_files_before` 를 싣는다.
- 워밍업 실패 → `{"ready": false, "stage": "warmup", "error": ...}` 출력 후 `exit 3`.
  **READY 는 워밍업 성공 뒤에만.**
- 요청 경로는 그대로다. 바뀐 것은 `run_streaming()` 으로 루프를 공유한 것과 `load_ms`
  보고뿐이다. `L2_SILENCE_JAWOPEN_MAX`, 채널 매핑, 해시 의미론 불변.

Supertonic 은 워밍업에서 호출되지 않는다. `USER_UTTERANCE_SUPERTONIC_SYNTHESIS_COUNT = 1` 그대로.

`runpod/handler.py`: `ready:false` 의 이유를 실어 실패 · bootstrap 이 교체 워커의 준비까지
기다림(1 회 재시도) · 재시작 예산(60 s 창 3 회, Node 와 동일) · 요청 안 준비 대기는 요청
상한으로 묶음 · 워밍업 지표를 `worker_init` 로그와 응답 diagnostics 에 실음.

`voiceWorkers.ts`: `ready:false` 명시 처리 · `warmupVoiceBackend` 가 준비 실패를 거절 ·
`STARTUP_TIMEOUT_MS` 90 → 60 s (실측 근거는 코드 주석) · 헬스에 `warmupMs`.

---

## 4. 로컬 검증 — `measured`

### 실제 LAM 워커 (`lam-worker-smoke.py`, GTX 1060)

| | 빈 numba 캐시 (컨테이너 조건) | 캐시 있음 |
|---|---|---|
| spawn → READY | 30,271.8 ms | 12,840.7 ms |
| 모델 로드 | 1,804.8 | 1,790.9 |
| 워밍업 (librosa / 추론) | 19,537.0 (17,447.0 / 2,086.9) | 2,124.0 (1,796.7 / 322.8) |
| **첫 실제 요청 (wall / 추론)** | **196.7 / 171.2 ms** | **83.4 / 77.7 ms** |
| 두 번째 요청 | 105.0 / 99.5 | 83.9 / 78.2 |
| 피크 VRAM (워밍업 후 = 요청 후) | 458,095,616 B | 458,095,616 B |
| 남은 임시 파일 | 0 | 0 |
| 워밍업 fault 주입 | `ready:false / stage warmup / 이유 포함`, exit 3, 임시 파일 0 | |

### 실제 라우트 end-to-end (`local-path.mjs`, 새 워커, 실제 Supertonic + LAM)

| 요청 | HTTP | E2E | TTS | LAM 추론 | 3-way | synth |
|---|---|---|---|---|---|---|
| 첫 (새 워커, 워밍업 포함) | 200 | 41,056 ms | 1,609.6 | **86.0 ms** | ✓ | 1 |
| 둘째 | 200 | 1,429 | 1,246.5 | 95.9 | ✓ | 1 |
| 셋째 | 200 | 1,325 | 1,213.9 | 86.5 | ✓ | 1 |

(Codex 수정 뒤 재실행: 58,740 / 1,952 / 2,616 ms, LAM 234.3 / 88.6 / 91.0 ms — 같은 그림.)
비교: P1 의 워밍업 없는 첫 요청 LAM 은 ~2,051 ms 였다. WAV SHA 는 매 요청 다름.

### 스위트

`npx tsc --noEmit` 0 · `npm test` **76 / 76** · `test_handler_lifecycle.py` **52 / 52**,
`WORKER_TIMEOUT_RECOVERY = PASS`.

---

## 5. 정직한 트레이드오프 (§12)

워밍업은 시간을 **없애지 않고 옮긴다.**

| 구간 | P3 (기준) | 워밍업 후 — `expected` |
|---|---|---|
| WORKER_BOOTSTRAP_MS | 5,289.6 (`measured`) | ≈ 5.3 s + LAM_WARMUP |
| LAM_WARMUP_MS | — | ≈ 15–20 s (컨테이너 numba 컴파일 + CUDA 첫 호출; 로컬 19.5 s) |
| REQUEST_EXECUTION_MS (캐시 콜드) | 18,492 (`measured`) | ≈ 3 s (TTS ~2 s + LAM ~0.1 s) |
| TOTAL_COLD_E2E_MS (캐시 콜드) | 36,088 (`measured`) | **≈ 같음** — 시간이 delayTime 으로 이동 |
| 과금 초 | 컨테이너 생존 | ≈ 같음 — 초기화도 과금됨(§1) |

얻는 것: 요청 실행 시간의 예측 가능성(RunPod 실행 상한·라우트 단계 상한이 보는 값),
FlashBoot 재개 시 이미 워밍업된 프로세스. 얻지 못하는 것: 사용자가 기다리는 총 콜드 시간,
비용. **"18 s → 4 s" 는 실행 시간에만 해당하는 `expected` 이며, 실측되지 않았다.**

### 진짜로 없애는 길 — 승인 필요

numba 는 `librosa.load` 가 끌어온다. `soundfile.read` + `soxr.resample("soxr_hq")` 를 직접
부르면 numba 가 경로에서 빠진다. 로컬 실측(`librosa-equivalence-probe.json`):
- 실제 canonical WAV(cold-2, 45,697 샘플): **비트 단위 동일**, max_abs_diff 0.0
- 1 s 무음: 비트 단위 동일
- 직접 경로 첫 호출 33.4 ms (+ import 183 ms) vs librosa 첫 로드 31,614.6 ms

하지만 이것은 문서화된 전처리(*"the same call LAM's own loader makes at engines/infer.py:121"*)의
구현 교체다. 이번 게이트에서는 **구현하지 않았다.** 적용하면 콜드 총 대기와 과금 초에서
≈15–20 s 가 실제로 빠질 것으로 `expected` 된다.

---

## 6. A/B 설계 (실행하지 않음) — `RUNPOD_WARMUP_AB_TEST = AWAITING_HUMAN_APPROVAL`

이미지 `ghcr.io/beomseok-kim0210/dd-voice:p3c` (digest `sha256:ff82a314…`, 푸시 완료, 무료).
기존 검증 엔드포인트는 그대로(템플릿 미변경). A/B 는 **새 템플릿 + 새 엔드포인트**(검증용
엔드포인트는 프로덕션 재사용 금지 결정과 별개로, 내부 시크릿 노출 때문에 재사용하지 않음).

측정: NEW_WORKER_BOOTSTRAP_MS · NEW_LAM_WARMUP_MS(librosa/infer 분리) · NEW_CACHED_COLD_DELAY_MS ·
NEW_CACHED_COLD_EXECUTION_MS · NEW_CACHED_COLD_E2E_MS · NEW_WARM_EXECUTION_MEDIAN_MS ·
NEW_WARM_LAM_MS · NEW_GPU_PEAK_MEMORY · NEW_EXACT_AUDIO_INVARIANT · NEW_SYNTHESIS_COUNT ·
NEW_SCALE_TO_ZERO. 기준: P3 §4b/§5. 비교는 절대·% 델타와 bootstrap 증가분을 분리해 보고.

예상 비용(`estimated`, §1 의 실측 요율 0.58/h): 콜드 2 회 × ~40 s + 웜 5 회 × ~3 s ≈ 95 s
≈ **$0.015**, 첫 풀 콜드가 끼면 +~$0.03. 예산 1.00 의 5 % 이하.
