# RunPod Serverless Flex — 비용 모델과 패키징 분석

> **2026-09-11 갱신**: 이 문서의 추정치 중 상당수가 P3 에서 실측으로 대체됐다 —
> `P3-MEASUREMENTS.md` 가 우선한다. 특히: 이미지 5.70 GB(압축) / 콜드는 두 종류
> (풀 포함 ~180–200 s, 캐시 ~16 s + 실행 18.5 s) / 웜 실행 2.7–2.9 s /
> FlashBoot 재개 1–2 s / "$1.20/월 저장" 은 실측에서 확인되지 않음 / GHCR 은 현재 무료.
> 아래는 P2 시점의 기록으로 남긴다.

작성 2026-09-10. 당시에는 **어떤 RunPod GPU 도 실행하지 않았다**. 여기 있는 숫자 중
RunPod 에서 온 것은 모두 공식 문서를 읽은 값이고, 실행에서 온 것은 모두 이
기계에서 잰 값이다.

모든 숫자에 출처 등급을 붙인다.

| 등급 | 뜻 |
|---|---|
| `official-current` | 오늘(2026-09-10) 공식 문서/API 에서 직접 읽음 |
| `measured` | 이 기계에서 실제로 재서 얻음 |
| `derived` | 위 두 가지로 계산 |
| `estimated` | 근거를 명시한 추정. 실측 아님 |
| `unavailable` | 값을 모른다. **0 으로 대체하지 않는다** |

---

## 1. 공식 요금 — `official-current`

runpod.io/pricing, 2026-09-10 열람.

| GPU 클래스 | VRAM | 시간당 | 초당 (derived) |
|---|---|---|---|
| A4000 / A4500 / RTX 4000 / RTX 2000 Ada | 16 GB | $0.58 | $0.00016111 |
| L4 / A5000 / 3090 | 24 GB | $0.69 | $0.00019167 |
| RTX 4090 | 24 GB | $1.10 | $0.00030556 |

docs.runpod.io/serverless/endpoints/endpoint-configurations 는 A4000 을
**$0.00016/sec** 로 적는다 — 위 시간당 요금과 반올림 수준에서 일치한다.

저장소 (`official-current`, docs.runpod.io/serverless/pricing):
컨테이너 디스크 **~$0.10/GB/month**, 네트워크 볼륨 **$0.07/GB/month (<1TB)**.

기본값 (`official-current`, endpoint-configurations):
Active workers **0** · Max workers **3** · Idle timeout **5 s** ·
Execution timeout **600 s** (범위 5 s ~ 7 일) · FlashBoot **기본 활성**.

---

## 2. 공식 문서 두 곳이 서로 어긋난다 — 반드시 보고할 사항

같은 질문에 두 페이지가 반대로 답한다.

- `docs.runpod.io/serverless/workers/overview` — 워커 수명주기 표에서
  **Initializing = No billing**, **Idle = No billing**.
- `docs.runpod.io/serverless/pricing` — *"You're billed from when a worker starts
  until it fully stops, rounded up to the nearest second."* 그리고 과금 구간으로
  **"Start time — Initializing the container and loading models"**, **"Execution
  time"**, **"Idle timeout duration"** 셋을 명시적으로 나열한다.

이 시스템은 콜드 스타트가 잦은 쪽(scale-to-zero, 산발적 방문)이므로 이 차이가
그대로 비용 차이가 된다. **아래 계산은 보수적인 쪽(pricing 페이지 = 초기화도
과금)을 주 모델로 삼고**, 낙관 모델을 함께 적는다. 실제 어느 쪽인지는 첫 유료
실행의 청구 내역으로만 확정할 수 있다 — 그때까지 `unavailable` 이다.

---

## 3. 측정값 — `measured`

이 기계(로컬 GPU, Windows), 오늘 실행분.

| 항목 | 값 | 비고 |
|---|---|---|
| 웜 요청 전체 준비 | 1,452 / 1,609 / 2,223 ms | 3 표본, 같은 문장 |
| 그중 Supertonic 합성 | 1,065 / 1,081 / 2,007 ms | |
| 그중 LAM 추론 | 158 / 332 / 440 ms | |
| 재컴파일 직후 첫 요청 | 9,415 ms | 이상치. 숨기지 않고 적는다 |
| 콜드 경로(두 워커 병렬 기동) | 13,211 ms | P1 실측 |
| Supertonic 모델 로드 | 2,772.1 ms | |
| LAM 체크포인트 로드 | 1,865.5 ms | |
| LAM 피크 VRAM | 458,095,616 B (437 MiB) | `peak_vram_allocated` |
| 오디오 2.86 s → WAV | 251,948 B | 44.1 kHz mono PCM_16 |
| 타임라인 | 86 프레임 @ 30 fps | |

주의: 이 GPU 는 RunPod 의 어떤 클래스도 아니다. 아래 RunPod 지속시간은 전부
`estimated` 이며, 이 값들을 근거로만 쓴다.

---

## 4. 이미지 크기 — 구성요소는 `measured`, 합계는 `estimated`

이 기계에 Docker 가 없어 이미지를 빌드할 수 없었다. 따라서 합계는 실측이 아니다.

| 구성요소 | 크기 | 등급 |
|---|---|---|
| `nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04` (amd64, 레지스트리 압축) | 2,143,932,503 B (2,045 MiB) | `official-current` — Docker Hub API |
| `torch==2.1.2+cu121` linux x86_64 cp310 휠 (압축) | 2,200,673,027 B (2,099 MiB) | `official-current` — download.pytorch.org |
| Supertonic 모델 (ONNX 4 개 + voice style) | 398,653,124 B (380 MiB) | `measured` |
| LAM 체크포인트 `.tar` | 408,538,564 B (390 MiB) | `measured` |
| LAM 소스 트리 | 11,122,235 B (10.6 MiB) | `measured` |
| Supertonic venv site-packages (Windows) | 194,664,735 B (186 MiB) | `measured` — Linux 대리값 |
| LAM venv site-packages (Windows) | 5,108,160,048 B (4,872 MiB) | `measured` — 그중 torch 4,309 MiB |

**추정 최종 이미지: 10 ~ 13 GB (압축 해제 기준)** — `estimated`.
근거: 베이스 이미지 압축 해제분 + LAM venv(설치본이 휠보다 크다) + Supertonic
venv + 모델 780 MB. 폭이 넓은 이유는 (a) Linux torch 설치본을 재지 못했고
(b) 레이어 압축률을 모르기 때문이다. **정확한 값은 첫 빌드에서만 나온다.**

압축된 레지스트리 크기, 콜드 풀 시간, RunPod 의 이미지 크기 상한: `unavailable`.

### 크기를 줄일 수 있는 곳 (아직 적용하지 않음)

- LAM 은 추론만 한다. `torch` 대신 `torch` 그대로 두되 `sklearn`(36 MiB),
  `llvmlite`+`numba`(136 MiB) 가 정말 필요한지 확인할 여지가 있다 — `librosa` 가
  끌고 온다.
- `nvidia/cuda:...-runtime` 은 이미 devel 이 아닌 런타임 이미지다. 더 줄이려면
  `torch` 의 CUDA 번들과 베이스 이미지 CUDA 가 겹치는 부분을 정리해야 하는데,
  이는 검증된 조합을 깨뜨릴 위험이 있어 **하지 않았다**.

---

## 5. GPU 클래스 — 후보는 `derived`, 최소값은 `unavailable`

```
MINIMUM_COMPATIBLE_GPU_CLASS = unavailable
CANDIDATE_GPU_CLASS          = 16 GB (A4000 / A4500 / RTX 4000 / RTX 2000 Ada)
```

**"최소 호환 클래스" 를 지금 확정할 수 없다.** RunPod 의 어떤 GPU 도 돌려 보지
않았고, 실측한 437 MiB 는 *torch 가 할당한 텐서의 피크*이지 프로세스 전체의 VRAM
점유가 아니다. 거기에는 CUDA 컨텍스트, cuDNN 워크스페이스, 단편화, 그리고 해당
아키텍처에서의 커널 가용성이 빠져 있다. 그것들은 실제로 그 GPU 위에서 돌려 봐야
알 수 있다.

후보로 가장 싼 16 GB 클래스를 고른 근거는 이것이다:
- LAM 피크 텐서 할당 실측 **437 MiB** (`measured`).
- torch CUDA 컨텍스트 오버헤드 `estimated` 300–600 MiB.
- Supertonic 은 `onnxruntime` CPU 실행 경로다 — VRAM 을 쓰지 않는다 (`measured`:
  Supertonic 워커는 CUDA 를 초기화하지 않는다).
- 합쳐도 16 GB 에 크게 못 미친다. 여유가 10 배 이상이므로 **VRAM 때문에 더 비싼
  클래스를 살 이유는 보이지 않는다.**

진짜 제약은 VRAM 이 아니라 **콜드 스타트**로 보이며, 그것은 GPU 등급이 아니라
이미지 크기와 모델 로드 시간이 정한다 — 그러나 이 역시 RunPod 위에서 재기 전에는
`estimated` 다. 첫 유료 콜드 테스트에서 이 절을 실측으로 바꾼다.

---

## 6. 월 비용 시나리오

가정 (전부 명시):
- 질문 1 개 = 잡 1 개.
- 웜 실행 **W = 2.0 s** — `measured` 1.45–2.22 s 의 상단 근처.
- 콜드 오버헤드 **C = 20 s** — `estimated`, 범위 15–35 s.
  근거: 로컬 두 워커 병렬 기동 13.2 s(`measured`) + 컨테이너 기동과 CUDA 초기화
  (`unavailable`, 재보지 못함). FlashBoot 이 이를 줄인다고 공식 문서가 말하지만
  **얼마나 줄이는지는 `unavailable`** 이라 반영하지 않았다.
- Idle timeout **I = 5 s** (공식 기본값).
- GPU = 16 GB 클래스, $0.00016111/s.

### 모델 A — 보수적 (초기화 과금, pricing 페이지)

포트폴리오 방문자는 드문드문 온다. 최악 가정: **모든 질문이 각자 콜드 스타트**.
질문당 = C + W + I = 27 s.

| 월 질문 수 | 과금 초 | GPU 비용 |
|---|---|---|
| 10 | 270 | **$0.04** |
| 100 | 2,700 | **$0.44** |
| 500 | 13,500 | **$2.18** |
| 1,000 | 27,000 | **$4.35** |

### 모델 B — 낙관적 (초기화 무과금, workers/overview)

질문당 = W + I = 7 s.

| 월 질문 수 | 과금 초 | GPU 비용 |
|---|---|---|
| 10 | 70 | **$0.01** |
| 100 | 700 | **$0.11** |
| 500 | 3,500 | **$0.56** |
| 1,000 | 7,000 | **$1.13** |

### 저장소

컨테이너 디스크 12 GB × $0.10/GB/month ≈ **$1.20/month** (`derived`,
이미지 크기가 `estimated` 이므로 이 값도 추정이다). 질문이 0 건인 달에도 든다면
이것이 고정비이고, 위 GPU 비용보다 클 수 있다 — 월 100 질문 시나리오에서는
저장소가 GPU 보다 비싸다.

**요약: 이 트래픽 규모에서 지배적인 비용은 연산이 아니라 이미지 저장이다.**

---

## 7. Idle timeout 을 올리는 것이 이득인가 — `derived`

직관과 반대다. idle timeout 을 T 초로 올리면 세션 하나가 T 초를 더 문다. 그 대가로
아끼는 것은 방지된 콜드 스타트 하나당 C = 20 s 다.

따라서 **T 초 인상은 그것이 T/C 개 이상의 콜드 스타트를 막을 때만 이득**이다.

사람이 답변을 듣고 다음 질문을 타이핑하는 데 보통 20–60 초가 걸린다. 세션당
5 질문을 웜으로 붙들려면 idle 을 60 초쯤 둬야 하는데, 그러면 세션당 60 s 를 더
내고 콜드 스타트 4 개(80 s)를 아낀다 — 아슬아슬하게 이득이지만, 질문 1 개만 하고
떠나는 방문자에게는 60 s 를 그냥 버린다.

포트폴리오 트래픽은 "한 명이 한두 개 묻고 떠난다" 에 가깝다. 그래서
**기본값 5 초를 유지하고 콜드 스타트를 받아들이는 쪽을 권한다.** 이 결론은 실제
방문 패턴이 관측되면 다시 봐야 한다 — 지금 그 데이터는 `unavailable` 이다.

---

## 8. 자동 비활성화 — 운영상 함정 (`official-current`)

endpoint-configurations 는 이렇게 적는다:

> After 3 days with no requests, the endpoint's max workers is reduced to 2.
> After 7 days with no requests, max workers is set to 0.

포트폴리오는 며칠씩 방문이 없을 수 있다. **일주일 조용하면 엔드포인트가 스스로
0 워커가 되어 사실상 꺼진다.** 그 상태에서 온 첫 방문자는 음성이 실패하고
브라우저 TTS 폴백으로 내려간다.

대응은 둘 중 하나이며, 어느 쪽도 아직 하지 않았다:
1. 주기적으로 아주 싼 요청을 넣어 살려 둔다 — 그 자체가 과금이다.
2. 폴백이 조용히 동작하는 것을 정상으로 받아들인다 — 지금 설계가 이미 그렇다.

권장은 2 번이다. 도슨트는 음성이 없어도 말한다.

---

## 9. 취소 의미론 — §36 (`official-current` + 명시적 공백)

공식 문서에서 확인된 것:

- `/cancel/{job_id}` 는 *"Stop a job in progress or waiting in the queue."*
- `CANCELLED` = *"The job was manually cancelled using the `/cancel/job_id`
  endpoint before completion."*
- `TIMED_OUT` = *"The job either expired before it was picked up by a worker or
  the worker failed to report back before reaching the timeout threshold."*
- `/purge-queue` 는 *"Clear all pending jobs from the queue"* — 대기 중인 잡만이다.
- 결과 보존: async `/run` 30 분, sync `/runsync` 1 분.

**공식 문서가 답하지 않는 것** (`unavailable`, 추측하지 않는다):
- 이미 실행 중인 핸들러가 취소로 *중단되는지*. 문서는 잡의 최종 상태만 정의하고
  워커 쪽에서 무엇이 끊기는지는 말하지 않는다.
- 취소된 잡의 과금이 어디서 멈추는지.

따라서 설계는 **취소가 연산을 멈추지 않는다고 가정한다.** 브라우저가 요청을
끊어도 Vercel 라우트는 RunPod 잡을 취소하지 않고, 취소하더라도 GPU 가 풀린다고
믿지 않는다. 실제 상한은 취소가 아니라 **Execution timeout** 이다. 런어웨이 잡의
비용 상한은 그 값이 정한다 — 기본 600 s 는 이 워크로드(웜 2 s)에 비해 과도하게
길다. **권장: 실행 상한을 120 s 로 낮춘다.** 콜드 35 s + 최장 발화 여유를 덮으면서,
잘못된 잡 하나가 물 수 있는 최대 금액을 $0.019 로 묶는다.

---

## 10. 이 문서가 확정하지 못하는 것

| 항목 | 상태 |
|---|---|
| 실제 이미지 크기(압축/비압축) | `unavailable` — Docker 없음 |
| RunPod 콜드 스타트 실측 | `unavailable` — 유료 실행 필요 |
| FlashBoot 이 실제로 줄이는 시간 | `unavailable` |
| 초기화 과금 여부 (문서 모순) | `unavailable` — 첫 청구서로만 확정 |
| 취소가 실행 중 핸들러를 끊는지 | `unavailable` — 문서에 없음 |
| 이 엔드포인트의 실제 방문 패턴 | `unavailable` |

이 중 어느 것도 0 으로 대체하지 않았다.

---

## 11. 첫 유료 콜드 테스트 1 회의 예상 비용

Human 승인이 있을 때에만 실행한다.

| 항목 | 값 |
|---|---|
| GPU 클래스 | 16 GB, $0.00016111/s |
| 콜드 오버헤드 | 20 s (`estimated`, 15–35 s) |
| 실행 | 2 s (`measured` 기반) |
| Idle | 5 s (기본값) |
| 과금 초 | 27 s (범위 22–42 s) |
| **GPU 비용** | **$0.0044** (범위 $0.0035 – $0.0068) |

여기에 이미지가 처음 저장될 때의 컨테이너 디스크 비용이 붙는다 — 12 GB 기준
월 $1.20 의 일할분. 첫 테스트를 몇 번 반복해도 GPU 비용은 센트 단위이며,
**실질 비용은 이미지를 올려 두는 것 자체**다.
