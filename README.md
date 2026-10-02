# Beomseok Portfolio — Digital Docent

[한국어](./README.md) · [English](./README.en.md)

> **페이지를 읽고, 근거를 찾아 답하고, 목소리와 표정으로 설명하는 대화형 포트폴리오.**
>
> 이 저장소는 김범석의 개인 포트폴리오 사이트와 그 안에서 동작하는 **Digital Docent**를 함께 담고 있습니다. Digital Docent는 단순 챗봇이 아니라, 사용자가 현재 보고 있는 페이지 문맥을 이해하고 포트폴리오 내부 근거를 검색한 뒤, 텍스트·음성·3D 얼굴 애니메이션까지 하나의 흐름으로 연결하는 인터페이스입니다.

---

## 1. 왜 만들었나

프로젝트가 많아질수록 방문자는 더 많은 페이지를 열고, 기술 스택·트러블슈팅·성과를 직접 찾아야 합니다.

Digital Docent의 목표는 이 탐색 비용을 줄이는 것입니다.

예를 들어 방문자가 행가래 프로젝트를 보고 있는 상태에서 다음처럼 질문할 수 있습니다.

> “정확도를 어떻게 올렸어요?”  
> “이 프로젝트에서 가장 어려웠던 점은?”  
> “ARMI와 비교하면 어떤 차이가 있나요?”

도슨트는 현재 페이지를 힌트로 사용하되, 화면의 텍스트를 그대로 모델에 넘기지 않습니다. 서버가 검증한 PageContext와 포트폴리오의 구조화된 원문을 기반으로 관련 근거를 검색하고 답변합니다.

---

## 2. 핵심 경험

Digital Docent는 다음 흐름을 하나의 런타임으로 연결합니다.

```text
사용자 질문
   ↓
현재 페이지 문맥(PageContext)
   ↓
포트폴리오 근거 검색(RAG)
   ↓
근거 기반 LLM 응답
   ↓
텍스트 스트리밍
   ↓  Voice ON일 때만
Supertonic TTS
   ↓
canonical WAV 1회 생성
   ├─ 실제 오디오 재생
   └─ LAM Audio-to-Expression
          ↓
Korean-aware mouth fusion
          ↓
M2.13 3D Avatar + Hologram Chamber
```

페이지가 바뀌어도 도슨트는 루트 레이아웃에 한 번만 마운트되어 대화, 아바타, 음성 상태를 유지합니다.

---

## 3. 전체 아키텍처

```mermaid
flowchart TD
    U[Visitor] --> PC[PageContext]
    PC --> API[/api/docent/chat]
    API --> V[Context Validation]
    V --> R[Lexical RAG\nBM25 + Entity/Page/Section Prior]
    R --> G[Grounded Prompt]
    G --> LLM[LLM Provider]
    R --> E[Evidence Fallback]
    LLM --> S[Streaming Text]
    E --> S
    S --> UI[Global Docent UI]

    UI -->|Voice ON| TTS[Supertonic M1]
    TTS --> WAV[Canonical WAV]
    WAV --> PLAY[Playback]
    WAV --> LAM[LAM Audio-to-Expression]
    LAM --> MOUTH[Korean-aware Mouth Fusion]
    MOUTH --> AVATAR[M2.13 Avatar]
    AVATAR --> H[Hologram Projection Chamber]
```

설계 원칙은 세 가지입니다.

1. **근거가 먼저다.** 모델이 포트폴리오 사실을 기억해서 답하는 것이 아니라, 저장소 안의 근거를 검색해 답합니다.
2. **텍스트와 음성을 분리한다.** 텍스트 질문만 하는 사용자는 GPU 음성 워커를 깨우지 않습니다.
3. **얼굴 움직임은 오디오와 같은 합성 결과를 사용한다.** 재생용 음성과 립싱크용 입력이 서로 다른 합성을 사용하지 않습니다.

---

## 4. PageContext-aware RAG

현재 구현은 벡터 검색이나 임베딩 검색이 아닙니다.

정확한 구조는 **BM25 기반 lexical RAG + 페이지 문맥 prior**입니다.

### 검색 파이프라인

```text
question
  ↓
Korean preprocessing / 2-gram / alias expansion
  ↓
BM25
  × entity prior
  × page prior
  × section prior
  × source priority
  ↓
Top evidence
  ↓
support gate
```

PageContext는 `pathname`, `projectSlug`, 현재 보이는 `sectionId` 정도만 전달합니다. 서버는 pathname을 기준으로 다시 검증하며, 알 수 없는 프로젝트나 섹션 값은 검색 힌트에서 제외합니다.

### 코퍼스

RAG 코퍼스는 사이트가 실제 렌더링하는 구조화된 데이터에서 결정론적으로 생성합니다.

| 항목 | 값 |
| --- | ---: |
| Chunk 수 | 207 |
| 총 글자 수 | 40,610 |
| 청킹 방식 | 프로젝트 × 섹션 × 의미 단위 구조 청킹 |
| Vector DB | 사용하지 않음 |
| Embedding API | 사용하지 않음 |

### 초기 retrieval 평가

64개 질문으로 구성한 고정 평가셋 기준입니다.

| 설정 | Hit@1 | Hit@3 | Hit@5 | MRR | Wrong Project |
| --- | ---: | ---: | ---: | ---: | ---: |
| Naive BM25 | 0.241 | 0.483 | 0.517 | 0.368 | 27% |
| Korean lexical | 0.586 | 0.845 | 0.931 | 0.729 | 18% |
| + Entity prior | 0.638 | 0.862 | 0.897 | 0.763 | 12% |
| + Page prior | 0.759 | 0.931 | 0.948 | 0.855 | 0% |
| **Final lexical RAG** | **0.828** | **0.948** | **0.966** | **0.885** | **0%** |

상세 설계와 원본 평가 결과는 [`docs/rag`](./docs/rag/README.md)에 정리되어 있습니다.

---

## 5. Grounded Answer Generation

검색 결과는 바로 사용자에게 보여주지 않고, 근거 계약을 거쳐 응답 생성에 사용합니다.

LLM을 사용할 수 있는 경우:

```text
identity
+ page context
+ answer rules
+ retrieved evidence [E1..E6]
→ LLM streaming response
```

LLM provider가 없거나 사용할 수 없는 경우에도 검색 결과 자체를 이용하는 evidence fallback 경로가 남아 있습니다.

내부 source path, provenance, chunk metadata는 서버 내부에서만 사용하고, 클라이언트에는 필요한 source descriptor만 전달합니다.

---

## 6. Global Runtime

처음 버전의 도슨트는 페이지 내부에 존재해 라우트 이동마다 아바타와 대화가 다시 생성되었습니다.

현재는 `GlobalDocent`가 루트 레이아웃에 한 번만 마운트됩니다.

```text
Root Layout
 └─ GlobalDocent
     ├─ persistent conversation
     ├─ persistent avatar
     ├─ voice state
     └─ PageContext refresh on route change
```

따라서 사용자는 프로젝트 페이지를 이동하면서도 같은 대화를 이어갈 수 있습니다.

도슨트가 열려 있을 때도 포트폴리오 본문 자체를 축소하거나 별도 페이지로 이동시키는 것이 아니라, 데스크톱에서는 sidecar 형태로 동작하고 작은 화면에서는 별도 레이아웃 규칙을 사용합니다.

---

## 7. Voice — Supertonic + RunPod

음성은 텍스트 응답과 분리되어 있습니다.

### 원칙

- Voice OFF: 음성 워커를 깨우지 않음
- Voice ON: 필요한 시점에만 prewarm
- TTS: **Supertonic M1**
- Production GPU: **RunPod Serverless Flex**
- Scale-to-zero 유지
- 서버 전용 API key는 브라우저 번들에 포함하지 않음

### 긴 답변 처리

긴 텍스트는 문장 경계를 기준으로 여러 segment로 나눠 순차 재생합니다.

```text
answer
 → segment 1 → Supertonic → play
 → segment 2 → prefetch → play
 → segment 3 → ...
```

자동 browser speech synthesis fallback에 의존하지 않고, Supertonic 경로의 실패는 명시적으로 처리합니다.

---

## 8. Korean-aware Lip Sync

초기 립싱크는 LAM 52개 출력 중 소수 채널만 사용해 한국어 발화에서 입이 계속 닫혀 보이거나, ㅂ/ㅁ 폐쇄와 모음 개방을 동시에 만족하지 못하는 문제가 있었습니다.

여러 단계의 실험을 통해 현재 구조는 단순한 `audio → jawOpen` 매핑이 아니라 다음 의미 계층을 사용합니다.

```text
LAM mouth signal
  + bilabial closure gate
  + vowel spread / round / unround assist
  + vowel-conditioned jaw opening
  + diphthong trajectory
  ↓
semantic mouth fusion
  ↓
M2.13 morph targets
```

### 모음 보조

- `ㅣ / ㅡ` : 가로 벌림 강화
- `ㅗ / ㅜ` : 원순 형태 강화
- 평순 모음 : 불필요한 rounding 억제
- `ㅏ / ㅓ / ㅐ ...` : 모음별 턱 개방 목표 보조

LAM 신호를 완전히 덮어쓰는 고정 viseme 방식이 아니라, LAM이 부족한 구간만 모음 정렬 정보로 보완합니다.

### 복합모음

`ㅘ · ㅙ · ㅚ · ㅝ · ㅞ · ㅟ`는 하나의 고정 pose로 처리하지 않고, 원순 onset에서 핵모음 형태로 이동하는 trajectory로 처리합니다.

예:

```text
ㅙ : round onset → ㅐ shape
ㅞ : round onset → ㅔ shape
ㅘ : round onset → ㅏ shape
ㅝ : round onset → ㅓ shape
ㅟ : round onset → ㅣ shape
```

현재 정렬은 phoneme forced alignment가 아니라 **same-synthesis NFKD jamo token timing**을 활용합니다.

### 최종 human calibration

Phase 4D에서 사람 눈으로 검토한 최종 production 기준은 다음과 같습니다.

| 항목 | 최종 기준 |
| --- | ---: |
| Vowel jaw opening scale | 0.75 |
| Perceptual mouth lead | **80 ms** |
| Diphthong glide | 활성 |
| Bilabial protection | 활성 |

80ms는 오디오 파일 자체를 지연시키는 값이 아니라, 사람이 보기에 자연스러운 발화 준비 동작을 만들기 위한 **visual mouth lead**입니다.

---

## 9. 3D Avatar와 Hologram Chamber

도슨트는 M2.13 head asset을 사용합니다.

주요 semantic morph 계층:

- `jawOpen`
- `mouthRound`
- `mouthStretch`
- `jawOpenCorrective`
- `mouthShrugUpper`
- blink / emotion morphs

아바타 주변은 단순 CSS 장식이 아니라 React Three Fiber 장면으로 구성한 projection chamber입니다.

```text
physical projector
  → emitter
  → beam / particles
  → energy collar
  → neck materialization
  → avatar
```

Fresnel projection cylinder, funnel beam, energy collar, neck dissolve/materialization, particle flow, rim light 등을 하나의 투사 현상처럼 연결했습니다.

---

## 10. 기술 스택

| 영역 | 기술 |
| --- | --- |
| Web | Next.js 15, React 19, TypeScript |
| 3D | Three.js, React Three Fiber, Drei |
| Motion | Framer Motion, GSAP |
| Retrieval | BM25, Korean lexical preprocessing, PageContext prior |
| LLM | OpenAI / Anthropic provider abstraction |
| TTS | Supertonic M1 |
| Audio-to-Expression | LAM |
| GPU Runtime | RunPod Serverless Flex |
| Deployment | Vercel |
| Testing | Node test runner, TypeScript, ESLint, production build gates |

---

## 11. 저장소 구조

```text
src/
├─ app/
│  ├─ api/docent/          # chat / voice routes
│  └─ projects/ai-docent/  # Digital Docent case study page
├─ features/docent/        # global UI, avatar runtime, hologram scene
├─ lib/docent/             # RAG, context, mouth/timeline logic
└─ data/                   # portfolio ground-truth data

docs/
└─ rag/                    # RAG design + evaluation artifacts

runpod/                    # production voice worker
public/models/             # avatar assets
scripts/                   # evaluation / maintenance scripts
tests/                     # regression and behavior tests
```

세부 경로는 기능 진화에 따라 달라질 수 있으며, 실제 소스가 최종 기준입니다.

---

## 12. 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

기본 사이트와 텍스트 경로는 음성 모델 없이도 개발할 수 있습니다.

로컬에서 Supertonic + LAM 음성 파이프라인까지 실행하려면 각각의 Python runtime과 모델 경로가 추가로 필요합니다.

주요 환경변수는 `.env.example`에 계약 형태로 정의되어 있습니다.

```env
DOCENT_VOICE_BACKEND=local

# Local voice
DD_SUPERTONIC_PYTHON=
DD_SUPERTONIC_MODEL_DIR=
DD_LAM_PYTHON=
DD_LAM_SRC=
DD_LAM_CKPT=

# Production voice
RUNPOD_ENDPOINT_ID=
RUNPOD_API_KEY=

# LLM
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DOCENT_MODEL=

# Public video CDN
NEXT_PUBLIC_ARMI_FULL_VIDEO=
NEXT_PUBLIC_HANGARAE_FULL_VIDEO=
```

> `RUNPOD_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`는 서버 전용 값입니다. `NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다.

---

## 13. 영상 CDN

대용량 포트폴리오 영상은 GitHub의 단일 파일 제한 때문에 저장소에 직접 커밋하지 않습니다.

Production Vercel 환경에 다음 공개 URL 변수를 설정합니다.

```env
NEXT_PUBLIC_ARMI_FULL_VIDEO=https://beomdda.sirv.com/video/ARMI_video_portfolio.mp4
NEXT_PUBLIC_HANGARAE_FULL_VIDEO=https://beomdda.sirv.com/video/%ED%96%89%EA%B0%80%EB%9E%98_video_fortpolio.mp4
```

로컬 대용량 원본은 Git에서 제외하고 CDN을 통해 제공합니다.

---

## 14. 검증 원칙

Digital Docent는 "동작한다"는 인상만으로 완료 처리하지 않습니다.

주요 변경마다 다음을 확인합니다.

- retrieval fixed evaluation set
- wrong-project regression
- unsupported question behavior
- canonical audio identity
- synthesis count
- bilabial closure
- vowel articulation
- lip/audio timing
- 실제 앱 1배속 human review
- TypeScript
- ESLint
- full test suite
- production build

특히 립싱크는 숫자만으로 결론내리지 않고 실제 1배속 영상의 블라인드 A/B 검토를 함께 사용했습니다.

---

## 15. 알려진 한계

### Avatar asset
현재 GLB의 inner-mouth / teeth 구조는 큰 턱 개방에서 실제 사람처럼 치아와 구강 깊이를 충분히 표현하지 못합니다. 이는 타이밍이나 LAM gain만으로 해결하기 어려운 자산 레벨의 한계입니다.

### Alignment
모음/복합모음 보조에 사용하는 timing은 phoneme forced alignment가 아니라 same-synthesis jamo-token alignment입니다. 발음 변화가 큰 한국어 표현은 별도 G2P/forced alignment가 더 적합할 수 있습니다.

### Retrieval
현재 RAG는 lexical 방식입니다. 현재 평가셋에서는 충분한 성능을 보였기 때문에 dense/vector retrieval을 추가하지 않았습니다.

### Cold start
Production voice worker는 scale-to-zero를 사용하므로 완전히 식은 상태에서는 RunPod GPU 할당/컨테이너 기동 시간이 존재합니다. 명시적인 Voice 활성화 시점의 prewarm으로 체감 지연을 줄입니다.

---

## 16. 이 저장소에 포함된 주요 프로젝트

- **Digital Docent** — Context-aware conversational portfolio
- **ARMI** — 병상 보조 Voice AI Care Robot
- **행가래** — AIoT 재활 보조 시스템
- **Wedding AI** — 생성형 AI 기반 웨딩드레스 가상 피팅
- **Crime Scene** — 3D AI Murder Mystery
- **Claw Dev** — Multi-Agent Personal AI Lab

Digital Docent는 이 프로젝트들의 문서와 근거를 하나의 대화형 탐색 인터페이스로 연결합니다.

---

## 17. 현재 방향

이 프로젝트의 목표는 "3D 캐릭터가 말하는 포트폴리오"가 아닙니다.

목표는 다음 네 요소가 서로 끊기지 않는 **grounded conversational interface**를 만드는 것입니다.

```text
Context
+ Evidence
+ Conversation
+ Embodied Interaction
```

페이지를 이해하고, 근거를 찾고, 설명하고, 필요할 때 목소리와 얼굴로 전달하는 것.

그 전체 흐름이 Digital Docent입니다.
