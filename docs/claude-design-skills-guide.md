# 🎨 디자이너 클로드 스킬 10 — 활용 가이드

> 디자이너·비전공자를 위한 Claude 디자인 스킬 10선 — 언제 어떻게 쓰는지 상세 가이드.
>
> 각 스킬: **한 줄 정의 · 언제 쓰나 · 활용법 1~5 · 복붙용 프롬프트 예시.**
>
> **범례** — ✅ 핵심 7 (패캠 코스 채택) · ◐ 선택 3 (상황별). FC 단계: Phase P Stage 1·6 + Stage 9 QA.

**관련 문서**
- 도구 스택 `AI_마케팅_스킬_정의.md` → "디자인 품질 스킬"
- 강의 챕터 `디자인_품질_레이어_챕터.md`
- 티저 캐러셀 `Systems/Instagram Carousel/.../claude-skills-designers`

---

## 01 · UI/UX Pro Max ✅

**한 줄:** 스타일·팔레트·폰트페어·컴포넌트까지 완성형 디자인 시스템을 즉석에서 뽑아주는 디자인 인텔리전스. (50+ 스타일, 161 팔레트, 57 폰트페어, 12 스택)

**repo:** `github.com/nextlevelbuilder/ui-ux-pro-max-skill` · ★91k · FC: Stage 6 / `02_Landing`·`07_App_UI`

**언제 쓰나**
- 랜딩·대시보드·앱 화면을 처음부터 디자인할 때
- 무드만 있고 디자인 시스템(팔레트·폰트·스페이싱)이 없을 때
- 일관된 컴포넌트 세트가 필요할 때

**활용법**
1. 랜딩페이지 디자인 시스템 생성 (스타일 + 팔레트 + 폰트페어 + 스페이싱 스케일)
2. SaaS 대시보드 화면 설계 (50+ 스타일 중 무드에 맞게 선택)
3. 브랜드 무드 → 폰트 페어링 추천 (57개 페어 중 + 선택 이유)
4. 컴포넌트 세트(버튼·카드·폼) 코드로 출력 (React/Tailwind 등 12개 스택)
5. 기존 페이지를 특정 스타일(글래스모피즘·브루탈리즘·미니멀 등)로 리스타일

**프롬프트 예시**
```
핀테크 대시보드를 디자인해줘. 신뢰감 있는 무드, 다크/라이트 토글, 카드형 레이아웃.
디자인 시스템(팔레트·폰트페어·스페이싱)부터 컴포넌트 코드(React+Tailwind)까지 한 번에.
```
```
이 랜딩을 'editorial minimal' 스타일로 다시 디자인. 어울리는 폰트 페어 3개 + 각각 선택 이유.
```

---

## 02 · Frontend Design ✅

**한 줄:** 코드 쓰기 전에 뻔한 AI 디폴트(Inter·Roboto·보라 그라데이션·중앙정렬 템플릿)를 차단하고 차별화된 비주얼 방향을 강제하는 Anthropic 공식 스킬.

**repo:** `github.com/anthropics/skills` (frontend-design) · 공식 · FC: Stage 6 / `02_Landing`

**언제 쓰나**
- 결과물이 "AI 티" 날 때
- 차별화된 타이포·레이아웃이 필요할 때
- 포트폴리오·브랜드 사이트처럼 인상이 중요한 화면

**활용법**
1. 랜딩 히어로를 에디토리얼·비대칭 레이아웃으로
2. 금지 폰트·클리셰 색(보라 그라데이션 등) 차단 규칙 적용
3. 디스플레이 서체 기반 타이포 위계 설계
4. 포트폴리오 사이트 톤 차별화
5. 기존 "제네릭" 시안 리뷰 → 구체적 개선 지시

**프롬프트 예시**
```
포트폴리오 랜딩 디자인. Inter/Roboto·보라 그라데이션·중앙정렬 템플릿 금지.
에디토리얼 세리프 + 비대칭 그리드 + 한 컬러 액센트로.
```
```
이 시안이 왜 'AI 티'가 나는지 짚어주고, 차별화된 방향 3개를 레이아웃·타이포 단위로 제안해줘.
```

---

## 03 · Web Design Guidelines (Vercel) ✅

**한 줄:** 내 UI 코드를 접근성·성능·UX 100+룰로 감사하고 고칠 곳을 `file:line`으로 짚어주는 Vercel 스킬.

**repo:** `github.com/vercel-labs/agent-skills` · ★19k · FC: **Stage 9 QA** / `02_Landing`

**언제 쓰나**
- 랜딩·사이트 배포 전 QA
- 접근성(WCAG) 점검이 필요할 때
- 코드 리뷰를 자동화하고 싶을 때

**활용법**
1. 랜딩 코드 전체 접근성(a11y) 감사
2. 대비·포커스링·터치타깃 등 접근성 픽스
3. 시맨틱 HTML 점검 (div→button 등)
4. 성능·UX 안티패턴 탐지
5. PR 전 자동 리뷰 게이트로 사용

**프롬프트 예시**
```
이 랜딩 컴포넌트들을 Web Interface Guidelines 기준으로 감사해줘.
file:line으로 이슈 + 수정안. 심각도순 정렬.
```
```
접근성 이슈만 추려서 WCAG 기준(레벨 AA) 명시하고, 각각 한 줄 수정 코드까지.
```

---

## 04 · canvas-design ✅

**한 줄:** 포스터·인쇄물·정적 비주얼을 실제 미적 원칙(그리드·위계·여백) 위에서 PNG·PDF로 만들어주는 Anthropic 공식 스킬. (생성형 이미지 아님 — '디자인된' 정적물)

**repo:** `github.com/anthropics/skills` (canvas-design) · 공식 · FC: Stage 6 / `03_CardNews`·`04_Posters`

**언제 쓰나**
- 포스터·배너·카드뉴스가 필요할 때
- 인쇄용 PDF가 필요할 때
- 타이포그래피 중심의 '디자인된' 정적 이미지

**활용법**
1. 이벤트 포스터 (타이포 중심 + 그리드)
2. IG 카드뉴스 슬라이드 세트
3. 배너·광고 크리에이티브
4. 인쇄용 PDF (재단·여백 고려)
5. 텍스트만으로 가는 타이포그래피 포스터

**프롬프트 예시**
```
재즈 공연 포스터. 큰 세리프 타이포, 코랄 원 포인트, 그리드 기반 비대칭. A3 PDF로.
```
```
신제품 런칭 IG 카드뉴스 5장. 통일된 그리드 + 한 컬러 액센트, 슬라이드마다 다른 구도.
```

---

## 05 · Color Expert ✅

**한 줄:** OKLCH·OKLAB 색공간으로 팔레트를 생성하고 대비·접근성(WCAG/APCA)까지 자동 점검하는 컬러 사이언스 스킬.

**repo:** `github.com/meodai/skill.color-expert` · FC: Stage 1 / `00_Brand` design-system

> ⚠️ **주의:** 브랜드 정체성을 읽고 '이 브랜드엔 이 색'을 골라주는 *선택 컨설턴트는 아님*. 시드 컬러(brand-dna에서)를 주면 접근성 맞는 시스템으로 확장·검증해주는 도구. 브랜드 팔레트 *선택*은 **#01 UI/UX Pro Max**가 더 가깝다.

**언제 쓰나**
- 브랜드 팔레트를 접근성까지 맞춰 정리할 때
- 시드 컬러 1개를 풀 팔레트로 확장할 때
- 텍스트/배경 대비 검증

**활용법**
1. 시드 1색 → 조화로운 OKLCH 램프/팔레트
2. 텍스트·배경 대비 AA·AAA 검증
3. 다크모드 대응 색 변환
4. 색 네이밍·문서화 (design-system.md)
5. 안료 혼합·색채사 등 심화 질의

**프롬프트 예시**
```
#E84B2C를 시드로 OKLCH 6단계 램프 생성. 각 단계 hex + 크림(#F2EBDA) 배경 대비비 + AA 여부.
```
```
이 팔레트를 다크모드로 변환하되, 본문 텍스트 대비 4.5:1 이상 보장해줘.
```

---

## 06 · Figma → Code ◐ 선택

**한 줄:** 피그마 프레임을 디자인 시스템(토큰·컴포넌트) 그대로 프로덕션 코드로, 반대로 화면을 피그마 레이어로도 옮겨주는 OpenAI 공식 스킬.

**repo:** `github.com/openai/skills` · 공식 · FC: 선택 (코스는 HTML-first라 Figma 트랙 추가 시)

**언제 쓰나**
- 피그마 핸드오프가 있을 때
- 디자인 ↔ 코드 왕복이 필요할 때

**활용법**
1. 피그마 프레임 → React/Tailwind 코드
2. 디자인 토큰(스페이싱·컬러) 매핑 유지
3. 컴포넌트 단위 변환
4. 라이브 UI → 편집 가능한 피그마 레이어 (Send to Figma)
5. 디자인-코드 드리프트 점검

**프롬프트 예시**
```
이 피그마 프레임을 우리 토큰(스페이싱·컬러) 그대로 React+Tailwind로 변환해줘.
```
```
지금 렌더된 이 페이지를 편집 가능한 피그마 레이어로 보내줘.
```

---

## 07 · Motion / 3D — 웹 모션 (≠ 영상) ◐ 선택

**한 줄:** **영상(MP4)을 만드는 게 아니라, 웹사이트를 '움직이게' 만드는 스킬.** 버튼에 반응하고, 스크롤하면 요소가 나타나고, 마우스로 3D를 돌리는 — 그런 '코드'를 짜준다. (GSAP·Three.js·Framer Motion·Lottie·Rive 등 27개)

**repo:** `github.com/freshtechbro/claudedesignskills` · FC: 선택 (랜딩 히어로 웹 인터랙션)

> 🔑 **'영상'이랑 헷갈리지 마세요**
>
> - 코스의 Kling·Veo·Seedance = 프롬프트 → 완성된 **영상 파일(MP4)**. 릴스로 업로드하는 그거.
> - 이 스킬 = 웹페이지 안에서 **살아 움직이는 인터랙션**. 영상 파일이 아니라 '움직이는 사이트'. (필요하면 화면녹화로 영상화는 가능하지만 본 용도는 아님)
> - 한 줄 비유: Veo는 **영상을 찍고**, 이건 **사이트에 생명을 넣는다**.

**언제 쓰나**
- 랜딩 히어로 인터랙션·스크롤 애니메이션
- 3D 프로덕트 뷰어
- 웹 마이크로 인터랙션

**활용법**
1. 히어로 진입 애니메이션 (GSAP/Framer Motion)
2. 스크롤 트리거 시퀀스
3. 3D 프로덕트 뷰어 (R3F/Three.js)
4. Lottie/Rive 마이크로 인터랙션
5. Spline 씬 임베드

**프롬프트 예시**
```
랜딩 히어로에 GSAP 타임라인 진입 애니메이션. 텍스트 스태거 + 이미지 패럴럭스.
```
```
제품 이미지를 R3F로 360° 회전 뷰어로 만들어줘. 드래그 회전 + 자동 회전.
```

---

## 08 · algorithmic-art ✅

**한 줄:** p5.js로 플로우 필드·파티클·노이즈 기반 제너러티브 아트를 만들어 스톡 같지 않은 유니크 비주얼을 뽑는 Anthropic 공식 스킬.

**repo:** `github.com/anthropics/skills` (algorithmic-art) · 공식 · FC: Stage 6 / `08_Social`·`06_Carousel`

**언제 쓰나**
- 소셜·배경 비주얼이 필요할 때
- 브랜드 컬러 기반 추상 배경
- 스톡/뻔한 이미지를 피하고 싶을 때

**활용법**
1. 브랜드 컬러 플로우 필드 배경
2. 파티클 시스템 비주얼
3. 반복되지 않는 제너러티브 패턴
4. 발표·썸네일 추상 배경
5. 시드별 변형 시리즈 (무한 변주)

**프롬프트 예시**
```
크림·코랄·오렌지 톤 플로우 필드 배경 1080×1350. 차분한 곡선 흐름, 과하지 않게.
```
```
브랜드 3색으로 파티클 제너러티브 아트, 시드를 바꿔 5종 변형으로.
```

---

## 09 · Hand-Drawn Diagrams ◐ 선택

**한 줄:** 아키텍처·플로우·UX를 손그림(Excalidraw) 스타일 다이어그램 + 애니메이션 SVG로 그려주는 스킬.

**repo:** `github.com/muthuishere/hand-drawn-diagrams` · FC: 선택 (카드뉴스 도식·강의 슬라이드)

**언제 쓰나**
- 개념·플로우를 시각화할 때
- 카드뉴스 설명 도식
- 강의 슬라이드 개념도

**활용법**
1. 유저 플로우·온보딩 다이어그램
2. 시스템 아키텍처 스케치
3. 강의 개념도 (손그림 톤으로 친근하게)
4. 카드뉴스 설명 도식
5. 애니메이션 SVG로 단계별 reveal

**프롬프트 예시**
```
로그인 인증 플로우를 손그림 다이어그램으로. User→Login→Verify→Dashboard, Verify를 강조.
```
```
이 온보딩 3단계를 애니메이션 SVG로 순차 등장하게.
```

---

## 10 · impeccable ✅

**한 줄:** 브랜드/프로덕트 두 모드 + 23개 커맨드로 디자인 시스템 일관성(토큰·반경·폰트·스페이싱)을 점검·교정하는 스킬.

**repo:** `github.com/pbakaus/impeccable` (Paul Bakaus, ex-Figma) · FC: **Stage 9 QA** / `00_Brand`

**언제 쓰나**
- 산출물 전반 브랜드 일관성 감사
- 토큰 드리프트(반경·폰트·색)를 잡을 때
- 출고 전 최종 QA

**활용법**
1. 전체 산출물 브랜드 오딧 (점수 산출)
2. 버튼 반경·스페이싱 불일치 탐지
3. 폰트·컬러 토큰 위반 교정
4. 브랜드 모드 vs 프로덕트 모드 점검
5. design-system.md 기준 강제 적용

**프롬프트 예시**
```
이 컴포넌트들 브랜드 일관성 감사해줘. 토큰·반경·폰트 위반을 점수와 함께, 항목별로.
```
```
design-system.md를 기준으로 안 맞는 곳을 찾아 자동 교정 제안까지.
```

---

## 한눈에 — 단계별 배치

| FC 단계 | 스킬 |
| --- | --- |
| **Stage 1 · 00_Brand** | Color Expert |
| **Stage 6 · 제작** | UI/UX Pro Max · Frontend Design · canvas-design · algorithmic-art |
| **Stage 9 · QA** | Web Design Guidelines · impeccable |
| **선택 (상황별)** | Figma→Code · Motion/3D · Hand-Drawn Diagrams |

---

## 부록 — 빠른 색인

| # | 스킬 | 구분 | repo | FC 단계 |
| --- | --- | --- | --- | --- |
| 01 | UI/UX Pro Max | ✅ 핵심 | `nextlevelbuilder/ui-ux-pro-max-skill` (★91k) | Stage 6 |
| 02 | Frontend Design | ✅ 핵심 | `anthropics/skills` (frontend-design, 공식) | Stage 6 |
| 03 | Web Design Guidelines | ✅ 핵심 | `vercel-labs/agent-skills` (★19k) | Stage 9 QA |
| 04 | canvas-design | ✅ 핵심 | `anthropics/skills` (canvas-design, 공식) | Stage 6 |
| 05 | Color Expert | ✅ 핵심 | `meodai/skill.color-expert` | Stage 1 |
| 06 | Figma → Code | ◐ 선택 | `openai/skills` (공식) | 선택 |
| 07 | Motion / 3D | ◐ 선택 | `freshtechbro/claudedesignskills` | 선택 |
| 08 | algorithmic-art | ✅ 핵심 | `anthropics/skills` (algorithmic-art, 공식) | Stage 6 |
| 09 | Hand-Drawn Diagrams | ◐ 선택 | `muthuishere/hand-drawn-diagrams` | 선택 |
| 10 | impeccable | ✅ 핵심 | `pbakaus/impeccable` | Stage 9 QA |
