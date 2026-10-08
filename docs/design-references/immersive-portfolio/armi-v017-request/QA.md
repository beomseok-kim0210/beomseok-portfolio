# ARMI v017 — Box ingress and request flow QA

Verified 2026-10-07 in the actual localhost:3000/#armi runtime and /world/armi-review.

## Asset checkpoint
- Source: D:/portfolio-world-v2-3d/armi/routing-chamber/blender/ARMI_Routing_Chamber_v017_BoxIngress.blend
- Previous scene preserved as v016 and an additional BeforeIngressRepair backup.
- Supplemental export: public/models/armi/v017/ARMI_v017_BoxIngress.glb
- Independently parsed: 54,168 bytes; 3 nodes, 3 meshes, 3 materials, 3,088 triangles, no animation clips.
- External ingress terminates at the rotated box entrance, before the central spindle.
- Old interior SelectedPath and SwitchingConduitBed are suppressed in Blender and runtime.
- Production v015 GLB and v016 Text route remain preserved. This is a scoped supplemental asset replacement, not a full scene re-export.

## Runtime behavior
- WorldCameraController remains sole camera owner. Authored camera timeline is not autoplayed.
- Large lime sphere/ring replaces the four old small request markers. A moving trail tracks its leading edge.
- UI departure and response return use matching DOM signal head/trail, outside WebGL tone mapping/bloom.
- The visible ingress segment starts at curve parameter 0.4, matching the UI transition into the chamber framing.
- Core passage occurs once; later destination handoffs bypass Core.
- Functional motion begins after arrival: Text .447 / .455; Memory .567 / .575; Tavily .656 / .664; Robot .745 / .753; Response .850 / .858 (arrival / animation start).
- Both motion and visibility are derived from scroll progress; reverse seeking restores earlier states.
- Legacy ingress is merged into environment batches. Runtime removes indexed triangles in its corridor from a cloned geometry. This remains a localized spatial filter rather than a full re-export of the merged environment.

## Verification
- TypeScript: PASS.
- Scoped ESLint: PASS.
- Six focused tests: PASS (asset loading/bounds, interaction ordering, route continuity, reverse seeking, authored motion/camera/UI behavior).
- Visual pass: core entrance, Memory, Tavily, Robot, Response, UI return; second pass in actual homepage with forward/reverse scroll and refreshed code.
- Screenshots: portfolio-core.jpg, portfolio-ui-ingress.jpg, portfolio-ui-return.jpg and individual destination shots.
- No captured browser console errors. Existing THREE.Clock deprecation warning remains.
- Development browser sample at core approach: 249 total draw calls, 373,464 rendered triangles, average 23.3 FPS, canvas 1425x828, DPR 1. Performance optimization is still needed; this is not a production FPS benchmark.
- Temporary desktop viewport override reset after QA. Mobile visual polish was not assessed in this pass.
