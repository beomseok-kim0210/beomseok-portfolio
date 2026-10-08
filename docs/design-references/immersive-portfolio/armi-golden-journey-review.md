# ARMI Golden Journey review — 2026-10-05

PASS 1 is preserved in `f0430e9bb4597349955299515d2682d3aebf0155` (`feat: add ARMI first-person portal entry`). Its 15 selectively staged files include the original product poster, entry source, integration, synchronized scroll ticker, regression tests and its review document. Existing typography, DD, earlier architecture experiments, local settings and QA captures were left outside that commit. Branch: `feat-immersive-portfolio-flow`. Golden Journey remains uncommitted; nothing was pushed, merged or deployed.

## Golden Route and evidence boundary

Chosen route: **Text Answer**. `src/data/armiCaseStudy.ts` documents Text Answer / Robot Action / Tavily Search / Memory Retrieval and Google Cloud STT. `src/data/projectDetails.ts` documents LangGraph StateGraph and structured routing. `src/components/project/armi/ArmiProductScreens.tsx` identifies the original `Patient Tablet App.mp4` recording. Its conversation mode and Avatar state are visible in the recording, including the frame at 18 seconds used for product return.

The recording does **not** independently prove that a particular recorded request executed Text Answer, and it does not provide a verified answer sentence for this journey. Therefore no answer text, patient request, search result, latency, confidence or telemetry was synthesized. The endpoint is the actual conversation-mode recording, not a recreated frontend. The new return poster is an unedited frame from that same recording, used while video decoding is unavailable.

Redis and Chroma remain in the existing Brief evidence; they were not inserted into this Text Answer journey. Nothing claims that all four paths execute together.

## Structure and changed files

The original `paths.ts` entry curves, `ArmiEnvironment.tsx` entrance staging and `SmoothScroll.tsx` Lenis/GSAP synchronization were retained. There is one persistent Canvas, camera, request object and master ScrollTrigger through the normal 3D journey. Frame geometry and uniforms consume refs; React state changes only on semantic phases.

New sources:

- `src/components/sections/ImmersiveProjectFlow/armiJourney/goldenPaths.ts`: independent camera/look curves, spatial branch curves and return path; deterministic sampling for mobile and reverse scrolling.
- `src/components/sections/ImmersiveProjectFlow/armiJourney/ArmiSystemWorld.tsx`: open STT boundary, routing infrastructure, one active route, response-forming boundary and return depth cues. Its DOM annotations remain subordinate to the 3D space.
- `public/images/armi/patient-tablet-conversation-original.png`: original recording frame, not generated artwork.

Modified sources:

- `ArmiCameraRig.tsx`: samples the expanded choreography while retaining PASS 1 entry timing.
- `ArmiCanvas.tsx`: mounts the additional world inside the existing Canvas.
- `ArmiExperience.tsx`: full semantic sequence, original video return/controls and equivalent reduced-motion/fallback stages.
- `ArmiScrollDirector.ts`: one extended clock and direct reduced-motion scrub.
- `ArmiTabletPortal.tsx`: closes the same aperture on return and uploads paused/seeked video frames reliably.
- `ArmiVoiceSignal.tsx`: same request gathers, compresses, gains a warm response core and reaches the product surface.
- `experienceData.ts`: documented routes, semantic ranges and original recording reference.
- `journey.module.css`: extended scroll distance, portrait composition and readable content.
- `ImmersiveProjectFlow.tsx`: one minimal correction hides the old topology until its handoff begins, preventing early Brief overlap. Existing morph geometry and timing were not redesigned.
- `tests/armi-journey.test.ts`: entry preservation, independent look targets, finite camera samples, boundary continuity, 3D route depth, original-plane return and deterministic reverse traversal.

## Scroll phases

| Progress | Phase |
| --- | --- |
| 0–.0576 | Original product / Entry |
| .0576–.128 | Voice becomes request |
| .128–.224 | Original Tablet approach |
| .224–.32 | Same aperture / Portal entry |
| .32–.43 | STT / signal compression |
| .43–.60 | Routing chamber discovery |
| .60–.72 | One route selected: Text Answer |
| .72–.84 | Camera travels the selected branch |
| .84–.89 | Same signal gains response state |
| .89–.985 | Return through the same world toward the Tablet |
| .985–1 | Stable actual product recording / then existing Brief |

Desktop uses 1280svh; mobile 1060svh. Mapping the original entrance onto the first .32 approximately preserves its original absolute scroll distance. Reduced motion uses a shorter 750svh track, no Canvas flight and the same 11 semantic stages.

## Illustrative visualization

All scene coordinates, structural surfaces, processing geometry, route shapes, waveform bars, response core, aperture and camera paths are explanatory art direction. They are not measured sound, real server layout, live Agent execution, actual storage locations or an exact representation of internal hardware. Local Canva references informed dark/lime composition and depth only; no metrics or architecture were copied from them. The existing bright Hangarae world remains independent.

## Actual Browser QA and fixes

Desktop DOM viewport: 1440×900. Mobile DOM viewport: 390×844. Localhost rendering was inspected directly, including an actual wheel-scroll action and forward/reverse traversal. Intermediate checks included STT, chamber, selected branch, response, return path, product landing and the subsequent Brief.

First visual pass found early rightward orientation hiding paths, a near-camera tube rendering as a large band, and a black paused video texture at product return. Camera/look separation, infrastructure offset and explicit video-frame upload resolved these. Later portrait checks found signal/title overlap, clipped route labels, cropped product return and overlapping playback control. Signal offset, portrait annotations, return camera distance/look target, control placement and text wrapping resolved them. Return infrastructure clears the original UI on landing; the return camera now turns toward that same Tablet early enough to reveal it during the approach.

All four route names are readable in the discovery view. Only Text Answer becomes lime. The request's warm core is visible at response/return. Original video play/pause was checked through actual UI controls. Product return uses the recording at 18 seconds, with the original-frame fallback available. The Brief appears after landing without the earlier topology overlap.

Mobile body remains 16px with 1.6 line-height; explanation caption is 15px; annotations are 12px. No document horizontal overflow was measured. Portrait UI return is fully framed and its playback button does not intersect the narrative.

Reduced-motion QA confirmed `data-render-mode="reduced"`, zero journey canvases, all 11 phases in both forward and reverse order and no horizontal overflow. Its original return image/video is positioned separately from the narrative.

## Validation and known limitations

- Full `npm test`: 457/457 passed.
- `npm run build`: production compilation, type checking and page generation passed; existing `vapour-text-effect.tsx:469` unused-variable warning remains.
- Changed-scope ESLint: passed.
- `npm run lint`: existing 32 errors / 141 warnings outside the changed journey (including local skill scripts and `public/vendor`). These files were not modified to force a global pass.
- `git diff --check`: passed. Index remains empty after the PASS 1 commit.
- Existing reduced-motion hydration warning points to unchanged `ShowcaseMotion` / `MotionBlock` in personal-project/contact content. It does not switch this journey to fallback or remove its stages.
- Real device GPU performance / guaranteed FPS was not benchmarked. Mobile verification was browser viewport testing.
- Product recording demonstrates UI states, not independently traced execution of this exact illustrative request.

## QA captures

All files below are local Browser screenshots, uncommitted.

| Checkpoint | Desktop | Mobile |
| --- | --- | --- |
| Entry | [golden-entry.jpg](./golden-entry.jpg) | [golden-mobile-entry.jpg](./golden-mobile-entry.jpg) |
| Portal | [golden-portal.jpg](./golden-portal.jpg) | [golden-mobile-portal.jpg](./golden-mobile-portal.jpg) |
| STT | [golden-stt.jpg](./golden-stt.jpg) | [golden-mobile-stt.jpg](./golden-mobile-stt.jpg) |
| Routing | [golden-routing.jpg](./golden-routing.jpg) | [golden-mobile-routing.jpg](./golden-mobile-routing.jpg) |
| Active route | [golden-active-route.jpg](./golden-active-route.jpg) | [golden-mobile-active-route.jpg](./golden-mobile-active-route.jpg) |
| Result | [golden-result.jpg](./golden-result.jpg) | [golden-mobile-result.jpg](./golden-mobile-result.jpg) |
| Return / actual UI | [golden-return.jpg](./golden-return.jpg) | [golden-mobile-return.jpg](./golden-mobile-return.jpg) |

Additional captures: [return path](./golden-return-path.jpg), [Brief after landing](./golden-after-brief.jpg), [reduced routing](./golden-reduced-routing.jpg), [reduced product return](./golden-reduced-return.jpg). Test/build/lint logs are in `docs/qa/golden-*.txt`.
