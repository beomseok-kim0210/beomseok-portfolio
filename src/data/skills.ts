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
    category: "AI Agent / LLM",
    icon: BrainCircuit,
    items: [
      {
        technology: "LangGraph",
        usedIn: "ARMI",
        description: "StateGraph 기반 요청 라우팅",
      },
      {
        technology: "Tool Calling",
        usedIn: "ARMI",
        description: "응답·로봇 행동·검색·기억 도구 분기",
      },
      {
        technology: "Agent orchestration",
        usedIn: "Claw Dev, BCOS",
        description: "역할과 작업 단위의 에이전트 실행 조율",
      },
      {
        technology: "Prompt / grounding",
        usedIn: "Digital Docent, Wedding Dress AI",
        description: "근거 기반 응답과 역할 기반 프롬프트 설계",
      },
      {
        technology: "Qwen",
        usedIn: "ARMI",
        description: "Qwen 30B 기반 Agent 구성",
      },
    ],
  },
  {
    category: "RAG / Retrieval",
    icon: Database,
    items: [
      {
        technology: "BM25",
        usedIn: "Digital Docent",
        description: "키워드 검색과 dense 실패 시 fallback",
      },
      {
        technology: "Dense Embedding (text-embedding-3-small)",
        usedIn: "Digital Docent",
        description: "질의 임베딩 기반 의미 검색",
      },
      {
        technology: "Hybrid Retrieval + RRF",
        usedIn: "Digital Docent",
        description: "BM25와 dense 결과의 순위 결합",
      },
      {
        technology: "Chroma",
        usedIn: "ARMI",
        description: "장기 기억의 의미 검색 인덱스",
      },
      {
        technology: "Retrieval evaluation — Hit@k / MRR",
        usedIn: "Digital Docent",
        description: "검색 품질의 정량 평가",
      },
    ],
  },
  {
    category: "Multi-Agent / AI Dev Workflow",
    icon: BrainCircuit,
    items: [
      {
        technology: "Claude Code",
        usedIn: "BCOS, Claw Dev",
        description: "관리·설계·리뷰 역할과 에이전트 협업",
      },
      {
        technology: "Codex",
        usedIn: "BCOS",
        description: "분리된 구현 worker 실행",
      },
      {
        technology: "Task / session orchestration",
        usedIn: "BCOS",
        description: "작업 계약과 구현·리뷰 세션 분리",
      },
      {
        technology: "RFC / ADR",
        usedIn: "BCOS",
        description: "설계 판단과 결정 근거 기록",
      },
      {
        technology: "Gemini → Ollama fallback",
        usedIn: "Claw Dev",
        description: "외부 모델 실패 시 로컬 모델 전환",
      },
    ],
  },
  {
    category: "Backend / Realtime",
    icon: Server,
    items: [
      {
        technology: "Spring Boot",
        usedIn: "ARMI",
        description: "Agent와 클라이언트를 잇는 서버 흐름",
      },
      {
        technology: "Redis",
        usedIn: "ARMI, 행가래",
        description: "대화 원문·실시간 상태와 최신 좌표 관리",
      },
      {
        technology: "WebSocket / STOMP",
        usedIn: "ARMI",
        description: "태블릿에 실시간 상태 이벤트 전달",
      },
      {
        technology: "gRPC",
        usedIn: "ARMI",
        description: "제어 PC의 로봇 상태 연동",
      },
      {
        technology: "Django",
        usedIn: "SSAFY",
        description: "SSAFY 과정의 백엔드 개발",
      },
      {
        technology: "Next.js API routes / streaming",
        usedIn: "Digital Docent",
        description: "대화와 문장 단위 음성 스트리밍",
      },
    ],
  },
  {
    category: "Computer Vision",
    icon: Radio,
    items: [
      {
        technology: "YOLO Pose / YOLOv11-M",
        usedIn: "행가래",
        description: "자세 추정 모델 fine-tuning과 평가",
      },
      {
        technology: "Depth camera",
        usedIn: "행가래",
        description: "18개 keypoint의 3차원 좌표 구성",
      },
      {
        technology: "Jetson Nano on-device",
        usedIn: "행가래",
        description: "온디바이스 실시간 추론 최적화",
      },
      {
        technology: "3D human reconstruction — SMPL / PIFuHD / ICON / ECON / PaMIR",
        usedIn: "Wedding Dress AI",
        description: "3D 인체 복원 후보 비교와 실패 원인 분석",
      },
      {
        technology: "Stable Diffusion",
        usedIn: "Wedding Dress AI",
        description: "3D 복원 한계 이후 생성 방식으로 전환",
      },
    ],
  },
  {
    category: "Frontend / 3D",
    icon: PanelTop,
    items: [
      {
        technology: "React",
        usedIn: "행가래",
        description: "실시간 자세 피드백 UI",
      },
      {
        technology: "Next.js",
        usedIn: "Digital Docent, Crime Scene",
        description: "AI 웹 제품과 3D 게임 인터페이스",
      },
      {
        technology: "TypeScript",
        usedIn: "Digital Docent, BCOS, Claw Dev, Crime Scene",
        description: "AI 제품의 상태와 실행 계약 모델링",
      },
      {
        technology: "Vue",
        usedIn: "SSAFY",
        description: "SSAFY 과정의 프론트엔드 개발",
      },
      {
        technology: "Flutter",
        usedIn: "ARMI",
        description: "환자 앱의 음성·상태 흐름 구현",
      },
      {
        technology: "Three.js / React Three Fiber",
        usedIn: "행가래, Crime Scene, Digital Docent",
        description: "자세 시각화·3D 탐색·디지털 휴먼 렌더링",
      },
    ],
  },
  {
    category: "Infra / Production",
    icon: Database,
    items: [
      {
        technology: "Vercel",
        usedIn: "Digital Docent",
        description: "웹 애플리케이션 운영 배포",
      },
      {
        technology: "RunPod Serverless",
        usedIn: "Digital Docent voice",
        description: "음성 생성 worker의 serverless 배포",
      },
      {
        technology: "Docker",
        usedIn: "Digital Docent voice worker",
        description: "음성 worker 실행 이미지 구성",
      },
    ],
  },
];
