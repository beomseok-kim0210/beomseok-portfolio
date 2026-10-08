# ARMI route / product return revision

- Runtime-only repair; v015 GLB and Blender source unchanged.
- Replaced the obsolete Text entry span with a continuous flared outlet deck. Removed the entry rail blocking the connection; retained the rest of the authored Text route.
- Lifted two exit camera samples above the repaired deck. WorldCameraController remains the camera owner.
- Added a lime center signal propagating with district progress .29–.44; retained during Text arrival and reset when scrolling backward. No timeline autoplay.
- Ending now uses the same original product image as opening, at its original scale. This is the existing product evidence image, not a newly implemented interactive tablet app.
- Desktop browser inspection: controlled progress .370, .415, .985; actual homepage reverse seek .369342 and forward .406566, .973625. Screenshot evidence in this folder.
- TypeScript and scoped ESLint passed. 20 relevant tests passed across choreography, selected route, asset, and runtime suites (19 existing plus one new route continuity / reverse test).
- No new browser errors observed; existing THREE.Clock deprecation warning remains.

Screenshots: `home-continuous-outlet.jpg`, `home-text-activation.jpg`, `home-original-ui-return.jpg`.
