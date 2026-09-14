# P3 — RunPod Serverless 유료 검증 실측

2026-09-11. Human 승인 하에 실제 RunPod GPU 를 실행했다. 예산 상한 USD 1.00.
증거 원본: `D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/` (잡별 JSON + WAV).

| 등급 | 뜻 |
|---|---|
| `measured` | RunPod 이 돌려준 값 또는 이 기계에서 잰 값 |
| `official-current` | 오늘 공식 문서/API 에서 읽음 |
| `derived` | 위 둘로 계산 |
| `estimated` | 근거 명시한 추정 |
| `unavailable` | 모른다. 0 으로 대체하지 않는다 |

---

## 1. 이미지 — `measured`

빌드 환경: WSL2 Ubuntu 22.04 (`D:\wsl\ubuntu-dd\ext4.vhdx`), Docker Engine 29.1.3,
buildx 0.30.1. C: 에는 아무것도 쓰지 않았다.

| 항목 | 값 |
|---|---|
| 태그 | `ghcr.io/beomseok-kim0210/dd-voice:p3b` (비공개) |
| 이미지 digest | `sha256:73022e24be6e217a91b79ca51a9f25898c8845c0e627aad6660d3bad15412891` |
| **레지스트리 압축 크기 (amd64, 23 레이어)** | **5,698,113,521 B = 5.70 GB** (p3 기준; p3b 는 +~2 MB) |
| 레이어 합계 (비압축, `docker history`) | ≈ 9.95 GB |
| `docker images` 보고치 (containerd 스토어) | 15.7 GB |
| 최대 레이어 (압축) | LAM venv 2,517,666,447 B · CUDA 라이브러리 1,329,007,358 B · cuDNN 724,962,191 B · Supertonic 모델 373,425,359 B · LAM 체크포인트 369,882,891 B |
| venv 크기 (이미지 안) | `/opt/lam-venv` 4.6 GB · `/opt/supertonic-venv` 237 MB |
| 첫 푸시 소요 | 1 h 40 m (04:26:55Z → 06:07:41Z, 업로드 ~0.6 MB/s) |

이미지 안에서 확인: 두 venv 모두 import 가능(torch 2.1.2+cu121 / numpy 1.26.3 ·
onnxruntime 1.23.2 / numpy 2.2.6), 모델 6 파일 SHA256 = `MODEL-HASHES.md`.

### 첫 이미지(p3)의 결함

첫 콜드 잡이 `LAM_FAILED` 로 실패했다. 원인은 이미지를 WSL 에서 CPU 로 띄워 **무료로**
찾았다: `utils/config.py` 가 `yapf` 를 import 하는데 핀 목록에 없었다. P2 의
`requirements-lam.txt` 는 검증된 venv 의 *일부*였다. 검증된 venv 의 `pip freeze`
(`lam-venv-freeze.txt`) 와의 차집합 39 개를 `requirements-lam-extra.txt` 로 추가
레이어에 얹었다 — 4.86 GB torch 레이어 캐시를 지키기 위해서다. 실제 새로 설치된 것은
8 개(yapf, regex, tomli, zipp, platformdirs, importlib_metadata, filelock, colorama);
나머지는 이미 같은 버전으로 있었다.

---

## 2. GPU — `measured`

| 항목 | 값 |
|---|---|
| 배정된 GPU | **NVIDIA RTX A4500** (RunPod 16 GB 티어 `AMPERE_16` 에서 배정) |
| VRAM 총량 | **20,470 MB** |
| 드라이버 | 580.126.20 |
| `torch.cuda` | 사용 가능, LAM `device = cuda:0` |
| LAM 피크 텐서 할당 | 553,378,816 B (528 MiB) — 로컬 437 MiB 보다 큼 |
| 워커 사양 | 10 vCPU, 30 GB RAM, 컨테이너 디스크 20 GB |
| 워커 레코드 `costPerHr` | 0.25 — 공식 요금표($0.58/hr)와 다르다. 실제 청구는 §6 |

`16GB_GPU_COMPATIBLE = TRUE` — 이 티어에서 LAM 추론이 성공했다. 단, 배정된 카드는
A4500(20 GB) 이었고 A4000(16 GB) 에서는 돌려 보지 못했다. 티어 안의 어느 카드가
오든 VRAM 여유는 30 배 이상이다.

---

## 3. 잡 요약 — 9 건, 실패 1 · 성공 8

| # | 라벨 | 종류 | delayTime | executionTime | 비고 |
|---|---|---|---|---|---|
| 1 | cold-1 | 콜드 (이미지 풀 포함) | 201,587 ms | 2,946 ms | **FAILED** `LAM_FAILED` (yapf) |
| 2 | cold-2 | **콜드 (이미지 풀 포함)** | **179,929 ms** | **18,166 ms** | 첫 성공. `coldStart: true`, init 5,289.6 ms |
| 3 | cold-3 | FlashBoot **재개** (72 s 유휴 후) | 1,761 ms | 2,873 ms | `coldStart: false`, 프로세스 uptime 102.9 s |
| 4–6 | warm-1..3 | 웜 (연속) | 91 / 96 / 99 ms | 2,900 / 2,882 / 2,920 ms | 잡 로그에서 기록. 진단 JSON 은 후처리 오류로 미저장 |
| 7 | vercel-path | **콜드 (이미지 캐시됨)** | **15,988 ms** | **18,492 ms** | 실제 라우트 경유. `coldStart: true`. E2E 36,088 ms |
| 8 | warm-4 | FlashBoot 재개 (23 s 유휴 후) | 1,119 ms | 2,931 ms | tts 2,711.6 · lam 53.2 |
| 9 | warm-4-1 | 웜 (연속) | 91 ms | 2,682 ms | tts 2,169.8 · lam 30.4 |

**모든 성공 잡에서**: 3-way 해시 일치(클라이언트가 도착 바이트를 재해싱), `synthesisCount = 1`,
오디오 251,948 B / 2.8561 s, 타임라인 86 프레임 @ 30 fps, `jawOpenMax` 0.08–0.25,
임계값 이상 프레임 64–81. 같은 문장인데 WAV SHA 가 매번 다르다
(`be021671…`, `00d67589…`, `28dae550…`, `3787e986…`) — flow-matching 비결정성의 실증이자
"발화당 합성 1 회" 불변식이 왜 필요한지의 증거.

---

## 4. 콜드 스타트 — 두 종류가 있다

### 4a. 이미지 풀을 포함한 콜드 — `measured`, n = 2

| 구간 | cold-1 | cold-2 |
|---|---|---|
| 제출 → 컨테이너 시작 (RunPod 스케줄링 + 5.7 GB 풀) | ≈ 193 s | ≈ 176 s |
| 컨테이너 시작 → 두 워커 준비 (`workerInitMs`) | — | 5,289.6 ms |
| ├ Supertonic 모델 로드 | — | 889.3 ms |
| └ LAM 체크포인트 로드 | — | 2,195.2 ms |
| RunPod `delayTime` | 201,587 ms | 179,929 ms |
| 실행 (`executionTime`) | 2,946 (실패) | 18,166 ms |
| ├ TTS 합성 | — | 1,992.4 ms |
| └ LAM 호출 15,839.8 ms 중 추론 | — | **1,710.8 ms** |
| 클라이언트 제출 → 완료 | — | 200,652 ms |

### 4b. 이미지가 호스트에 캐시된 콜드 — `measured`, n = 1

| 구간 | vercel-path |
|---|---|
| RunPod `delayTime` | **15,988 ms** |
| `executionTime` | 18,492 ms (TTS 2,265.3 · LAM 추론 1,721.9) |
| 라우트 E2E | 36,088 ms |

### 4c. FlashBoot 재개 — `measured`, n = 2

유휴 23 s / 72 s 뒤 요청: `delayTime` 1,119 / 1,761 ms, **모델 재로드 없음**
(핸들러 프로세스가 그대로 복원됨 — `coldStart: false`, uptime 연속).
`FLASHBOOT_EFFECT = MEASURED`: 캐시된 이미지 콜드(16 s) 대비 재개 1–2 s.

### 콜드 실행 18 s 의 정체

실행 18.2–18.5 s 중 **LAM 첫 호출이 15.8 s** 인데 추론 자체는 1.7 s 다. 나머지 ~14 s 는
그 GPU 에서의 첫 CUDA 호출 워밍업(커널 로드·cuDNN 초기화·첫 forward)이다. 웜에서는
LAM 호출이 35–58 ms 로 떨어진다. **개선 여지 (미적용)**: `bootstrap()` 에서 무음 wav 로
LAM 을 한 번 돌려 두면 이 14 s 가 사용자 요청 밖(초기화)으로 이동한다. 이것은 합성이
아니므로 "발화당 합성 1 회" 를 건드리지 않는다.

---

## 5. 웜 — `measured`, n = 5 (연속 요청)

| 지표 | min | median | max |
|---|---|---|---|
| `delayTime` | 91 ms | 96 ms | 99 ms |
| `executionTime` | 2,682 ms | 2,900 ms | 2,920 ms |
| TTS 합성 (진단 있는 2 건) | 2,169.8 | — | 2,711.6 ms |
| LAM 추론 (진단 있는 2 건) | 30.4 | — | 53.2 ms |
| 클라이언트 E2E (진단 있는 1 건) | 4,336 ms | | |

웜 실행의 90 % 이상이 Supertonic(CPU ONNX) 합성이다. GPU 는 웜에서 거의 놀고 있다.

---

## 6. 과금 — 확정된 것과 아닌 것

> **2026-09-14 갱신**: billing 레코드가 조회됐다 — amount **USD 0.02228**, timeBilledMs **138,301**,
> 유효 요율 **0.58/h**, 초기화 과금 **PARTIAL**(컨테이너 생존은 과금, 컨테이너 이전 풀/스케줄링은 비과금).
> 정본은 `P3B-BILLING-AND-WARMUP.md` §1. 아래는 P3 당시 기록.

| 항목 | 값 | 등급 |
|---|---|---|
| 계정 잔액 (테스트 후) | USD 32.2334760956 | `measured` |
| `currentSpendPerHr` (테스트 후) | 0 | `measured` — 아무것도 과금 중이 아님 |
| `GET /billing/endpoints` (hour/day, 3 그룹) | **빈 배열** — 테스트 후 1 시간 내 | `unavailable` — 집계 지연 추정 |
| 워커 컨테이너 생존 합계 (레코드 기준) | ≈ 17 + 23 + 27 + 58 = **125 s** | `derived` |
| 이미지 풀/스케줄링 대기 합계 | ≈ 193 + 176 = 369 s | `derived` |
| 워커 레코드 `costPerHr` | 0.25 | `measured` — 요금표 0.58 과 불일치 |
| **GPU 비용 추정** | 125 s × $0.25/h = **$0.0087** · 125 s × $0.58/h = **$0.020** · (125+369) s × $0.58/h = **$0.080** | `derived` — 세 가정 |

`INITIALIZATION_BILLING = UNRESOLVED`: 어느 가정이 맞는지는 billing API 의
`timeBilledMs` 가 채워져야 안다 — 125 s 근처면 초기화 무과금, 500 s 근처면 과금.
지금은 빈 배열이다.

`TOTAL_VERIFICATION_SPEND_USD`: API 상 `unavailable`; 가장 보수적인 파생값 **$0.080**.
어느 가정에서도 상한 1.00 의 8 % 이하다.

### 반복 비용

| 항목 | 값 | 등급 |
|---|---|---|
| 엔드포인트 존재 (워커 0) | `currentSpendPerHr = 0` | `measured` |
| GHCR 비공개 이미지 5.7 GB | **현재 $0** — *"Container image storage and bandwidth for the Container registry is currently free"*, 변경 시 ≥1 개월 전 통지 | `official-current` docs.github.com |
| 〃 정책이 표준 Packages 요율로 바뀌면 | 5.7 GB × $0.25/GB/월 ≈ $1.42/월 | `derived` from github.com/pricing |
| RunPod 컨테이너 디스크/이미지 캐시 | `diskSpaceBilledGb` 행 없음 | `unavailable` |

P2 의 "$1.20/월 고정 저장" 은 **RunPod 컨테이너 디스크 요율을 이미지 저장에 적용한
추정**이었고, 실측에서는 그런 행이 나타나지 않았다. 확정되기 전까지 반복하지 않는다.

---

## 7. scale-to-zero — `measured`

| 사건 | 마지막 잡 완료 | 워커 `Exited by Runpod` | 간격 |
|---|---|---|---|
| cold-1 후 | 06:13:44 | 06:13:49 | 5 s |
| cold-2 후 | 06:30:13 | 06:30:17 | 4 s |
| warm-3 후 | 06:31:49 | 06:31:53 | 4 s |
| warm-4-1 후 | 06:38:28 | 06:38:33 | 5 s |

`SCALE_TO_ZERO_CONFIRMED = TRUE`, `RUNNING_WORKERS_AFTER_TEST = 0`.

**주의**: `/v2/{id}/health` 의 `workers.idle` 은 컨테이너가 종료된 뒤에도 1 로 남는다
(FlashBoot 캐시 슬롯으로 보임). 살아 있음의 근거는 REST 워커 레코드의
`desiredStatus`/`lastStatusChange` 와 핸들러의 `coldStart`/uptime 이지 `/health` 가 아니다.

엔드포인트 생성 직후 잡 없이 워커 1 개가 `initializing` → `throttled` → `EXITED`
(06:08:39, 이미지 pre-pull 로 추정). 이것이 과금됐는지는 §6 과 같은 이유로 `unavailable`.

---

## 8. Vercel 경로 — `measured`

실제 `src/app/api/docent/voice/route.ts` 를 import 해 `POST` 를 직접 호출했다
(키는 프로세스 환경에만; `.env.local` 에 쓰지 않음).

HTTP 200 · `provider: runpod` · `engine: supertonic+lam` · 3-way 해시 일치 ·
`synthesisCount 1` · 응답 본문/헤더에 API 키 **없음** · `fallbackUsed: false`.
`VERCEL_TO_RUNPOD_DEV_PATH = PASS`.

프로덕션 함의: 이 요청은 캐시된-이미지 콜드라 36 s 걸렸다. 이미지 풀 콜드(200 s)였다면
라우트의 130 s 상한과 공급자의 `runsync` 대기(RunPod 기본 ~90 s 뒤 `IN_PROGRESS` 반환)에
걸려 **브라우저 TTS 폴백**이 됐을 것이다. 풀 포함 콜드는 폴백으로 흡수되는 것이 현재
설계이고, 그 설계가 옳다.

---

## 9. 남은 미지수

- billing API 집계 후의 실제 `timeBilledMs` / `amount` → 초기화 과금 여부
- A4000(16 GB) 카드에서의 실행 — 이번엔 A4500 이 배정됨
- FlashBoot 캐시가 유지되는 시간 (72 s 유휴 후에는 재개됐고, ~6 분 뒤에는 캐시된-이미지 콜드였다 — 경계는 그 사이 어딘가)
- 호스트가 이미지 캐시를 버리는 시점 (풀 포함 콜드가 다시 나타나는 조건)
- RunPod 컨테이너 디스크가 서버리스에서 과금되는지
