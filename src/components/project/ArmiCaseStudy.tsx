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
      <ArmiProductScreens />
      <ArmiStateMachine />
      <ArmiRealtimeFlow />
      <ArmiInteractionDecisions />
      <ArmiVisualTroubleshooting />
      <ArmiResultSummary />
      <ArmiTechStack />
      <ProjectRecap
        definition={armiRecap.definition}
        takeaways={armiRecap.takeaways}
        reflection={armiRecap.reflection}
        accent="#60A5FA"
      />
    </>
  );
}
