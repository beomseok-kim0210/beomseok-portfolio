# 큐레이션 코퍼스 핸드오프 형식

도슨트가 아는 사실의 **내용**은 이 저장소 밖(Notion 정본 페이지 · Evidence · Evaluation · GitHub 구현을 교차 검증하는
큐레이션 단계)에서 정리해 아래 형식으로 넘긴다. 이 저장소는 그것을 **검증 → 정규화 → 중복 제거 → 스냅샷**으로 만들고
BM25 + 문서 임베딩에 넣는다. 런타임은 Notion·GitHub 를 직접 검색하지 않는다. 코퍼스 저술과 검색 구현은 분리돼 있다.

## 넘기는 위치와 모양 (권장)

```
docs/rag/curated-corpus/
  manifest.json            # schemaVersion · packageId · generatedBy · generatedAt · entities[] · secretAllowlist?
  chunks/
    armi.json              # 엔티티(프로젝트)마다 파일 하나 — CanonicalChunk 배열
    hangarae.json
    profile.json
    ...
```

- 엔티티별 파일로 나누면 리뷰 diff 가 프로젝트 단위로 읽히고, 한 프로젝트만 고쳐 다시 넘기기 쉽다.
- JSON(코드 아님): 외부 세션이 만든 산출물을 실행하지 않고 스키마로만 검사한다.
- 단일 파일(`docs/rag/curated-corpus.json`, 패키지 전체)도 받는다: `npm run docent:corpus -- --input docs/rag/curated-corpus.json`.
- 스키마: [curated-corpus.schema.json](curated-corpus.schema.json). 빈 템플릿: [curated-corpus-template/](curated-corpus-template/).

## 필드 요약

| 객체 | 필수 | 뜻 |
|---|---|---|
| entity | `id, canonicalName, aliases[], type, status, public` (+`pathname`) | 엔티티 등록부. `aliases` 는 질문 속 이름을 엔티티로 푸는 용도(엔티티 해소)일 뿐, 의도 라우팅에 쓰지 않는다. 다른 엔티티와 별칭이 겹치면 오류 |
| chunk | `id, entityId, factType, status, public, title, content, provenance[≥1]` (+`projectId, tags, supersedes, updatedAt`) | 사실 하나. `id` 는 안정 ID(소문자·숫자·`:._-`) |
| provenance | `sourceType, sourceRef` (+`sourceRevision, notionPageId, notionSection, path, lastVerifiedAt`) | 어디서 왔는가. notion 은 `notionPageId` 나 Notion URL, github 는 `path` 나 `owner/repo:path` 필요. 로컬 절대 경로 금지 |

- `factType`: overview · problem · role · architecture · technology · rationale(결정 이유) · troubleshooting · result ·
  **evidence(측정·관찰된 사실)** · **evaluation(그에 대한 평가·해석)** · lesson · award · profile · skill · journey · devlog.
- `status`: **current**(지금 사실) · historical(예전엔 그랬다) · experimental(실험 중) · planned(계획) · deprecated(더 이상 사실 아님 — 스냅샷에서 빠짐).
  current 가 아닌 조각은 근거에 "상태: 과거/실험/계획" 라벨이 붙어 모델에 가고, 프롬프트는 그것을 현재 사실처럼 말하지 말라고 한다.
- `public: false` 는 스냅샷에서 빠진다. 비공개 엔티티 아래에 public 조각을 둘 수 없다.
- 비밀값(API 키, Bearer 토큰, 개인 키, `.env` 꼴 `XXX_KEY=…`, 자격증명 URL)이 보이면 빌드가 막힌다. 비밀이 아닌 오탐은
  `secretAllowlist: [{ chunkId, match, reason }]` 로 그 조각의 그 문자열만 허용한다.

## 이 저장소가 하는 일

```
npm run docent:corpus      # 검증·정규화·중복 제거 → src/generated/docent-corpus.json (오류 있으면 쓰지 않음, exit 1)
npm run docent:embed       # 문서 임베딩 재생성 (코퍼스가 바뀌면 이전 아티팩트는 stale — 런타임이 쓰지 않는다)
npm run docent:eval        # BM25 / Dense / Hybrid 비교 (Before/After)
```

- 정규화: NFC, 공백·빈 줄 정리, 별칭 소문자·중복 제거. 뜻은 바꾸지 않는다.
- 중복 제거: 같은 엔티티·같은 상태에서 본문이 같은 조각은 앞의 것만 남기고 경고.
- 파생 조각 하나: "포트폴리오 프로젝트 전체 목록"(`profile:portfolio:projects`) — 각 current 프로젝트의 첫 current 개요
  조각 본문을 이어 붙인 것(새 문장 없음, provenance = derived). 검색이 "프로젝트들 자체를 묻는 질문" 의 신호로 쓴다.
  개요(`factType: overview`, `status: current`) 조각이 프로젝트마다 하나는 있어야 목록이 온전하다.
- 스냅샷이 있으면 런타임은 그것과 그 엔티티 등록부를 쓴다. 되돌리기: 스냅샷 파일 삭제 또는 `DOCENT_CORPUS=legacy`.

## 아직 정해지지 않은 것

현재 실제 엔티티 목록(예: Crime Scene, 포트폴리오 사이트 자체를 넣을지)은 큐레이션 패키지에서 확정한다.
지금 런타임은 레거시 코퍼스(src/data 빌더, 프로젝트 5개)를 그대로 쓴다.
