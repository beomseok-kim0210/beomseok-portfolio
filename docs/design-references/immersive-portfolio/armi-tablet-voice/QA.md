# ARMI voice entry and tablet presentation

2026-10-08. Applied to the existing homepage on feat-immersive-portfolio-flow.

- Opening voice is now a separate DOM layer in the left editorial space, visible from progress 0.025–0.045 onward. Microphone + 31 white waveform bars converge into a larger lime disc over 0.082–0.12, then hand off continuously to the existing request head. No invented utterance was added.
- Request intake is registered to the actual image bounds rather than the surrounding device frame, preserving the intended voice button endpoint on resized viewports. Return-to-UI / visual TTS flow is retained.
- Product is presented inside a landscape tablet shell: metallic edge, dark bezel, rounded screen, centered camera, side buttons. Device caption reflects the user's evidence that the project ran on a Samsung Galaxy Tab. No exact model or hardware specifications are claimed; shell is a visual representation, not a measured hardware replica.
- Original product screenshot remains unchanged and stays outside WebGL tone mapping/bloom.

Browser passes: actual localhost homepage at 1440×900, forward/reverse scroll through voice→disc; review route at 0.07 / 0.124 / 0.145; actual homepage mobile at 390×844. First pass revealed the tablet crowding the left headline at 1440px. Reduced desktop width to 62% (maximum 1150px), then verified the final homepage layout again. Mobile places the waveform above the tablet rather than squeezing it into the left column.

Reduced-motion mode still resolves to the existing reduced static narrative, which does not run this scrubbed animation. Emulated media and temporary viewport overrides were reset. This scoped change does not alter chamber geometry or the later Hangarae transition.

TypeScript noEmit and targeted ESLint passed. No new browser console errors were observed during the visual checks.

Screens: home-wave-final.png, home-orb.png, home-mobile.png, desktop-intake.png. Review route screenshots include diagnostic controls; homepage screenshots show the actual layout.
