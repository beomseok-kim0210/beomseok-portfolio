# Follow-up — First-person request, authored tracks, Response lift

2026-10-08 (KST). Runtime-only choreography revision; v015/v016/v017 Blender and GLB assets preserved.

- Until Text arrival (.447), request remains 4 units in front of the camera, slightly below the sightline. Final .440–.447 blends into the Text receiving point. Track activation samples the camera's nearest route position rather than advancing on an independent timer.
- Subsequent handoffs use source route_points stored in GLB extras. Paths reverse along the previous district track, cross the junction, and proceed along the next track; no repeated interior Core-pass shot.
- Response approach reaches a lower staging height at .818. Camera rises from Y35 to Y61 with X/Z fixed, arriving .850. Request rises along an exterior axis in front of the compositor platform, then docks into its panel. Functional animation still waits until .858.
- Opening DOM request endpoint adjusted to the camera-relative marker's screen position. Existing response-to-UI return preserved.

Validation: TypeScript PASS; scoped ESLint PASS; seven focused tests PASS. Actual localhost browser inspected in two passes, including reverse restoration, first-person Text approach, later route transition, Response lower/middle/arrival poses and actual homepage. Initial lift below Y19 showed too much empty wall; raised staging to Y35. Lift axis moved outward after the platform occluded the request. No captured browser console errors.

Desktop screenshots in this folder. Mobile/reduced-motion and unrelated Hangarae transitions were not retested in this scoped pass. Browser background-throttled FPS is not reported as a performance measurement.
