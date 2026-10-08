# Routing Core cue / Text selection pulses

- Core sign and switching spindle receive isolated, restrained emissive modulation before the options beat. No global exposure or bloom increase.
- Four views now crossfade over the held Core camera through an HDR multisampled render target; WorldCameraController retains main camera ownership.
- Text frame follows three scroll-driven pulses during selection, then returns to its neutral border. Selected status remains readable.
- Browser checked at desktop 1440 × 900: Core at 0.340, transition at 0.349, pulse peaks at 0.407833 / 0.4195 / 0.431167, ended pulse at 0.440. Actual Home scroll checked at 0.341039 / 0.408286 / 0.444201, including reverse scroll.
- No console errors observed. Existing THREE.Clock deprecation warning remains.
- Targeted suite: 25 tests passed. TypeScript and targeted ESLint passed.
- Existing GLB geometry, remaining journey, authored cameras and golden-route selection semantics preserved.

Captures: `home-core-glow.png`, `core-crossfade.png`, `home-text-pulse.png`, `text-pulse-1.png`, `text-pulse-3.png`, `text-pulse-ended.png`.
