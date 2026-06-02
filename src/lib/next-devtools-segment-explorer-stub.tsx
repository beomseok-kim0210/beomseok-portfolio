"use client";

import type { ReactNode } from "react";

export const SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE =
  "NEXT_DEVTOOLS_SIMULATED_ERROR";

export function SegmentBoundaryTriggerNode() {
  return null;
}

export function SegmentViewStateNode() {
  return null;
}

export function SegmentViewNode({
  children,
}: {
  type?: string;
  pagePath?: string;
  children?: ReactNode;
}) {
  return <>{children}</>;
}

export function SegmentStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function useSegmentState() {
  return {
    boundaryType: null as null,
    setBoundaryType: () => {},
  };
}
