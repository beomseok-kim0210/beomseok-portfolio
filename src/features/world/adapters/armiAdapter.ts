import type { WorldRenderMode, TraversalDirection } from "../types/contracts";

/** Phase 1B seam only. No adapter implementation or V1 runtime import/integration. */
export interface ArmiDistrictAdapterInput {
  readonly districtId: "armi";
  readonly shotId: "entry" | "voice" | "tablet-approach" | "portal" | "routing-reveal" | "observe-decision" | "exit";
  readonly shotProgress: number;
  readonly direction: TraversalDirection;
  readonly renderMode: WorldRenderMode;
}
export interface ArmiLegacyEvaluation {
  /** V1's entire ARMI-local clock, not World-normalized progress. */
  readonly legacyJourneyProgress: number;
  readonly legacyPhaseId: string;
}
export interface ArmiDistrictAdapter {
  readonly adapterId: "armi/v1-boundary";
  /** Future explicit mapping, owned here, reviewed against V1 baseline in Phase 1B. */
  evaluate(input: ArmiDistrictAdapterInput): ArmiLegacyEvaluation;
}

export const armiAdapterBoundary = {
  adapterId: "armi/v1-boundary",
  status: "unintegrated",
  conceptualShotToLegacyPhase: {
    entry: "entry", voice: "voice", "tablet-approach": "approach", portal: "enter",
    "routing-reveal": "routing", "observe-decision": "decision", exit: "product",
  },
  preservedEntryShots: ["entry", "voice", "tablet-approach", "portal"],
  // stt/travel/result/return are deliberately unresolved, not silently discarded.
  unresolvedLegacyPhases: ["stt", "travel", "result", "return"],
} as const;
