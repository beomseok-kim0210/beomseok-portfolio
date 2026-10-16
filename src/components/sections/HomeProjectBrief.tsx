import Link from "next/link";
import type { CSSProperties } from "react";
import styles from "./HomeProjectBrief.module.css";

export function ProjectDetailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={styles.detailLink}>{children}<span aria-hidden="true">→</span></Link>;
}

/**
 * The end of a project journey: every scene just travelled, lit, beside the one solid call to action
 * in the sheet. It sits after the evidence, so it is the last thing read — and the obvious next step.
 */
export function JourneyComplete({ href, cta, sub, recap }: { href: string; cta: string; sub: string; recap?: readonly string[] }) {
  return <div className={styles.complete}>
    {recap && <div className={styles.recap}>
      <p className={styles.recapLabel}>JOURNEY COMPLETE · {String(recap.length).padStart(2, "0")}/{String(recap.length).padStart(2, "0")}</p>
      <ol aria-label="지나온 장면">{recap.map((title, i) => <li key={title}><span>{String(i + 1).padStart(2, "0")}</span>{title}</li>)}</ol>
    </div>}
    <Link href={href} className={styles.cta}>
      <span className={styles.ctaText}><strong>{cta}</strong><small>{sub}</small></span>
      <span className={styles.ctaArrow} aria-hidden="true">→</span>
    </Link>
  </div>;
}

const briefs = {
  armi: {
    label: "ARMI / BRIEF EVIDENCE", title: "요청을 이해하는 데서, 실제 동작까지.",
    summary: "음성·텍스트 요청을 Agent가 판단하고, 답변·검색·기억 조회·로봇 행동으로 분기하는 병상 보조 서비스입니다.",
    pipeline: [["REQUEST", "음성·텍스트 요청"], ["AGENT", "Qwen 30B · LangGraph 판단"], ["ROUTING", "답변 / 검색 / 기억 / 행동"], ["ACTION", "태블릿·로봇·Watch 연동"]],
    evidence: [
      ["기능별 요청 분기", "LangGraph StateGraph의 구조화 출력을 Text Answer·Robot Action·Tavily Search·Memory Retrieval로 연결했습니다. 로봇 행동은 여러 분기 중 하나입니다."],
      ["기억의 근거 복원", "Redis는 원문·실시간 상태를, Chroma는 장기 기억의 의미 검색을 맡습니다. 기억 질문은 Chroma 검색 뒤 Redis 원문을 다시 조회합니다."],
      ["입출력 상태 분리", "TTS 완료 콜백을 상태 전환 기준으로 삼고, 말하는 동안 STT를 차단했습니다. 입력 모드에 따라 듣기 재시작 여부를 구분했습니다."],
    ],
    note: "개인 기여: Agent 라우팅·구조화 출력·기억 흐름, 클라이언트 UI·음성 상태. 서버·로봇·태블릿·Watch 연동은 팀 구현입니다.",
    cta: "ARMI 상세 기록 열기", ctaSub: "문제 정의 · 설계 판단 · 트러블슈팅 · 기술 스택", href: "/projects/armi", ctaInk: "#0b1016", accent: "#d2f059", background: "#060a0c", ink: "#eff1e3", muted: "#b4bec0",
  },
  wedding: {
    label: "WEDDING DRESS AI / BRIEF EVIDENCE", title: "복원의 한계를 분석하고, 비교 경험으로 전환했습니다.",
    summary: "3D 인체 복원 후보를 검토했지만 볼가운의 부피가 반쪽만 복원되는 한계를 확인하고, Stable Diffusion API 기반 2D 생성과 전문가 5명 프롬프트로 방향을 바꿨습니다.",
    pipeline: [["RESEARCH", "3D 복원 후보 검토"], ["DIAGNOSIS", "부피가 반쪽만 복원되는 한계"], ["DECISION", "Stable Diffusion API 2D 생성"], ["EXPERIENCE", "전문가 5명 · AI 추천 이유 요약"]],
    evidence: [
      ["실패를 구분한 검토", "SMPL·PIFuHD·ICON·ECON을 환경 구축과 복원 실험으로 검토하고 PaMIR도 비교했습니다. ICON은 환경 재현에 실패했고, ECON은 볼가운의 부피 있는 부분이 반쪽만 남은 것처럼 복원됐습니다."],
      ["프롬프트 엔지니어링으로 전환", "3D를 내려놓고 Stable Diffusion API로 2D 이미지를 생성했습니다. 더 실감 나고 사용자에게 어울리는 결과를 위해 프롬프트 엔지니어링을 강화했고, 그 과정에서 전문가 5명의 역할·SKILL 프롬프트를 만들었습니다."],
      ["추천 근거와 팀 성과", "다섯 전문가가 전문가별 논문 근거로 의견을 내고, 왜 이 드레스인지 AI가 요약해 결과와 함께 제시합니다. 팀 프로젝트는 생성형 AI 활용 산업융합 프로젝트 최우수상을 수상했습니다."],
    ],
    note: "개인 기여: 3D 후보 검토·환경 검증·실패 분석·전환 판단, 전문가 5명의 역할·SKILL 프롬프트 작성. 전문가별 논문 RAG와 생성 결과는 팀 구현입니다.",
    cta: "Wedding Dress AI 상세 기록 열기", ctaSub: "후보 검토 · 실패 분석 · 방향 전환 · 기술 스택", href: "/projects/wedding", ctaInk: "#ffffff", accent: "#8b5948", background: "#fff9f7", ink: "#111827", muted: "#525b69",
  },
};

export function HomeProjectBrief({ project, recap }: { project: keyof typeof briefs; recap?: readonly string[] }) {
  const brief = briefs[project];
  const theme = { "--brief-accent": brief.accent, "--brief-bg": brief.background, "--brief-ink": brief.ink, "--brief-muted": brief.muted, "--brief-cta-ink": brief.ctaInk } as CSSProperties;
  return <section className={styles.brief} style={theme} aria-label={`${project === "armi" ? "ARMI" : "Wedding Dress AI"} Brief Evidence`}>
    <div className={styles.inner}>
      <p className={styles.label}>{brief.label}</p>
      <h2>{brief.title}</h2>
      <p className={styles.summary}>{brief.summary}</p>
      <ol className={styles.pipeline}>{brief.pipeline.map(([label, text]) => <li key={label}><span>{label}</span><p>{text}</p></li>)}</ol>
      <div className={styles.evidence}>{brief.evidence.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      <p className={styles.note}>{brief.note}</p>
      <JourneyComplete href={brief.href} cta={brief.cta} sub={brief.ctaSub} recap={recap}/>
    </div>
  </section>;
}
