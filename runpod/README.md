# RunPod Serverless Flex 패키징

Digital Docent 의 음성/표정 런타임을 scale-to-zero GPU 워커로 싸는 것들.

**상태 (2026-09-11, P3)**: 이미지를 빌드·푸시했고 (`ghcr.io/beomseok-kim0210/dd-voice:p3b`,
비공개, 5.70 GB 압축), Human 승인 하에 RunPod Flex 엔드포인트에서 실제 GPU 검증을
마쳤다 — `P3-MEASUREMENTS.md`. **프로덕션 배포는 아직 아니다.** 커밋도 아직 없다.
2026-09-14: 과금 확정(USD 0.0223, 0.58/h) · LAM 워밍업을 bootstrap 으로 이동(로컬 검증 완료,
RunPod A/B 는 승인 대기) — `P3B-BILLING-AND-WARMUP.md`.
같은 날 P3-C: librosa 를 프로덕션 경로에서 제거(`voice/lam_audio.py`, 비트 동일 11/11), 후보 이미지 `p3d` — `P3C-SOUNDFILE-SOXR.md`.

```
handler.py                 오케스트레이터. 두 venv 워커를 띄우고 잡을 처리한다
Dockerfile                 하나의 이미지, 두 개의 venv, 모델은 각자 레이어에
requirements-supertonic.txt  검증된 venv 에서 그대로 뽑은 핀
requirements-lam.txt         〃
requirements-handler.txt     runpod SDK
endpoint-config.json       엔드포인트에 넣을 값과 그 근거 (자동 적용 아님)
COST-MODEL.md              요금·이미지 크기·시나리오. 출처 등급이 붙어 있다
MODEL-HASHES.md            이미지에 굽는 모델의 sha256
P3-MEASUREMENTS.md         실제 RunPod GPU 실측 — 콜드/웜/과금/scale-to-zero
P3B-BILLING-AND-WARMUP.md  과금 정산(확정) + LAM bootstrap 워밍업 로컬 게이트 (2026-09-14)
P3C-SOUNDFILE-SOXR.md      LAM 전처리에서 librosa 제거 — 11 표본 비트 동일, 로컬 게이트 (2026-09-14)
requirements-lam-extra.txt 검증된 venv freeze 와의 차집합 (P3 에서 발견한 yapf 누락)
lam-venv-freeze.txt, supertonic-venv-freeze.txt   검증된 venv 의 pip freeze 원본
p3/                        P3 드라이버 (p3.mjs), 진단, Vercel 경로 시험
TEST-MATRIX.md             25 항목. 돌린 것과 안 돌린 것
test_handler_lifecycle.py  타임아웃·크래시·복구를 실제로 돌리는 테스트
```

## 왜 컨테이너 하나에 venv 둘인가

Supertonic 은 `onnxruntime` + `numpy 2.2.6`, LAM 은 `torch 2.1.2+cu121` +
`numpy 1.26.3` 을 요구한다. 한 인터프리터에 넣을 수 없다.

그렇다고 서비스를 둘로 쪼개지도 않는다. 이 시스템 전체가 서 있는 불변식이
**"듣는 소리와 LAM 이 본 소리가 같은 생성물"** 이기 때문이다. Supertonic 은
flow-matching 이라 같은 문장을 두 번 합성하면 두 개의 다른 목소리가 나온다
(`core.py:458` 이 시드 없이 `np.random.randn` 을 뽑는다). 갈래가 갈라지는 지점에
네트워크 홉을 넣을 이유가 없다.

그래서 이미지는 하나, 파이썬 환경은 둘, 그 사이를 잇는 것은 이 프로세스다.

## 왜 모델을 이미지에 굽는가

scale-to-zero 엔드포인트에서 idle timeout 이 5 초라면, 방문 간격이 그보다 긴 요청은
전부 콜드 스타트를 문다. 이 사이트의 실제 방문 간격은 아직 관측한 적이 없으므로
"거의 모든 요청" 은 관측이 아니라 **추정 시나리오**다 (COST-MODEL §6). 다만 어느
쪽이든, 콜드 스타트마다 780 MB 를 내려받는 것은 네트워크가 나쁘면 실패하고 좋으면
돈이 된다. 모델은 각자의
레이어에 들어가 있어 코드를 고쳐도 그 레이어는 다시 빌드되지 않는다.

`HF_HUB_OFFLINE=1` 을 켠 것은 확인된 사실 때문이다: LAM 설정은
`pretrained_encoder_path='facebook/wav2vec2-base-960h'` 를 가리키지만
`models/network.py:40-45` 는 `os.path.exists()` 로 분기하고, 그 문자열은 디스크
경로가 아니므로 **else 가지**가 돈다 — 로컬 `configs/wav2vec2_config.json` 으로
인코더 구조를 만들고 가중치는 체크포인트가 전부 공급한다. 네트워크가 필요 없다.
오프라인을 강제하면 이 사실이 깨졌을 때 조용히 다운로드하는 대신 크게 실패한다.

## 빌드

빌드 컨텍스트는 저장소 루트다. 아래 경로가 있어야 한다:

```
voice/                        두 워커 스크립트 (로컬과 동일)
runpod/handler.py
models/supertonic-3/          ONNX 4 개 + voice style M1
models/lam/                   lam_audio2exp_streaming.tar
models/LAM_Audio2Expression/  추론 소스 트리
```

```bash
docker build -t dd-voice:1 -f runpod/Dockerfile .
```

이 기계에는 Windows 쪽 Docker 가 없다. 빌드는 WSL2(`ubuntu-dd`, VHD 는 `D:\wsl\`)
안의 Docker Engine 으로 한다. 실측 크기는 `P3-MEASUREMENTS.md` §1.

## 로컬에서 확인할 수 있는 것

GPU 도 RunPod 계정도 없이 돌아간다. 과금이 생기지 않는다.

```bash
PYTHONIOENCODING=utf-8 python runpod/test_handler_lifecycle.py
```

마지막 줄이 `WORKER_TIMEOUT_RECOVERY = PASS` 여야 한다.

## 배포 — 프로덕션은 아직

P3 에서 검증용 엔드포인트(`dd-voice-p3`, workersMin 0)를 만들어 실측했다. 워커가 0 이면
`currentSpendPerHr = 0` 이었다. 프로덕션 롤아웃은 별도 승인 사항이다. 순서:

1. 이미지를 빌드해 레지스트리에 올린다 → **여기서 실제 이미지 크기를 기록**하고
   COST-MODEL §4 의 추정을 실측으로 바꾼다.
2. `endpoint-config.json` 의 값으로 Flex 엔드포인트를 만든다.
3. RunPod 대시보드 환경변수에 그 파일의 `env` 를 넣는다. **API 키는 여기가 아니라
   Vercel 쪽에 들어간다** — 워커는 자기 키를 알 필요가 없다.
4. Vercel 에 `DOCENT_VOICE_BACKEND=runpod`, `RUNPOD_ENDPOINT_ID`,
   `RUNPOD_API_KEY` 를 넣는다. 셋 다 서버 전용이다. `NEXT_PUBLIC_` 을 붙이지 않는다.
5. 첫 콜드 요청 한 번을 보내고 `delayTime` / `executionTime` 을 기록한다.
   예상 비용은 COST-MODEL §11 에 있다.

## 비밀

이 디렉터리의 어떤 파일에도 API 키나 엔드포인트 ID 를 적지 않는다.
`handler.py` 는 RunPod 키를 알지 못하고 알 필요도 없다 — 인증은 Vercel 라우트와
RunPod API 사이에서만 일어난다. 브라우저는 둘 다 보지 못한다.
