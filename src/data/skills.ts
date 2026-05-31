import {
  BrainCircuit,
  Database,
  PanelTop,
  Radio,
  Server,
} from "lucide-react";
import type { SkillGroup } from "@/types/portfolio";

export const skills: SkillGroup[] = [
  {
    category: "Frontend",
    icon: PanelTop,
    items: [
      {
        technology: "Next.js",
        usedIn: "ARMI, Portfolio",
        description: "제품형 웹 경험과 라우팅 구조 구현",
      },
      {
        technology: "TypeScript",
        usedIn: "All projects",
        description: "컴포넌트 계약과 데이터 모델 안정화",
      },
      {
        technology: "TailwindCSS",
        usedIn: "Product UI",
        description: "반응형 제품 UI 시스템 구현",
      },
      {
        technology: "Framer Motion",
        usedIn: "Storytelling",
        description: "절제된 진입 애니메이션과 인터랙션",
      },
    ],
  },
  {
    category: "AI",
    icon: BrainCircuit,
    items: [
      {
        technology: "Prompt Engineering",
        usedIn: "Wedding Dress AI",
        description: "결과 기준 중심의 프롬프트 구조 설계",
      },
      {
        technology: "LLM Workflow",
        usedIn: "행가래 Report",
        description: "운동 데이터를 사용자 리포트로 변환",
      },
      {
        technology: "Voice AI",
        usedIn: "ARMI",
        description: "음성 입력을 제품 행동으로 연결",
      },
      {
        technology: "Multi-Agent",
        usedIn: "Claw Dev",
        description: "역할 기반 AI 작업 흐름 실험",
      },
    ],
  },
  {
    category: "Realtime",
    icon: Radio,
    items: [
      {
        technology: "WebSocket",
        usedIn: "Robot state",
        description: "상태 이벤트를 화면에 즉시 반영",
      },
      {
        technology: "Streaming UX",
        usedIn: "Voice AI",
        description: "대기 시간을 사용자 피드백으로 완화",
      },
      {
        technology: "Event Design",
        usedIn: "ARMI",
        description: "로봇 상태와 UI 상태를 분리",
      },
    ],
  },
  {
    category: "Backend",
    icon: Server,
    items: [
      {
        technology: "API Design",
        usedIn: "Product services",
        description: "프론트엔드가 예측 가능한 계약 구성",
      },
      {
        technology: "Auth Flow",
        usedIn: "User systems",
        description: "사용자 흐름 기반 인증 화면 설계",
      },
      {
        technology: "Report Pipeline",
        usedIn: "행가래",
        description: "AI 판정 결과를 리포트 데이터로 정리",
      },
    ],
  },
  {
    category: "Infrastructure",
    icon: Database,
    items: [
      {
        technology: "Vercel",
        usedIn: "Deployment",
        description: "Next.js 정적/서버 렌더 배포",
      },
      {
        technology: "GitHub Actions",
        usedIn: "Delivery",
        description: "검증과 배포 흐름 자동화 기반",
      },
      {
        technology: "Observability",
        usedIn: "Realtime checks",
        description: "실시간 흐름의 실패 지점 확인",
      },
    ],
  },
];
