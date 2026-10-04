# ARMI request journey — PASS 1

## Authorized scope

The attached request explicitly ends with PASS 1: VOICE → TABLET APPROACH → PORTAL ENTRY. This pass removes the dominant human illustration and establishes first-person entry. STT, routing chamber, golden route, result and return are future passes, not completed features.

Branch: `feat-immersive-portfolio-flow`. Existing dirty and untracked work was preserved. No commit, push, merge or deployment.

## Repository investigation and evidence

- Existing ARMI detail page: `src/app/projects/armi/page.tsx` → `ArmiCaseStudy` → `ArmiProductScreens`.
- Actual product media: `public/videos/Patient Tablet App.mp4`, 1728 × 1080; original unmodified poster from its first frame. This repository supplies a recording rather than runnable original frontend source.
- `src/data/armiCaseStudy.ts` documents voice input, Google Cloud STT, LangGraph and Text Answer / Tavily Search / Memory Retrieval / Robot Action. `projectDetails.ts` documents Redis original/realtime state and Chroma semantic memory. These are retained as evidence for future stages, not surfaced in the entry.
- Existing R3F, Drei, Three.js and GSAP dependencies reused; no package installation or external research.
- Existing Lenis used an independent RAF. It now uses the GSAP ticker and calls ScrollTrigger.update on Lenis scroll, with cleanup on unmount. No second smooth-scroll instance was added.
- Existing handoff geometry, `briefTimeline`, Hangarae narrative and Wedding transition were not changed. The new journey is inserted before the existing handoff track. Its initial old Hero window now shows the existing Brief, avoiding a duplicate Hero. Layout observer refreshes the new section height.

## Rendering architecture

- `ArmiExperience`: section, sticky viewport, semantic state, DOM copy, original video control, accessible reduced/WebGL fallback.
- `ArmiScrollDirector`: one normalized progress ref for the entry; React updates only at phase boundaries.
- `ArmiCanvas`, `ArmiCameraRig`: persistent WebGL world, PerspectiveCamera and separate CatmullRom camera/look curves. Camera passes through the actual product plane, with lateral travel and restrained banking. Mobile has a wider starting view and no banking.
- `ArmiTabletPortal`: original image/VideoTexture with correct aspect and color space. A shader aperture opens a view through the product surface to geometry already behind it. This is illustrative staging, never a simulated original app interaction.
- `ArmiVoiceSignal`: deterministic illustrative waveform converges into a small packet in peripheral first-person view. It is not microphone capture. No random particles or orb.
- `ArmiEnvironment`: restrained occluding planes and inbound depth cue; not actual hardware or architectural claims.
- `experienceData`, `paths`: evidence boundaries and deterministic choreography.

Drei MeshPortalMaterial/RenderTexture were inspected locally. PASS 1 uses one continuous world with an actual aperture instead: no second render target, scene swap, CSS zoom or fade-to-black is required. Postprocessing is not needed for this entry; the active signal has a tightly limited lime accent without scene-wide bloom.

## Actual browser iteration

Desktop Chrome was used at a confirmed 1440 × 900 CSS viewport because the IAB's narrow desktop panel previously produced invalid tiled desktop captures. IAB was used for mobile.

1. First WebGL pass: original UI appeared washed out. Explicit SRGB texture color space corrected it.
2. Voice waveform was outside the camera view. Moved waveform convergence and packet to a camera-relative first-person position.
3. Camera crossed too early. Rebalanced travel checkpoints to hold voice, approach clearly, and cross during ENTER.
4. Waveform was too large and overlapped copy; reduced its width/height. Removed the long world trail that enlarged into distracting bands near the camera.
5. Bright product close-up reduced DOM contrast. Added restrained edge shading for annotations; narrowed the portal boundary.
6. Forward travel showed the original surface and the existing world behind the opening together. Reverse travel restored the same product surface.
7. Initial mobile view cropped the original product; increased mobile entrance camera distance and centered its look target. Footer was moved clear of the existing Docent launcher.

`armi-journey-pass1-voice.jpg` records an intermediate problem. Final screenshots and final verification results are recorded below after production QA.

## Final verification

- Build passed. The existing unrelated unused-variable warning in `vapour-text-effect.tsx` remains.
- Tests: 455/455 passed, including two new camera crossing/reverse and bounded semantic-phase regressions.
- Scoped ESLint passed. `git diff --check` passed; existing LF/CRLF warnings are not whitespace errors.
- Production desktop 1440 × 900 and IAB mobile 390 × 844 rendered actual WebGL, not CSS perspective. Original VideoTexture playback and pause were verified on the product plane.
- Mobile entry shows the full product aspect. Mobile request packet was moved inward after a cropped right-edge packet was observed.
- Reduced-motion removes the Canvas and preserves product evidence and semantic entry states. Fixed the context-loss listener cleanup so an intentional Canvas unmount does not override reduced mode with fallback.
- Forward/reverse entry, product approach, open aperture, interior, existing Brief/handoff moving points and Hangarae arrival were observed. Existing early Brief/topology overlap remains outside this pass's transition scope.
- WebGL fallback was observed during development context disposal; a real unsupported-GPU device was not available to test.
- Final captures: `armi-journey-entry.jpg`, `armi-journey-portal.jpg`, `armi-journey-mobile.jpg`, `armi-journey-reduced.jpg`.
- Local production server remains on port 3000. No commit/push/merge/deploy.

## Limits

- This is entry only, not the full ARMI journey. No completed route/result/return is claimed.
- Original recording is preserved; illustrative spatial staging is explicitly identified in DOM copy and code.
- 60fps is a performance target, not a measured guarantee. DPR is capped at 1–1.5 desktop / 1 mobile; inactive sections stop their frame loop; waveform is instanced; no per-frame React updates or object allocations.
- Desktop WebGL visual quality was reviewed through Chrome; narrow IAB desktop captures were not used to judge the 1440px composition.
