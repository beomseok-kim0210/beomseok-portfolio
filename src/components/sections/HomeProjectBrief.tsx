import Link from "next/link";
import type { CSSProperties } from "react";
import styles from "./HomeProjectBrief.module.css";

export function ProjectDetailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={styles.detailLink}>{children}<span aria-hidden="true">→</span></Link>;
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
    cta: "ARMI 상세 보기", href: "/projects/armi", accent: "#d2f059", background: "#060a0c", ink: "#eff1e3", muted: "#b4bec0",
  },
  wedding: {
    label: "WEDDING DRESS AI / BRIEF EVIDENCE", title: "복원의 한계를 분석하고, 비교 경험으로 전환했습니다.",
    summary: "3D 인체 복원 후보를 검토한 뒤 큰 드레스 부피 표현의 한계를 분석하고, 생성형 AI를 활용한 선택·비교 도구로 방향을 바꿨습니다.",
    pipeline: [["RESEARCH", "3D 복원 후보 검토"], ["DIAGNOSIS", "부피·메쉬·환경 한계 분석"], ["DECISION", "Stable Diffusion으로 전환"], ["EXPERIENCE", "생성 옵션과 설명 근거 비교"]],
    evidence: [
      ["실패를 구분한 검토", "SMPL·PIFuHD·ICON·ECON을 환경 구축과 복원 실험으로 검토하고 PaMIR도 비교했습니다. ICON은 환경 재현에 실패했고, ECON은 큰 드레스 부피를 유지하지 못했습니다."],
      ["문제에 맞춘 방향 전환", "완벽한 실착 재현 대신 선택 전의 비교를 돕기로 했습니다. 얼굴 사진·스타일 텍스트 기반 Stable Diffusion 생성과 전문가 역할별 프롬프트로 전환했습니다."],
      ["비교 경험과 팀 성과", "여러 생성 옵션과 설명 근거를 비교하는 경험을 구성했습니다. 팀 프로젝트는 생성형 AI 활용 산업융합 프로젝트 최우수상을 수상했습니다."],
    ],
    note: "개인 기여: 3D 후보 검토·환경 검증·실패 분석·문제 재정의·전환 판단·프롬프트 구조 설계. 생성과 비교 결과는 팀 구현입니다.",
    cta: "Wedding Dress AI 상세 보기", href: "/projects/wedding", accent: "#8b5948", background: "#fff9f7", ink: "#111827", muted: "#525b69",
  },
};

export function HomeProjectBrief({ project }: { project: keyof typeof briefs }) {
  const brief = briefs[project];
  const theme = { "--brief-accent": brief.accent, "--brief-bg": brief.background, "--brief-ink": brief.ink, "--brief-muted": brief.muted } as CSSProperties;
  return <section className={styles.brief} style={theme} aria-label={`${project === "armi" ? "ARMI" : "Wedding Dress AI"} Brief Evidence`}>
    <div className={styles.inner}>
      <p className={styles.label}>{brief.label}</p>
      <h2>{brief.title}</h2>
      <p className={styles.summary}>{brief.summary}</p>
      <ol className={styles.pipeline}>{brief.pipeline.map(([label, text]) => <li key={label}><span>{label}</span><p>{text}</p></li>)}</ol>
      <div className={styles.evidence}>{brief.evidence.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      <p className={styles.note}>{brief.note}</p>
      <ProjectDetailLink href={brief.href}>{brief.cta}</ProjectDetailLink>
    </div>
  </section>;
}
