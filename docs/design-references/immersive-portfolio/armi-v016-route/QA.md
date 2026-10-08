# v016 continuous Text route

The previous runtime connector and Text road are replaced with a Blender-authored continuous sweep from the existing Core floor outlet to the existing Text landing. The deck, paired metal rails and lime signal share the same sampled centerline and width progression. No second runtime deck remains.

The v015 production GLB is unchanged. A 112,608-byte route-only GLB (3 meshes / 3 materials / 6,068 triangles / no animations or textures) is loaded alongside it. The old Text road and the old `GEO-V013-SelectedSignal-ANSWER` are suppressed after animation sampling. Other districts retain their original assets and clips.

Obsolete Text cross-members and guide strips were removed from the v016 Blender checkpoint (808 vertices across three mixed detail objects). For the unchanged batched v015 runtime environment, equivalent removal uses the authored Text path to filter only nearby triangles in batches containing those three detail objects. This runtime mask should be replaced by the cleaned source on a future full-scene export; it has been visually checked at the Text departure/arrival views but is not a scene-wide exact topology comparison.

Source checkpoint: `D:/portfolio-world-v2-3d/armi/routing-chamber/blender/ARMI_Routing_Chamber_v016_ContinuousTextRoute.blend`
Portable route: `D:/portfolio-world-v2-3d/armi/routing-chamber/exports/armi-v016-route/ARMI_v016_TextRoute.glb`

Validation:
- Independent GLTFLoader import in Node; no textures, decoder or browser required.
- TypeScript and scoped ESLint passed. Four tests passed for imported replacement, reverse activation, legacy signal suppression and existing choreography/camera/UI.
- Browser checks: .370 departure, .415 approach, .470 old signal visibility window, reverse .370; actual homepage .397026 screenshot saved as `home-route.jpg`.
- No browser console errors observed. Existing Clock deprecation remains outside this change.
- Blender exporter printed a missing Draco library notice on first export. This small patch deliberately uses uncompressed GLB; independent import passed. Existing v015 Draco loading remains unchanged.
