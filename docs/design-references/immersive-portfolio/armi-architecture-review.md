# ARMI home / computational architecture review

Visual direction: user-supplied ARMI hero prompt + local references A/B/C. Reference text and metrics are not facts.

## Implementation
- Replaced the contained planar diagram with a large, asymmetric projected routing architecture.
- Foreground cropped routes, dominant layered routing junctions, and faint receding topology form three depth layers.
- Selected request branch + input route receive lime; inactive outputs and memory remain graphite.
- DOM labels describe documented VOICE/STT/LangGraph, response, Tavily search, robot action, Redis originals/realtime state, Chroma semantic memory.
- Geometry is an editorial SVG projection, not an actual runtime graph or measured coordinates.
- Reused the existing shared point identities, pose target and Brief/CTA timeline. No scroll duration changes.
- Mobile and reduced motion use a simplified static endpoint composition.

## Browser passes
1. Existing 1440 x 900: a small complete diagram, weak hierarchy, uniformly active branches.
2. First implementation: routing line crossed the title; Chroma caption too close to lower crop. Removed the input line behind editorial text and moved the caption upward. Windows module resolution also required distinct component/data basenames (ArmiArchitecture / armiRouting).
3. Second pass at 1440 x 900: selected Memory route updates graphite/lime and supporting description. Left editorial area clear. Brief and last CTA remain. Forward/reverse handoff observed at .253, .389, .636, .759 and arrival: same points detach, redistribute, align and connect to illustrative pose. Reverse returns to SYSTEM without old Hero reappearing during Brief.
4. Mobile 390 x 844: body computed 16px, scrollWidth 375 <= innerWidth 390; separate graphic and readable pipeline text precede Brief. No horizontal overflow observed.
5. Desktop reduced motion: static endpoint layout, sticky display contents, scrollWidth 1433 <= innerWidth 1440.

6. Production 1024 x 768: no observed editorial/label collision; scrollWidth 1017 <= innerWidth 1024. Tab + Space selects Search with aria-pressed=true and solid focus outline. Final production screenshot saved at 1440 x 900; temporary viewport/media overrides reset.

## Existing limitation observed
Reduced-motion reload emits hydration attribute mismatch in ProjectIndexSection/ShowcaseMotion and Contact/MotionBlock, outside the ARMI implementation. Existing THREE.Clock deprecation warning also remains. No ARMI runtime error after the module naming correction.

## Validation
- npm test: 453/453 pass.
- ESLint ImmersiveProjectFlow: pass.
- git diff --check: pass.
- Production build: pass (existing vapour-text-effect unused-variable warning remains). Log: docs/qa/armi-architecture-build.txt.
- No commit, push, merge or deployment.
