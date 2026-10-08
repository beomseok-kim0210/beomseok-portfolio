# Response → UI → TTS visual handoff

- Return packet has no neon line. The existing Response trail ends before the UI return beat.
- Packet follows viewport-registered product bounds, shrinks/fades into the UI, then emerges beneath the same product surface and expands into a speech waveform beside a speaker silhouette.
- No fabricated response transcript or synthesized audio added; this is the scroll-driven visual representation of TTS output.
- Desktop 1440 × 900 inspected at 0.925 (UI intake, SVG trail opacity 0), 0.965 (speech unfolding), 0.990 (speaker/wave), including reverse seek. Mobile 390 × 844 speaker/wave fits beneath product.
- Browser console errors: none observed. TypeScript and targeted ESLint passed.
- Core, selected route, destinations, production asset, final camera owner and opening voice morph preserved.

Captures: 01-ui-intake.png, 02-speech-unfold.png, 03-tts-waveform.png, mobile-tts.png.
