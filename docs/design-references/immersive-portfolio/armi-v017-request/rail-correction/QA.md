# Rail correction — 2026-10-08

Supersedes follow-lift camera-relative marker implementation.

- Removed the camera-relative / HUD position and its disabled depth test. Request positions now come exclusively from route curves.
- Until Text arrival, project a point 8 units in front of the viewer onto the rail. Ingress progression is bounded near that projection; Text docks during .440–.447. This maintains proximity within the existing camera composition; Euclidean distance can vary where the camera is offset from the rail.
- Ingress and Text activation end at the same curve parameter as the leading request. Ingress tail is drawn from the bottom of the rail rather than starting halfway up it.
- Response path contains only the vertical lift and front docking segment. Removed the entire Robot-to-Response side approach from its trail. It becomes visible at .818 and rises from below.
- Existing approved GLBs, authored scene geometry and WorldCameraController ownership preserved.

TypeScript, scoped ESLint and seven focused tests passed. Browser comparison covered ingress, Text rail, Response vertical rise and reverse seeking. Actual homepage refreshed and checked. Desktop evidence in this folder; mobile and reduced-motion not retested in this correction.
