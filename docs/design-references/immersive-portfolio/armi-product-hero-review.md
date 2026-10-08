# ARMI product-first Hero review

## Scope and provenance

- Branch: `feat-immersive-portfolio-flow`; existing dirty files preserved. No commit, push, merge or deployment.
- Updated the homepage ARMI entry only. Main homepage Hero, Hangarae Hero, ARMI detail page and transition timeline/geometry were not redesigned in this pass.
- Existing detail route: `src/app/projects/armi/page.tsx`; product evidence component: `src/components/project/armi/ArmiProductScreens.tsx`.
- Reused its exact `public/videos/Patient Tablet App.mp4`. The repository contains a recording, not the original runnable tablet frontend. Hero playback is explicitly described as an original demonstration.
- Poster `public/images/armi/patient-tablet-original.png` is the unmodified recording frame at time 0, extracted through a same-origin browser video canvas. No generated or recreated UI.
- Original recording states inspected at 0, 6, 12 and 18 seconds. Greeting/request screen and conversation mode are visible in the original video. No metrics, latency or technical claims were added.
- Seated SVG figure is an illustrative human presence, not a patient photograph or anatomical model. Thin voice cue is editorial geometry, not live audio data.

## Implementation

- `ArmiExperienceHero.tsx` owns DOM copy, original product media, illustrative human foreground and subtle background depth planes.
- `armi-experience.module.css` controls the overlapping scene, desktop/mobile composition, readable copy and keyboard focus.
- Integrated through `ImmersiveProjectFlow.tsx` and four scoped wrapper rules in `flow.module.css`.
- Existing shared handoff stage remains mounted, hidden during the entry Hero. Existing Brief and handoff calculations are retained.
- No autoplay; playback starts on explicit activation, pauses when the Hero becomes inactive or leaves the viewport, and has an original-poster fallback.
- Independent human, product and depth layers allow a future Speak/Approach/Enter sequence. That full sequence is not implemented here.

## Browser passes

1. IAB 1440px captures repeated narrow columns and were rejected as evidence of visual quality. Desktop inspection continued in Chrome. Chrome viewport sizing was compensated for its existing 110% zoom, with DOM measurement confirming 1440 × 900 CSS pixels.
2. First normal desktop pass found clipped media controls and a collision between the figure and supporting copy. Reduced product width, raised its position, moved the human down and moved controls away from the global Docent launcher.
3. Desktop second pass verified dominant original UI, readable greeting/request controls, layered human/product relationship and complete playback button. Native accessibility activation verified actual video playback and pause without leaving the Hero.
4. IAB mobile at 390 × 844 found the figure offscreen. Revised only mobile figure positioning and placed it behind the product, preserving unobstructed original UI. Subsequent screenshot shows the figure, original screen and playback control; document width does not exceed viewport width.
5. Mobile reduced-motion verified static entry composition, no autoplay and no horizontal overflow.

Screenshots: `armi-product-desktop-pass2.jpg`, `armi-product-mobile.jpg`; production desktop capture: `armi-product-final.jpg`.

## Validation

- `npm test`: 453/453 passed.
- Scoped ESLint on the new Hero and flow integration: passed.
- `git diff --check`: passed (existing line-ending warning only).
- `npm run build`: passed. Existing unrelated unused-variable warning in `vapour-text-effect.tsx` was left unchanged.
- Production browser verified original UI entry, Brief, deconstruction (~28%), moving points (~50%), pose construction (~76%), Hangarae arrival, and reverse return to the product Hero. Leaving the Hero pauses its recording. Existing Brief fade overlaps topology briefly during the early handoff; that behavior was observed and retained under the explicit no-transition-redesign scope.
- Desktop document width 1434px at a 1440px CSS viewport; no document horizontal overflow. Mobile document overflow check also passed.
- Development CSS hot reload logged two transient `mini-css-extract-plugin` errors; fresh production reload produced no new browser error entries during this review.
- Local production server remains available on port 3000.
- Global vendor files and unrelated lint warnings were not modified.
