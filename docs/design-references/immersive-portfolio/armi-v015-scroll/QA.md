# ARMI v015 desktop scroll checkpoint — 2026-10-07

Repository: `D:/UserData/Desktop/beomseok-portfolio`, branch `feat-immersive-portfolio-flow`. Existing dirty work and `.claude/launch.json` preserved. No Blender edits, asset re-export, GLB replacement, next-project transition edits, commit or deployment.

## Scroll structure

| ARMI local progress | Stage |
| --- | --- |
| 0–.055 | Real product |
| .055–.12 | Voice → request |
| .12–.21 | Product → world |
| .21–.29 | Routing Chamber |
| .29–.33 | Core approach |
| .33–.38 | Core passage and selected output |
| .38–.44 | Route travel |
| .44–.53 | Text Answer |
| .53–.62 | Memory Retrieval |
| .62–.71 | Tavily Search |
| .71–.80 | Robot Action |
| .80–.89 | Response composition |
| .89–.935 | Structured response |
| .935–.97 | Return handoff |
| .97–1 | Original product conversation screen |

The existing district DOM range supplies local progress through World Director. WebGL uses the published ARMI production shot profile; fallback/reduced motion retains the previous compatibility profile. ScrollTrigger scrubs progress directly, without an additional timeline lag. React narrative updates occur only when a stage changes. Per-frame camera, visibility and motion use Three refs.

## Camera and state ownership

`WorldCameraController` remains the only final camera writer. Loaded glTF CameraReferences supply hero and destination poses. Local intermediate waypoints enter the real Core opening, pass beside its spindle, leave through the selected side and merge onto the Text route. The existing closed side wall is animated down as an output gate during .348–.36, and closes behind the visitor during .382–.40. No new mesh is added. The Core passage happens once. Higher/outer chamber waypoints connect later destinations without returning to the Core interior.

Position interpolates with smoothstep between waypoints; orientation uses quaternion slerp and FOV interpolates continuously. Destination holds allow reading. There are short velocity holds at intermediate keys; these are candidates for further cinematic pacing polish, rather than camera cuts. Camera transforms do not use the baked previs camera timeline.

Each existing clip has its own paused AnimationMixer action. Absolute action time is set to clamped local progress × clip duration, followed by `mixer.update(0)`. There is no delta-driven playback, mixer time accumulation or sequential video-style clip player. Unchanged progress skips redundant motion evaluation.

| Clip | Local interval | Authored source frames |
| --- | --- | --- |
| Core_AuthoredMotion | .29–.38 | 70–114 |
| Text_AuthoredMotion | .40–.53 | 121–188 |
| Memory_AuthoredMotion | .53–.62 | 189–240 |
| Tavily_AuthoredMotion | .62–.71 | 241–292 |
| Robot_AuthoredMotion | .71–.80 | 293–350 |
| Response_AuthoredMotion | .80–.935 | 351–404 |

Source ranges were checked against motion-samples.json and clip metadata. The duplicate sample payload is not loaded at runtime; GLB animation tracks provide transform interpolation. Visibility events remain separate: each domain converts its local progress to its own source-frame range and evaluates the manifest's visibility contract from scratch. Transient controls are hidden outside their domain window. Static chamber architecture remains visible. Future branches reset to clip start and previous mechanisms clamp to clip end. Direct jumps and reverse seeks restore the same state.

## Lighting and export attachment repairs

Reduced broad upper ColdKey (.36→.10), FrontStructuralFill (.32→.24), RearShaftRim (.45→.16), ChamberDepthFill (.30→.14), and environment intensity (.12→.065). Original shaft geometry, emissive surfaces, destination colors, bloom/exposure and other practical roles remain. This reduces the extra overhead illumination impression; real-time indirect light and shadows still differ from Blender.

The first visual pass found the Memory architectural title cropped, a Core exit wall filling the view, and Tavily transient text at the world origin / source states behind console faces. Repairs widened the Memory composition; made the existing selected output wall a deterministic runtime gate; attached existing exported flat labels to their controls and offset Tavily state surfaces 1.5 units forward. The duplicate Memory meaning/title is suppressed in favor of its original architectural title. No source geometry or GLB bytes changed. These runtime corrections are explicit and reversible, rather than a new export pipeline.

## Product transitions and evidence boundary

The original product screenshots render in DOM, outside tone mapping, fog and bloom. Voice activity, request confirmation and a lime handoff signal are explanatory overlays. Opening pixels enlarge/fade through .155–.21 while the chamber emerges; return pixels appear through .935–.97 with a response handoff signal. The isolated Blender Product set at Y=1500 is hidden throughout the live journey and is never a physical UI location.

**Remaining requirement limitation:** the verified original return image contains the conversation-mode product UI, not a verified answer sentence or transcript for this illustrated request. No patient request, actual answer, search URL or product transcript has been invented. The structured response is visible in 3D; its exact answer text inside the real app remains pending an approved product capture/data source. Opening and return currently use original still captures, not an interactive reimplementation of the ARMI application.

## Browser QA

Actual homepage `http://localhost:3000/#armi`, requested desktop browser viewport 1440×900, actual WebGL surface 1425×828 (site scrollbar/header), DPR 1. Review controls use the exact same district/controller/pipeline at `/world/armi-review` and do not autoplay anything.

Two visual passes were completed. `home-*.jpg` are real homepage scroll captures. `qa-*.jpg` are reference samples through the review surface. `home-contact-sheet.png` assembles 12 representative homepage stages. `home-core-exit.jpg` records the repaired output connection. Forward and reverse sequences were inspected through real wheel scrolling; `forward.json` and `reverse.json` record district progress and shot identities. Reloading in mid-journey restored camera/state from current scroll. The extra output-gate change was also inspected forward/backward after repair.

Main stages remain readable, the camera does not fly back through the Core between later destinations, and old transient branch states do not remain over later destination screens. No transform discontinuity was found by the numeric pose continuity test. Core sign close-ups and some foreground architecture still dominate short intermediate moments; further human pacing review is appropriate. This is not a collision-proof camera sweep of every possible progress value.

Heaviest chamber geometry: **257 calls / 415,326 triangles**. Including postprocessing: **271 calls / 415,340 triangles**. Desktop dev measurement in `heavy-metrics.json`: six 2-second FPS windows **62.4, 62.4, 62.9, 62.7, 27.9, 41.2**, mean **53.2 FPS**. Do not present the quiet 62–63 FPS samples as an all-journey guarantee. Active scroll/capture windows earlier measured roughly 28–54 FPS; warm-up/capture dips occurred. Metrics refresh every 2 seconds, so per-shot values in forward.json can reflect the previous stage. Production performance has not been benchmarked.

During implementation HMR caused WebGL context loss and an early mismatched profile error; final reload recovered, and the profile identity was corrected. The recurring `THREE.Clock` deprecation is from the R3F/dependency path. Final-session console results are saved separately. A horizontal scrollbar is visible in the desktop captures; it is not treated as solved by this ARMI pass.

36 World/asset/choreography tests passed, TypeScript and scoped ESLint passed, and Next production build passed. Existing unrelated lint warning in `vapour-text-effect.tsx` remains. Mobile choreography and next-project visual QA were outside this requested desktop-only pass; reduced-motion/fallback compatibility remains covered by tests.

**Review status:** desktop scroll journey is implemented and ready for human cinematic review. It is not final shipping approval: verified product answer/transcript pixels, intermediate pacing/occlusion polish and production performance remain open.
