# A production adoption

2026-10-08: User authorized applying audit variant A.

Production loader and asset manifest now reference `/models/armi/v015/ARMI_v015_Web_Clean.glb` (3,438,132 bytes / 3.279 MiB). This is byte-identical to the audited A.glb; SHA-256 CBA63E009C1CA368F7E3349157B1992B32B8DC6AC9827BB8485D066366D2ED2D.

The original ARMI_v015_Web.glb remains unchanged, and the audit baseline still points to it. Scene geometry, material calibration, runtime effects, animation control, and WorldCameraController are unchanged.

Browser Network.responseReceived verified the production clean GLB returned HTTP 200. The exact 1440×900 hero-camera canvas capture A-applied.png is pixel-identical to baseline-hero.png. Renderer reported 255 geometry calls and 404,766 triangles, with all ten semantic groups and six animation clips retained. Timeline autoplay remains disabled. Related tests: 19 passed.

Audit REPORT.md describes the pre-adoption experiment; this note records the subsequent production asset switch.
