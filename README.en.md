# Beomseok Portfolio — Digital Docent

[한국어](./README.md) · [English](./README.en.md)

> **A conversational portfolio that understands the page, retrieves evidence, answers with grounding, and explains through voice and a 3D avatar.**
>
> This repository contains Beomseok Kim's portfolio site and **Digital Docent**, the conversational interface embedded throughout it. Digital Docent is not just a chatbot. It combines page context, evidence retrieval, grounded generation, voice synthesis, audio-driven facial animation, and a persistent 3D avatar into one runtime.

---

## 1. Why Digital Docent

As a portfolio grows, visitors have to open more pages and manually search for implementation details, technology choices, troubleshooting records, and outcomes.

Digital Docent reduces that navigation cost.

For example, while viewing the Hangarae project, a visitor can ask:

> “How did you improve the model accuracy?”  
> “What was the hardest part of this project?”  
> “How is this different from ARMI?”

The Docent uses the current page as context, but it does not simply send visible DOM text to the model. The server validates PageContext, retrieves evidence from structured portfolio sources, and generates answers from that evidence.

---

## 2. Core Experience

Digital Docent connects the full interaction pipeline:

```text
Visitor question
   ↓
Current page context (PageContext)
   ↓
Portfolio evidence retrieval (RAG)
   ↓
Grounded LLM response
   ↓
Streaming text
   ↓  only when Voice is ON
Supertonic TTS
   ↓
Single canonical WAV
   ├─ audio playback
   └─ LAM Audio-to-Expression
          ↓
Korean-aware mouth fusion
          ↓
M2.13 3D Avatar + Hologram Chamber
```

The Docent is mounted once at the root layout, so conversation, avatar state, and voice state persist across route changes.

---

## 3. Architecture

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

Three design principles drive the system:

1. **Evidence comes first.** Portfolio facts are retrieved from repository sources rather than assumed from the model's memory.
2. **Text and voice are separated.** A visitor who only wants text does not wake the GPU voice worker.
3. **Playback and facial animation share one synthesis result.** The audio sent to the browser and the audio analyzed for facial motion come from the same canonical synthesis.

---

## 4. PageContext-aware RAG

The current retrieval system is not vector search.

The accurate description is **lexical BM25 RAG with page-context priors**.

### Retrieval pipeline

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

PageContext contains values such as `pathname`, `projectSlug`, and the currently visible `sectionId`. The server derives and validates page identity again before using it as a retrieval hint.

### Corpus

The corpus is generated deterministically from the same structured data used by the portfolio UI.

| Metric | Value |
| --- | ---: |
| Chunks | 207 |
| Total characters | 40,610 |
| Chunking | project × section × semantic item |
| Vector DB | Not used |
| Embedding API | Not used |

### Initial retrieval evaluation

A fixed 64-question evaluation set was used.

| Configuration | Hit@1 | Hit@3 | Hit@5 | MRR | Wrong Project |
| --- | ---: | ---: | ---: | ---: | ---: |
| Naive BM25 | 0.241 | 0.483 | 0.517 | 0.368 | 27% |
| Korean lexical | 0.586 | 0.845 | 0.931 | 0.729 | 18% |
| + Entity prior | 0.638 | 0.862 | 0.897 | 0.763 | 12% |
| + Page prior | 0.759 | 0.931 | 0.948 | 0.855 | 0% |
| **Final lexical RAG** | **0.828** | **0.948** | **0.966** | **0.885** | **0%** |

Detailed retrieval design and evaluation artifacts are available in [`docs/rag`](./docs/rag/README.md).

---

## 5. Grounded Answer Generation

Retrieved chunks are passed through a grounding contract before generation.

When an LLM provider is available:

```text
identity
+ page context
+ answer rules
+ retrieved evidence [E1..E6]
→ streaming LLM response
```

When no LLM provider is available, the system can still answer through an evidence-based fallback path.

Internal source paths, provenance fields, and chunk metadata stay server-side. The client receives only the source descriptors needed for the UI.

---

## 6. Persistent Global Runtime

Early versions of the Docent lived inside individual pages, so navigation recreated the avatar and conversation.

The current architecture mounts `GlobalDocent` once in the root layout.

```text
Root Layout
 └─ GlobalDocent
     ├─ persistent conversation
     ├─ persistent avatar
     ├─ voice state
     └─ PageContext refresh on route change
```

This allows the user to move between projects while continuing the same conversation.

On desktop, the Docent behaves as a sidecar. Smaller screens use a separate responsive layout so the portfolio itself remains usable.

---

## 7. Voice — Supertonic + RunPod

Voice is intentionally decoupled from text generation.

### Principles

- Voice OFF: no voice-worker wake-up
- Voice ON: best-effort prewarm at the earliest useful signal
- TTS: **Supertonic M1**
- Production GPU: **RunPod Serverless Flex**
- Scale-to-zero retained
- Server-only API credentials never enter the browser bundle

### Long-answer routing

Long text is split at sentence boundaries and synthesized in ordered segments.

```text
answer
 → segment 1 → Supertonic → play
 → segment 2 → prefetch → play
 → segment 3 → ...
```

The production path does not depend on automatic browser speech-synthesis fallback for normal operation.

---

## 8. Korean-aware Lip Sync

The first lip-sync mapping consumed only a small subset of LAM's 52 channels. Korean speech therefore suffered from closed-mouth mumbling, weak vowel contrast, and a trade-off between vowel opening and bilabial closure.

The current pipeline uses a semantic layer on top of LAM:

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

### Vowel assistance

- `ㅣ / ㅡ`: stronger horizontal spread
- `ㅗ / ㅜ`: stronger rounding
- unrounded vowels: suppress accidental rounding
- `ㅏ / ㅓ / ㅐ ...`: vowel-conditioned jaw opening assistance

The text-aligned layer does not fully replace LAM with fixed visemes. It provides bounded assistance when the raw LAM signal does not produce enough visual distinction.

### Korean diphthongs

`ㅘ · ㅙ · ㅚ · ㅝ · ㅞ · ㅟ` are modeled as trajectories instead of static mouth poses.

Examples:

```text
ㅙ : rounded onset → ㅐ shape
ㅞ : rounded onset → ㅔ shape
ㅘ : rounded onset → ㅏ shape
ㅝ : rounded onset → ㅓ shape
ㅟ : rounded onset → ㅣ shape
```

The alignment source is currently **same-synthesis NFKD jamo-token timing**, not phoneme forced alignment.

### Final human calibration

The current Phase 4D production target uses:

| Parameter | Final target |
| --- | ---: |
| Vowel jaw opening scale | 0.75 |
| Perceptual mouth lead | **80 ms** |
| Diphthong glide | enabled |
| Bilabial protection | enabled |

The 80 ms value is a **visual mouth lead**, not an audio delay. It was selected by human visual review so articulation preparation appears natural rather than late.

---

## 9. 3D Avatar and Hologram Chamber

Digital Docent uses the M2.13 head asset.

Main semantic morph families include:

- `jawOpen`
- `mouthRound`
- `mouthStretch`
- `jawOpenCorrective`
- `mouthShrugUpper`
- blink and emotion morphs

The surrounding hologram chamber is a real React Three Fiber scene rather than a flat CSS decoration.

```text
physical projector
  → emitter
  → beam / particles
  → energy collar
  → neck materialization
  → avatar
```

The scene combines a projection cylinder, funnel beam, energy collar, materializing neck shader, particles, and directional lighting into one visual system.

---

## 10. Tech Stack

| Area | Technology |
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
| Validation | Node test runner, TypeScript, ESLint, production build gates |

---

## 11. Repository Structure

```text
src/
├─ app/
│  ├─ api/docent/          # chat / voice routes
│  └─ projects/ai-docent/  # Digital Docent case-study page
├─ features/docent/        # global UI, avatar runtime, hologram scene
├─ lib/docent/             # RAG, page context, mouth/timeline logic
└─ data/                   # portfolio ground-truth data

docs/
└─ rag/                    # RAG design + evaluation artifacts

runpod/                    # production voice worker
public/models/             # avatar assets
scripts/                   # evaluation / maintenance scripts
tests/                     # regression and behavior tests
```

Exact paths may evolve with the implementation; the source tree is the final authority.

---

## 12. Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The website and text path can be developed without local voice models.

Running the full local Supertonic + LAM pipeline requires separate Python runtimes and model paths.

Important environment variables are documented in `.env.example`.

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

> `RUNPOD_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY` are server-only values. Do not expose them with a `NEXT_PUBLIC_` prefix.

---

## 13. Video CDN

Large portfolio videos are not committed directly because of GitHub's single-file size limits.

Production Vercel environments should define:

```env
NEXT_PUBLIC_ARMI_FULL_VIDEO=https://beomdda.sirv.com/video/ARMI_video_portfolio.mp4
NEXT_PUBLIC_HANGARAE_FULL_VIDEO=https://beomdda.sirv.com/video/%ED%96%89%EA%B0%80%EB%9E%98_video_fortpolio.mp4
```

Local full-length video files stay ignored and are served through the CDN instead.

---

## 14. Validation Philosophy

Digital Docent is not considered complete just because it “looks like it works.”

Important changes are evaluated with combinations of:

- fixed retrieval evaluation sets
- wrong-project regression checks
- unsupported-question behavior
- canonical audio identity
- synthesis count
- bilabial closure
- vowel articulation
- lip/audio timing
- real-app 1× human review
- TypeScript checks
- ESLint
- full test suite
- production builds

Lip-sync work in particular uses blind A/B human review in addition to numeric metrics.

---

## 15. Known Limitations

### Avatar asset
The current GLB cannot reproduce realistic inner-mouth depth and teeth visibility under large jaw opening. This is an asset-level limitation rather than something that can be fully corrected with timing or gain changes.

### Alignment
Vowel and diphthong assistance currently uses same-synthesis jamo-token alignment rather than phoneme forced alignment. Korean expressions with large orthography-to-pronunciation differences may benefit from a future G2P or forced-alignment stage.

### Retrieval
The current RAG system is lexical. Dense/vector retrieval was not added because the measured evaluation set did not justify the extra complexity yet.

### Cold start
The production voice worker keeps scale-to-zero enabled, so a fully cold request still includes RunPod GPU allocation and container startup time. Explicit voice activation is used as an early prewarm signal to reduce perceived latency.

---

## 16. Major Projects in This Repository

- **Digital Docent** — context-aware conversational portfolio
- **ARMI** — bedside Voice AI Care Robot
- **Hangarae** — AIoT rehabilitation assistant
- **Wedding AI** — generative-AI virtual wedding-dress fitting
- **Crime Scene** — 3D AI murder mystery
- **Claw Dev** — multi-agent personal AI lab

Digital Docent acts as the conversational layer that connects these projects and their evidence.

---

## 17. Direction

The goal is not merely to build “a 3D character that talks.”

The project aims to make four layers feel like one system:

```text
Context
+ Evidence
+ Conversation
+ Embodied Interaction
```

Understand the page. Retrieve evidence. Explain clearly. Speak and animate only when useful.

That full loop is Digital Docent.
