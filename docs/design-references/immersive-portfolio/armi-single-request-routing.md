# Single request — Golden Route Text Answer

User-confirmed on 2026-10-08. Existing armi-art-direction-review.md identifies Text Answer as the Golden Route. This selects the explanatory portfolio journey; it does not establish a tested utterance-to-route mapping.

## Evidence
- src/data/armiCaseStudy.ts and projectDetails.ts document the four Tool Calling branches.
- Inspected the existing Patient Tablet App.mp4 in localhost native playback, including conversation-mode and final idle product UI. No verified request transcript paired with Text routing was recovered from the viewed evidence. This was visual inspection, not audio transcription or a claim that no request exists anywhere in the recording.
- Input remains USER REQUEST. Authored previs TextBody-0 (Hello ARMI) is hidden; no invented user utterance is substituted.

## Runtime contract
Real UI → voice intake → four available candidates → Text selected → Core pass once → Text only → vertical response lift → answer composition → same real UI.
- No executed request path or main-journey camera visit exists for Memory, Tavily, Robot. Candidate-only animations now appear together in the split-screen preview (see revision below).
- Inactive landmarks remain visible. Their materials and four corresponding practical lights dim after selection; names and physical geometry remain.
- Text activation has a selected base strip plus a brighter viewer-paced rail trace. Request waits at the Core entrance during selection and follows authored ingress/Text rails.
- Response retains Text intake/Answer only. Memory/Web/Action intakes and corresponding response rows are hidden.
- Motion samples remain absolute and reversible. WorldCameraController remains the camera owner. No GLB or Blender geometry changed.
- Desktop track 1280 → 980svh; mobile 1060 → 820svh. Existing reduced-motion/fallback narrative already described one Text route and is retained.

## Visual QA
First pass: actual 1440×900 review surface and narrow main page. Found selected strip inherited an empty geometry draw range, development cleanup removed its binding, and unused response rows still implied all four outputs. Fixed full selected draw range/remount binding and hid three unused rows. Narrow narrative/footer overlap fixed with a higher narrative position.
Second pass: actual localhost main page at desktop size: candidates, Text selection, Text execution, Text-only response, original UI return; reversed to candidates and selection reset. Saved images in armi-golden-routing/. No console errors in final checks. Existing THREE.Clock deprecation and Next Fast Refresh notices remain.
Checks: TypeScript, scoped ESLint, choreography/request/selected-route/world-runtime tests. Mobile spot check performed; full mobile, reduced-motion and downstream Hangarae visual sweep not repeated in this routing-scoped pass.

UI intake also uses a short shrinking signal, replacing the previous broad arc. No product behavior is asserted by this explanatory motion.

## Revision: scroll-paced ingress and four-way preview — 2026-10-08
User requested gradual bottom-to-Core ingress, four simultaneous animated destination views, Text selection, then the existing Text bridge/Response/return.
- Ingress now starts at the actual rail bottom at .155. Arc-length-normalized scroll travel reaches Core at .275; no camera projection or .4 initial offset. Signal draw range uses the same curve parameter as the head. Request holds at Core until .395.
- Four-way scissored views run .275–.385 in the existing WorldRenderPipeline. Scene/GLB shared; no extra Canvas, duplicated GLB or changed final World camera. Inspection cameras do not mutate the WorldCameraController camera.
- Scroll-sampled candidate clips animate .275–.355; Text selection highlights .355–.385. Other panels dim. Preview labels explicitly distinguish capabilities from execution; no request is rendered in any candidate pane.
- Core traversal and Text bridge/arrival retimed; only Text executes in the main journey. Response lift/composition and UI return retained, with upstream timings synchronized.
- First visual pass found Tavily foreground occlusion and the Core request appearing at Robot pane edge. Reframed Tavily and hid Core/request during preview rendering, restoring visibility immediately after each render.
- Second actual-home pass checked desktop four panes, selection, bridge, Text arrival, Response, product return and reverse restoration. Screens in armi-routing-split/. Narrow-screen spot check performed; reduced-motion and full downstream Hangarae sweep not repeated.
- 23 scoped tests pass, including continuous ingress/hold and preview-animation reverse/reset. TypeScript/scoped ESLint pass. Console: existing THREE.Clock deprecation only in final check; no errors.
- Four-pane sample: 482 geometry draw calls, 1,114,881 triangles summed across four views. Observed desktop sampling 35.4 FPS, recent average 33.6; diagnostic sample, not an all-device performance claim.
- Next dev cache produced Windows UNKNOWN file-read errors. Preserved cache at D:/portfolio-world-v2-3d/qa/runtime-cache-backups/next-read-error-20261008; fresh cache and localhost:3000 server restored.
`nFinal narrow-screen fix: widen preview-camera FOV by pane aspect so all three Text/Tavily panels fit. Hide footer/skip overlay during the four-way beat. Confirmed revised narrow-screen and desktop selection screenshots.
