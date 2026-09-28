export interface AvatarBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface AvatarFrame {
  target: { x: number; y: number; z: number };
  distance: number;
  visibleHeight: number;
  visibleWidth: number;
  subjectHeightOccupancy: number;
  subjectWidthOccupancy: number;
  headroom: number;
  worstCaseIdleHeadroom: number;
  worstCaseInteractiveHeadroom: number;
  eyeLine: number;
  idleEnvelope: {
    top: number;
    bottom: number;
    width: number;
  };
}

/**
 * Measured from the rendered alpha of this asset at the runtime camera. These
 * are the projected silhouette edges in model space, not the Box3 limits.
 */
export const DOCENT_RENDERED_SILHOUETTE = {
  minY: -0.0918,
  maxY: 0.1796,
} as const;

export const DOCENT_PORTRAIT_FRAME = {
  subjectHeightOccupancy: 0.74,
  neutralHeadroom: 0.1,
  eyeFromTopFraction: 0.3,
  idleFloatY: 0.008,
  idlePitchRadians: 0.02,
  pointerPitchRadians: 0.04,
  idleYawRadians: 0.04,
} as const;

/**
 * Builds a portrait camera target from the measured projected silhouette.
 * Box3 still supplies horizontal/depth guards, but never vertical occupancy.
 */
export function frameAvatarPortrait(
  bounds: AvatarBounds,
  aspect: number,
  verticalFovDegrees: number,
): AvatarFrame {
  const width = bounds.max.x - bounds.min.x;
  const silhouetteHeight =
    DOCENT_RENDERED_SILHOUETTE.maxY - DOCENT_RENDERED_SILHOUETTE.minY;
  const depth = bounds.max.z - bounds.min.z;
  const visibleHeight = silhouetteHeight / DOCENT_PORTRAIT_FRAME.subjectHeightOccupancy;
  const visibleWidth = visibleHeight * aspect;

  const pitchGuard = depth * Math.sin(DOCENT_PORTRAIT_FRAME.idlePitchRadians);
  const verticalMotionGuard = DOCENT_PORTRAIT_FRAME.idleFloatY + pitchGuard;
  const interactiveMotionGuard = DOCENT_PORTRAIT_FRAME.idleFloatY
    + depth * Math.sin(
      DOCENT_PORTRAIT_FRAME.idlePitchRadians + DOCENT_PORTRAIT_FRAME.pointerPitchRadians,
    );
  const neutralHeadroom = DOCENT_PORTRAIT_FRAME.neutralHeadroom;
  const targetY = DOCENT_RENDERED_SILHOUETTE.maxY
    + neutralHeadroom * visibleHeight
    - visibleHeight / 2;
  const eyeY = DOCENT_RENDERED_SILHOUETTE.maxY
    - silhouetteHeight * DOCENT_PORTRAIT_FRAME.eyeFromTopFraction;
  const viewportTop = targetY + visibleHeight / 2;
  const horizontalEnvelope =
    width * Math.cos(DOCENT_PORTRAIT_FRAME.idleYawRadians)
    + depth * Math.sin(DOCENT_PORTRAIT_FRAME.idleYawRadians);
  const verticalFov = verticalFovDegrees * Math.PI / 180;

  return {
    target: {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: targetY,
      z: (bounds.min.z + bounds.max.z) / 2,
    },
    // Depth is intentionally absent: the camera near plane is independent.
    distance: visibleHeight / (2 * Math.tan(verticalFov / 2)),
    visibleHeight,
    visibleWidth,
    subjectHeightOccupancy: silhouetteHeight / visibleHeight,
    subjectWidthOccupancy: width / visibleWidth,
    headroom: neutralHeadroom,
    worstCaseIdleHeadroom: neutralHeadroom - verticalMotionGuard / visibleHeight,
    worstCaseInteractiveHeadroom: neutralHeadroom - interactiveMotionGuard / visibleHeight,
    eyeLine: (viewportTop - eyeY) / visibleHeight,
    idleEnvelope: {
      top: verticalMotionGuard,
      bottom: verticalMotionGuard,
      width: horizontalEnvelope,
    },
  };
}
