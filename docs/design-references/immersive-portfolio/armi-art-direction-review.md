# ARMI 03–08 art direction review

Reviewed in the actual localhost production Browser on 2026-10-05. No external research or dependencies added. Branch: `feat-immersive-portfolio-flow`. PASS1 remains `f0430e9bb4597349955299515d2682d3aebf0155`. Index is empty; no new commit, push, merge or deployment. Existing unrelated tracked and untracked work was preserved.

## Evidence and scope

Golden route: **Text Answer**, a documented LangGraph route that fits the original conversation-mode product presentation. `src/data/armiCaseStudy.ts:51–52,98,197,261,276` documents Qwen 30B, LangGraph StateGraph, Google Cloud STT, and Text Answer / Tavily Search / Memory Retrieval / Robot Action. `src/data/projectDetails.ts` and `src/components/project/armi/ArmiProductScreens.tsx` were cross-checked. The original `public/videos/Patient Tablet App.mp4` is reused; the return uses its conversation-mode frame at 18 seconds.

The recording does **not** independently establish that the depicted request executed Text Answer, nor a verified transcript or answer. The journey explicitly says it is explanatory. No invented answer, medical sentence, latency, telemetry, coordinate value or architecture subsystem was added. Redis and Chroma remain repository facts, but are not forced into this route.

The processing planes, asymmetrical atrium, four entrances, selected light, response bands and trajectories are spatial metaphors, not hardware, live execution or an original architecture diagram. Canva references define composition and color only.

ENTRY and Portal behavior before master progress .32 remains locked: original product plane/video, waveform-to-packet, first-person approach, aperture, VideoTexture color/aspect, local timing and pointer behavior. The old repeated post/tunnel treatment after Portal, symmetric route branches and separate result marker were replaced. The persistent Canvas, camera, request instances, original product plane, director, GSAP/Lenis clock, video controls and Brief handoff were reused.

## Eight-frame plan and progress

| Key | Meaning | Master progress | Camera / dominant visual |
|---|---|---|---|
| 01 ENTRY | My voice becomes a request | original local timing within 0–.32 | Locked original Tablet / incoming waveform |
| 02 PORTAL | I enter the actual product | original local timing within 0–.32 | Locked approach and product aperture |
| 03 UNDERSTAND | Raw voice becomes ordered request | .32–.43 | Brake, side drift, narrower FOV; three thin bright planes |
| 04 ROUTING | Discover four possible operations | .43–.60 | Lateral reveal and yaw; large empty atrium, asymmetric thresholds |
| 05 DECISION | This request commits to Text Answer | .60–.70 | Position holds .605–.66; one path activates near to far; delayed look rotation |
| 06 TRAVEL | Follow the selected operation | .70–.84 | Separate camera, look and signal curves; accelerate, pass two structures, curve and brake |
| 07 RESULT | The same request becomes response | .84–.92 | Almost stationary, stable FOV; same bars expand into warm information bands and condense |
| 08 RETURN | Return the response to the same product | .92–1 | Response goes ahead; camera begins following after .938; stable front landing by .985 |

PASS1 local timing is preserved exactly through `entryLocal(p)=p/.32`; existing local Entry/Voice/Approach/Enter labels were not renumbered. The new interior uses 03–08. All state changes are functions of normalized progress, with local easing rather than event-driven one-way triggers. Decision and Result deliberately stop movement. Return bank/roll is zero. No scene Canvas replacement or fade-to-black is used.

## Blocking, review and fixes

Basic geometry/material blocking was captured and reviewed as `blocking-contact-sheet.jpg` before detail. A second blocking review corrected a weak Decision composition and camera/request framing. Detail then added limited registration marks, sequential Line2 segments, local lighting and varied response bands.

Observed problems and fixes:

- Initial oversized STT wall: reshaped into thin layered planes with side-observed thickness and raw/ordered signal on opposite sides.
- Routing/Decision looked too similar: raised the waiting request, delayed orientation, added a single strong diagonal and sequential selected lighting.
- Return camera outran its signal: response travels ahead, early camera hold and independent response-facing look target keep it visible.
- Mobile Decision signal left the frustum: adjusted compact look target. A regression test now checks every .001 progress sample through .43–.985 on both viewports.
- Inactive Memory name collided with desktop identity during Decision: inactive annotations now finish at .60; only Text Answer remains during commitment.
- Mobile route names clipped at left/right edges: compact annotation anchors move to inward opening edges. All four names are visible in final mobile Routing.
- Existing entrance posts competed with the new interior: original entrance geometry stays unchanged before .32, becomes hidden after .345, and is restored near the original product on Return.

Final contact sheet was directly viewed. Thumbnail silhouettes differ: actual product, aperture, bright processing planes, open possibilities, one diagonal, foreground travel structure, warm response bands, actual product again. ENTRY / PORTAL / UNDERSTAND / RESULT / RETURN supply the strongest standalone compositions.

Internal visual review scores, **subjective self-assessment**, not external user approval or measured quality. Order: silhouette / composition / depth / semantic clarity / lighting / motion purpose / ARMI specificity.

| Frame | Scores | Average |
|---|---|---|
| 03 | 9 / 8 / 8 / 9 / 8 / 9 / 8 | 8.43 |
| 04 | 8 / 8 / 9 / 8 / 8 / 9 / 8 | 8.29 |
| 05 | 8 / 8 / 8 / 9 / 8 / 9 / 8 | 8.29 |
| 06 | 8 / 8 / 9 / 8 / 8 / 9 / 8 | 8.29 |
| 07 | 9 / 8 / 8 / 8 / 9 / 9 / 8 | 8.43 |
| 08 | 8 / 8 / 9 / 9 / 8 / 9 / 9 | 8.57 |

## Browser QA

- Desktop CSS viewport confirmed **1440×900**. Eight checkpoints, Return intermediate .944, real wheel scroll, original video play/pause and Brief skip link were checked. Actual video reports readyState 4 and Return currentTime 18. One journey Canvas remains mounted. No console errors in the final production tab.
- Mobile CSS viewport confirmed **390×844**. All eight checkpoints were directly captured. Body remains 16px / 1.6; captions 15px; labels 12px; controls 44px minimum. Final route names are readable, request remains in frame, CTA does not collide with narrative, and document scrollWidth does not exceed viewport width. Original mobile ENTRY/Portal remain intact.
- Reduced motion, desktop and mobile: journey mode is `reduced`, zero journey Canvas, no camera flight. Different SVG still keys preserve STT / routing / selection / travel / result, with original product evidence on return. Reverse phase sequence directly checked: result → travel → decision → routing → stt → enter → entry.
- Normal reverse: directly captured result, travel, decision, routing, understand and Portal after returning from actual UI. Selected path returns to lime only after decision; no active path is retained in routing. Original video returns to initial evidence on Entry.
- Existing Brief and downstream morph were inspected at transition quarter / middle / three-quarter / arrival. Brief fades into detached neutral points, cobalt illustrative pose, then existing Hangarae spatial visualization. No changes were made to that choreography in this turn.
- Desktop DPR remains 1–1.5; compact DPR 1. Shared temporary vectors are reused; no React setState inside the journey useFrame work. Actual phone GPU/frame-time benchmarking was not performed.

**Capture limitation:** the CSS viewport is 1440×900, but the Codex native screenshot surface is narrower (the saved desktop JPEG is 1227×900) and clips the far right of the browser presentation. These are real native Browser renders, not source-generated images. The browser override's native horizontal scrollbar is not document overflow; DOM overflow was separately checked. Full uncropped 1440px image export remains unverified. Do not use the earlier tiled CDP PNG attempts as QA evidence.

## Validation

- `npm run build`: pass after final source edits (`docs/qa/art-final-build.txt`).
- `npm test`: **460/460 pass** on final standalone run (`docs/qa/art-final-test.txt`). An earlier concurrent build/test run had 459/460: unrelated `worker-lifecycle.test.ts` timing assertion took 1916ms. No worker source/test was changed; re-running without compilation passed all tests.
- Scoped ESLint: pass for the entire armiJourney folder and `tests/armi-journey.test.ts` (`docs/qa/art-scoped-lint.txt`).
- `npm run lint`: existing **32 errors / 141 warnings**, 173 problems (`docs/qa/art-global-lint.txt`), including unrelated .claude skill scripts/public vendor and existing vapour warning. Those files were not modified to satisfy lint.
- `git diff --check`: pass. Staged diff empty. No new commit.
- Journey regression tests cover locked entry behavior, finite camera/look samples, continuity, exact reverse restoration, independent signal lead, quiet decision/result and desktop/mobile request frustum visibility.

## Modified source in this turn

`src/components/sections/ImmersiveProjectFlow/armiJourney/`: `ArmiCameraRig.tsx`, `ArmiCanvas.tsx`, `ArmiEnvironment.tsx`, `ArmiExperience.tsx`, `ArmiVoiceSignal.tsx`, `ArmiSystemWorld.tsx`, `ArmiStillWorld.tsx`, `goldenPaths.ts`, `experienceData.ts`, `journey.module.css`; and `tests/armi-journey.test.ts`. Existing Golden Journey changes to `ArmiScrollDirector.ts`, `ArmiTabletPortal.tsx` and the flow/Brief integration were retained. Existing unrelated dirty and untracked files remain unstaged.

## Screenshot paths

Root: `C:/Users/kbs02/Desktop/beomseok-portfolio/docs/design-references/immersive-portfolio/`.

| Frame | Desktop | Mobile |
|---|---|---|
| 01 ENTRY | [art-01-entry.jpg](art-01-entry.jpg) | [art-mobile-01-entry.jpg](art-mobile-01-entry.jpg) |
| 02 PORTAL | [art-02-portal.jpg](art-02-portal.jpg) | [art-mobile-02-portal.jpg](art-mobile-02-portal.jpg) |
| 03 UNDERSTAND | [art-03-understand.jpg](art-03-understand.jpg) | [art-mobile-03-understand.jpg](art-mobile-03-understand.jpg) |
| 04 ROUTING | [art-04-routing.jpg](art-04-routing.jpg) | [art-mobile-04-routing.jpg](art-mobile-04-routing.jpg) |
| 05 DECISION | [art-05-decision.jpg](art-05-decision.jpg) | [art-mobile-05-decision.jpg](art-mobile-05-decision.jpg) |
| 06 TRAVEL | [art-06-travel.jpg](art-06-travel.jpg) | [art-mobile-06-travel.jpg](art-mobile-06-travel.jpg) |
| 07 RESULT | [art-07-result.jpg](art-07-result.jpg) | [art-mobile-07-result.jpg](art-mobile-07-result.jpg) |
| 08 RETURN | [art-08-return.jpg](art-08-return.jpg) | [art-mobile-08-return.jpg](art-mobile-08-return.jpg) |

Combined: [art-contact-sheet.jpg](art-contact-sheet.jpg). Additional evidence includes `art-return-mid.jpg`, `art-reverse-*.jpg`, `art-reduced-mobile-*.jpg`, `art-reduced-desktop-*.jpg`, `art-brief-handoff.jpg`, `art-morph-quarter.jpg`, `art-morph-mid.jpg`, `art-morph-threequarter.jpg`, `art-morph-arrival.jpg`.

## Remaining limits

Full repository lint still fails outside this change. No real-phone performance measurement. The video is original product evidence, not a trace of a verified Text Answer request. Native desktop screenshot crop is described above. Visual quality scores require the user's review. Production server is left running at `http://localhost:3000/#armi` for review.
