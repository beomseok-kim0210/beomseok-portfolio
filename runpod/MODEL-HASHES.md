# 이미지에 구워지는 모델 아티팩트 — SHA256

2026-09-10 측정 (`measured`). Dockerfile 이 `models/supertonic-3`,
`models/lam`, `models/LAM_Audio2Expression` 로 복사하는 것들의 원본이다.

이 목록의 쓸모는 하나다: **이미지 안의 모델이 로컬에서 검증한 바로 그 모델인지**를
빌드 후에 확인할 수 있게 하는 것. 다른 가중치가 들어가면 목소리도 표정도 달라지고,
그때는 지금까지의 측정값이 전부 무의미해진다.

빌드한 이미지에서 확인하려면:

```bash
docker run --rm dd-voice:1 sh -c 'sha256sum /models/supertonic-3/onnx/*.onnx /models/lam/*.tar'
```

## Supertonic 3 (voice style M1)

| 파일 | 바이트 | sha256 |
|---|---|---|
| `onnx/vector_estimator.onnx` | 256,534,781 | `883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c` |
| `onnx/vocoder.onnx` | 101,424,195 | `085de76dd8e8d5836d6ca66826601f615939218f90e519f70ee8a36ed2a4c4ba` |
| `onnx/text_encoder.onnx` | 36,416,150 | `c7befd5ea8c3119769e8a6c1486c4edc6a3bc8365c67621c881bbb774b9902ff` |
| `onnx/duration_predictor.onnx` | 3,700,147 | `c3eb91414d5ff8a7a239b7fe9e34e7e2bf8a8140d8375ffb14718b1c639325db` |
| `voice_styles/M1.json` | 291,748 | `e35604687f5d23694b8e91593a93eec0e4eca6c0b02bb8ed69139ab2ea6b0a5b` |
| `onnx/unicode_indexer.json` | 277,676 | `9bf7346e43883a81f8645c81224f786d43c5b57f3641f6e7671a7d6c493cb24f` |
| `onnx/tts.json` | 8,253 | `42078d3aef1cd43ab43021f3c54f47d2d75ceb4e75f627f118890128b06a0d09` |
| `config.json` | 174 | `4099082b107a9d4029849ac76b89eca65e03732660969c2babe5bf308c7357f2` |

디렉터리 합계 398,653,124 B (380 MiB).

**`voice_styles/M1.json` 이 특히 중요하다.** 이것이 사람이 고른 목소리다 — M2 작업
내내 쓰였고 이 게이트에서도 Human 이 승인한 그 음색이다. 이 파일이 바뀌면 도슨트가
다른 사람 목소리로 말한다.

## LAM Audio2Expression

| 파일 | 바이트 | sha256 |
|---|---|---|
| `lam_audio2exp_streaming.tar` | 408,538,564 | `38084d471966381f2e52d9f59e5654c9b8cde6fa36d4c6f18fc02cbaf593d157` |

이 체크포인트가 wav2vec2 인코더 가중치까지 전부 공급한다. 그래서 콜드 스타트에
네트워크가 필요 없다 (`runpod/README.md` 참고).

## 얼굴 (이미지에는 들어가지 않는다 — 브라우저가 받는다)

| 파일 | 바이트 | sha256 |
|---|---|---|
| `docent-qka2-m213-subdivonly.glb` | 9,347,776 | `ac666799ee8ff710afe0abfbfb3f19d1522dc8687707656fd2394e92d38b927e` |

M2.13 원본. **파괴적으로 덮어쓰지 않는다.** 이 게이트 종료 시점에 해시 재확인 완료.
