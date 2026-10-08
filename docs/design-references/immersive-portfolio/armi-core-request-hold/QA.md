# Core request hold

2026-10-08. User requested a longer spindle inspection with the existing request explanation placed in front, then removed before four destinations appear.

- Added 0.06 authored-scroll-equivalent distance to Core 0.31–0.345, expanding that interval from 0.035 to 0.095 (2.71×). The WebGL track grows from 980 to 1040svh so the added dwell does not materially compress later scenes. Existing extended Text selection hold remains intact. All later camera and animation sample times are unchanged.
- Moved USER REQUEST explanation out of the four-panel grid to an independent foreground panel. Two retained lines; deleted the third Golden Route caption. Increased width to 900px, title up to 32px, explanatory line up to 20px.
- Panel fades in at 0.312–0.323, holds through 0.334, and fades completely out by 0.345. Existing restrained Core glow and 0.345–0.357 four-view crossfade remain. No request panel is visible during the split view.
- Motion remains driven by absolute scroll, reversible and deterministic. No autoplay or wall-clock delay added.

Verified actual localhost review and homepage at desktop 1440×900, mobile 390×844, and reverse seeks from split to Core. Panel is fully hidden at 0.35/0.38 and returns at 0.327. Mobile wraps within 88% width. Seven motion/timing tests passed; TypeScript noEmit and targeted ESLint passed. A transient Next cache read error was resolved by restarting the development server; review route then returned HTTP 200.

Screens: core-request.png, split-without-request.png, mobile-core.png, home-core-request.png. Scope is Core/split transition; existing later Text/Response journey and reduced-motion static fallback are retained.
