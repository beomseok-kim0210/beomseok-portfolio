import { armiRecap } from "@/data/armiCaseStudy";
import { ArmiInteractionDecisions } from "./armi/ArmiInteractionDecisions";
import { ArmiProductScreens } from "./armi/ArmiProductScreens";
import { ArmiRealtimeFlow } from "./armi/ArmiRealtimeFlow";
import { ArmiResultSummary } from "./armi/ArmiResultSummary";
import { ArmiStateMachine } from "./armi/ArmiStateMachine";
import { ArmiTechStack } from "./armi/ArmiTechStack";
import { ArmiVisualTroubleshooting } from "./armi/ArmiVisualTroubleshooting";
import { ProjectRecap } from "./ProjectRecap";

export function ArmiCaseStudy() {
  return (
    <>
      {/* data-docent-section: 도슨트가 "지금 보는 섹션" 힌트로 쓴다. 텍스트는 보내지 않는다. */}
      <div data-docent-section="overview"><ArmiProductScreens /></div>
      <div data-docent-section="architecture"><ArmiStateMachine /><ArmiRealtimeFlow /></div>
      <div data-docent-section="decision"><ArmiInteractionDecisions /></div>
      <div data-docent-section="troubleshooting"><ArmiVisualTroubleshooting /></div>
      <div data-docent-section="result"><ArmiResultSummary /></div>
      <div data-docent-section="technology"><ArmiTechStack /></div>
      <ProjectRecap
        definition={armiRecap.definition}
        takeaways={armiRecap.takeaways}
        reflection={armiRecap.reflection}
        accent="#60A5FA"
      />
    </>
  );
}
