import { ClawDevHero } from "./clawdev/ClawDevHero";
import { AgentTeamRoom } from "./clawdev/AgentTeamRoom";
import { OrchestrationPipeline } from "./clawdev/OrchestrationPipeline";
import { AgentDebateTranscript } from "./clawdev/AgentDebateTranscript";
import { VerificationLoop } from "./clawdev/VerificationLoop";
import { SchemaRetryTerminal } from "./clawdev/SchemaRetryTerminal";
import { ModelProfileMatrix } from "./clawdev/ModelProfileMatrix";
import { ClawdevSectionHeading } from "./clawdev/ClawdevSectionHeading";
import {
  ClawdevTechStack,
  DualInterface,
  ProjectMemory,
  ResilienceFallback,
  ResultsAndLimitations,
} from "./clawdev/ClawdevSubsections";

function Section({
  label,
  title,
  subtitle,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-[72px] md:py-[120px]">
      <ClawdevSectionHeading label={label} title={title} subtitle={subtitle} />
      <div className="mt-12">{children}</div>
    </section>
  );
}

export function ClawDevCaseStudy() {
  return (
    <div className="text-white">
      <ClawDevHero />

      <Section
        label="The Team"
        title={"하나의 답변자가 아니라\n6개 역할의 팀"}
        subtitle="각 에이전트는 한국어 페르소나와 최소 항목 수 제약을 가진 채, 자기 역할 관점에서만 주장을 만듭니다. 카드를 눌러 각 역할의 목표와 제약을 확인하세요."
      >
        <AgentTeamRoom />
      </Section>

      <Section
        label="Orchestration"
        title={"요청 한 줄이\n8단계 파이프라인을 거친다"}
        subtitle="사용자 요청은 PM 해석 → 토론 → 반응 → 클러리피케이션 → PM 확정 → 병렬 스펙 → 구현 계획 → 코딩·검증 루프를 순서대로 통과합니다."
      >
        <OrchestrationPipeline />
      </Section>

      <Section
        label="Collaboration"
        title={"에이전트들은\n서로의 말을 인용하며 토론한다"}
        subtitle="발언 순서는 요청 해시로 결정되고, 각 메시지는 msg-### ID로 이전 발언을 참조합니다. support·refine·challenge로 반응하며 합의를 만들어 갑니다."
      >
        <AgentDebateTranscript />
      </Section>

      <Section
        label="Code Review & Verify"
        title={"생성한 코드를\n실제로 실행해 검증한다"}
        subtitle="비-owner 역할이 코드를 리뷰하고, node·tsc·test를 실제로 돌립니다. 실패하면 PM이 개입해 우선순위를 정하고, owner가 재작성하고, 그래도 안 되면 자율 수리 루프가 담당을 추론해 고칩니다."
      >
        <VerificationLoop />
      </Section>

      <Section
        label="Schema-First"
        title={"잘못된 출력은\n스스로 교정한다"}
        subtitle="모든 LLM 출력은 Zod 스키마로 검증됩니다. 실패하면 검증 에러를 그대로 모델에 돌려주며 재프롬프트해, 작은 로컬 모델로도 구조화된 오케스트레이션을 가능하게 합니다."
      >
        <SchemaRetryTerminal />
      </Section>

      <Section
        label="Model Profiles"
        title={"단계마다\n다른 온도로 생성한다"}
        subtitle="(모델군 × 단계) 프로파일로 파라미터를 중앙 관리합니다. 토론은 약간의 다양성을, 코드 생성은 최저 온도와 최대 토큰을 사용합니다."
      >
        <ModelProfileMatrix />
      </Section>

      <Section
        label="Resilience"
        title={"끊기지 않는\nLLM 스택"}
        subtitle="Gemini를 우선 호출하다 quota·rate-limit을 감지하면 로컬 Ollama로 폴백합니다. LLM 리뷰가 실패하면 휴리스틱 리뷰로 떨어져, 파이프라인이 멈추지 않습니다."
      >
        <ResilienceFallback />
      </Section>

      <Section
        label="Memory"
        title={"같은 폴더에 다시 실행하면\n이어서 일한다"}
        subtitle="파일 기반 프로젝트 메모리가 최근 요청·빌드 브리프·워크스페이스 인덱스·미해결 사항을 저장하고, 재실행 시 역할별로 컨텍스트에 주입합니다."
      >
        <ProjectMemory />
      </Section>

      <Section
        label="Interface"
        title={"CLI와 웹이\n같은 오케스트레이터를 공유"}
        subtitle="Ink 기반 터미널 UI와 SSE 기반 웹이 동일한 MultiAgentOrchestrator를 hooks로 구독합니다."
      >
        <DualInterface />
      </Section>

      <Section
        label="Results"
        title={"데모가 아니라\n실제로 도는 시스템"}
        subtitle="가장 인상적인 부분은 화려한 UI가 아니라, 실제 검증·2단계 생성·우아한 폴백이 맞물려 끝까지 돌아간다는 점입니다."
      >
        <ResultsAndLimitations />
      </Section>

      <Section
        label="Tech Stack"
        title={"전부 TypeScript로\n구성한 워크스페이스"}
      >
        <ClawdevTechStack />
      </Section>
    </div>
  );
}
