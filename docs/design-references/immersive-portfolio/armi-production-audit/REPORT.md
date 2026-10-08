# ARMI production optimization audit

2026-10-08. Repository: D:/UserData/Desktop/beomseok-portfolio; branch feat-immersive-portfolio-flow.

## Decision

Recommend A first: lossless production-history cleanup cuts the primary GLB by 70.4% with identical Draco geometry, nodes and animation bindings. Original homepage still uses v015; variants are isolated at /world/armi-audit. No Blender re-export or production asset replacement was performed.

B reduces some draw submissions but does not materially increase FPS on this desktop. C saves only ~0.10 MiB beyond A and alters the three alternative destinations that are also close-up in the four-panel view. Keep C experimental. D offers the strongest initial-download improvement but requires hydration/readiness gating before production adoption.

## Exact bytes

The reported 11.1 MB is 11.094 MiB (11.633 decimal MB). Categories are disjoint and sum to the original file size.

| Category | Bytes | MiB | Share |
|---|---:|---:|---:|
| geometry | 1,872,820 | 1.786 | 16.10% |
| animation | 68,336 | 0.065 | 0.59% |
| embeddedTexture | 1,266,442 | 1.208 | 10.89% |
| metadata | 8,424,872 | 8.035 | 72.42% |
| otherBuffers | 0 | 0.000 | 0.00% |
| containerAndPadding | 482 | 0.000 | 0.00% |

Scene extras contain archived production snapshots, including V011_geometry_snapshot (4,731,444 bytes), V010_preserve_snapshot (2,059,046), and V009_primary_snapshot (855,048). These are not runtime geometry. Their original JSON is preserved externally in archived-production-scene-extras.json. Node extras used for visibility, source names, route points and batching are retained.

One embedded Product UI PNG accounts for the texture buffer. motion-samples.json (746,716 bytes) and runtime-manifest.json (140,488 bytes) are separate files; the cinematic motion samples are not fetched by the current runtime. Existing v016/v017 route sideassets remain unchanged in all comparisons.

## Geometry by semantic domain

Counts include mesh-node occurrences. Primitive counts are uncullled single-pass potential submissions, not actual frame draw calls. Hero calls below are measured for A (geometrically identical to baseline).

| Domain | Triangles | Vertices | Primitives | Mesh nodes | Hero calls |
|---|---:|---:|---:|---:|---:|
| Core | 40,012 | 34,482 | 45 | 24 | 41 |
| Environment | 122,256 | 132,596 | 53 | 17 | 52 |
| Memory | 98,173 | 79,547 | 33 | 23 | 25 |
| Product | 1,730 | 1,318 | 8 | 8 | 0 |
| Response | 43,276 | 40,010 | 53 | 37 | 38 |
| Robot | 31,623 | 26,025 | 33 | 18 | 29 |
| Routes | 42,912 | 35,260 | 8 | 4 | 6 |
| Tavily | 46,896 | 41,500 | 41 | 31 | 24 |
| Text | 43,026 | 39,318 | 39 | 31 | 36 |

Totals: 469,904 triangles; 430,056 vertices; 313 primitives; 193 mesh nodes; 159 unique mesh definitions; 276 nodes. Unique mesh triangle sum: 450,116. Hero runtime-effect calls are additional (4).

### Repeated geometry / instancing

15 shared mesh definitions have multiple node uses. Sharing mesh data already saves storage; it does not automatically instance GPU submissions. Runtime material cloning and visibility semantics restrict safe instancing.

| Shared mesh | Uses |
|---|---:|
| GEO-V013-MemoryContext-01-Mesh.001 | 3 |
| GEO-V013-MemoryReact-00-Mesh.001 | 6 |
| GEO-V013-MemoryReact-01-Mesh.001 | 3 |
| GEO-V014-IncomingRecord-TEXT-Mesh.001 | 3 |
| GEO-V014-ResponseRowLine-00-Mesh.001 | 4 |
| GEO-V014-ResponseRowLine-01-Mesh.001 | 4 |
| Text-Mesh.001 | 2 |
| GEO-V013-RobotJointCommand-0-Mesh.001 | 3 |
| GEO-V013-SourceLine-00-Mesh.001 | 3 |
| GEO-V013-SourceLine-01-Mesh.001 | 3 |
| GEO-V013-SourceLine-02-Mesh.001 | 3 |
| GEO-V013-TextLine-0-0-Mesh.001 | 3 |
| GEO-V013-TextLine-0-1-Mesh.001 | 3 |
| GEO-V013-TextLine-0-2-Mesh.001 | 3 |
| GEO-V013-TextLine-0-3-Mesh.001 | 3 |

B batches 27 named sources into 8 InstancedMesh objects where geometry and material identity match. Original semantic nodes and animation targets remain in the hierarchy. Hidden source instances are compacted; forward/reverse visibility is reversible. Text lines and Response row lines offer actual hero savings. Memory/Tavily/Robot independently cloned materials prevent naive batching of all repeated forms. Environment already has only 17 batched mesh roots; globally merging it would sacrifice culling and controllability.

## Camera-aware audit

Conservative transformed bounding-box frusta at 0.005 progress steps, including all four split cameras and runtime visibility/route replacements. No occlusion claim; outside-sampled-frusta is a candidate, not proof of never visible at every viewport.

153 progress samples between 0.18 and 0.94, plus all four split-view cameras: 101 close-up meshes, 156 visible at distance, 54 runtime-hidden, 2 outside sampled frusta. Classification is based on the prepared runtime scene, including replacement route geometry and visibility. Detailed object names and minimum camera distances are in asset-audit.json.

Core / Text / Response are preserved. C leaves their compressed geometry byte-identical. Memory / Tavily / Robot are simplification candidates, but not purely distant: each appears close-up in the split view. Their labels/unlit translucent presentation geometry is excluded from simplification. C modifies 50 opaque primitives using border-preserving simplification (target 65%, error 0.002) and Draco recompression.

Outside sampled frusta: GEO-R1-ForegroundCrossDeck (Environment), GEO-V014-ResponseAssemblyStatus (Response). These are removal candidates for further exhaustive viewport/occlusion QA, not proven never-visible geometry. Runtime-hidden objects include the obsolete original Core→Text/ingress geometry, Product meshes superseded by the crisp DOM product view, and inactive branch request effects. They are not deleted in A/B/C.

| Simplified domain | Original triangles | C triangles | C vertices |
|---|---:|---:|---:|
| Memory | 98,173 | 64,245 | 58,595 |
| Tavily | 46,896 | 32,376 | 30,450 |
| Robot | 31,623 | 22,907 | 19,643 |

## Variant comparison

GTX 1060 3GB, ANGLE D3D11, 1440×900, DPR 1. Actual localhost browser, Next development runtime. FPS is sampled with static representative poses; these are desktop QA observations, not production-build, WAN, mobile or isolated GPU-timer benchmarks. Small differences under ~1 FPS are inconclusive.

GLTF timings below come from explicit no-store fetch → ArrayBuffer → GLTFLoader.parseAsync boundaries. Parse includes JSON, Draco worker decode and image processing; it is not isolated Draco CPU time. It excludes first shader compilation and sideassets. Each shown value is one recorded trial, not a statistical median.

| Variant | Primary download MiB | Stored node-use triangles | Hero geometry calls | Hero rendered triangles | Hero FPS | Fetch ms | Parse/decode ms | Total ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 11.094 | 469,904 | 255 | 404,766 | 55.3 | 429.3 | 195.3 | 624.6 |
| A | 3.279 | 469,904 | 255 | 404,766 | 55.0 | 131.2 | 156.5 | 287.7 |
| B | 3.279 | 469,904 | 241 | 404,766 | 55.6 | 125.7 | 184.8 | 310.5 |
| C | 3.179 | 412,740 | 255 | 357,594 | 55.5 | 140.3 | 147.2 | 287.5 |
| D | 2.243 journey / 1.183 initial | 468,174 | 255 | 404,766 | 56.3 | 43.0 | 93.9 | 136.9 initial |

D sizes: initial 1,239,992 bytes; alternatives 807,468; Response 304,116; optional Product 1,376,236. Golden journey total 2,351,576 bytes. Including optional Product: 3,727,812 bytes. Duplication of semantic scaffold/animation references causes all-part size to exceed A. Current crisp Product UI uses the DOM; embedded Product geometry is optional. All required late districts were hydrated for D parity captures.

D preloads alternatives at progress 0.10 and Response at 0.50 in this diagnostic route. A production version must gate split/Response entry on asset readiness and handle deep links/reverse scroll; a threshold alone cannot guarantee no visible pop-in under slow network conditions. D initial-only screenshot intentionally lacks unloaded districts and is not a visual-parity claim.

| D loaded chunk | Bytes | Fetch ms | Parse/decode ms | Total ms |
|---|---:|---:|---:|---:|
| D_initial.glb | 1,239,992 | 43.0 | 93.9 | 136.9 |
| D_response.glb | 304,116 | 18.6 | 68.4 | 87.0 |
| D_alternatives.glb | 807,468 | 55.0 | 67.5 | 122.5 |

Late chunks may load concurrently, so their totals should not be added to claim a wall-clock complete-journey load time.

All seven candidate GLBs pass glTF validator with 0 errors / 0 warnings. Draco informational notices are retained in the machine-readable reports.

### Every representative pose

| Variant | Pose | Geometry calls | Rendered triangles | FPS |
|---|---|---:|---:|
| baseline | hero | 255 | 404,766 | 55.3 |
| baseline | core | 166 | 331,380 | 86.3 |
| baseline | split | 491 | 1,126,654 | 34.0 |
| baseline | text | 126 | 274,700 | 42.6 |
| baseline | response | 63 | 141,920 | 44.7 |
| A | hero | 255 | 404,766 | 55.0 |
| A | core | 166 | 331,380 | 86.4 |
| A | split | 491 | 1,126,654 | 33.9 |
| A | text | 126 | 274,700 | 42.6 |
| A | response | 63 | 141,920 | 44.8 |
| B | hero | 241 | 404,766 | 55.6 |
| B | core | 166 | 331,380 | 85.1 |
| B | split | 485 | 1,127,734 | 34.0 |
| B | text | 118 | 274,700 | 42.8 |
| B | response | 63 | 141,920 | 44.6 |
| C | hero | 255 | 357,594 | 55.5 |
| C | core | 166 | 292,564 | 86.5 |
| C | split | 491 | 982,008 | 34.3 |
| C | text | 126 | 245,954 | 42.7 |
| C | response | 63 | 141,920 | 44.7 |
| D | hero | 255 | 404,766 | 56.3 |
| D | core | 166 | 331,380 | 85.8 |
| D | split | 491 | 1,126,654 | 34.0 |
| D | text | 126 | 274,700 | 42.8 |
| D | response | 63 | 141,920 | 42.8 |

Reported geometry calls exclude the postprocessing fullscreen passes. The captures also store total calls/triangles including those passes. The split shot renders the scene four times; its 1.13 million rendered triangles are repeated submissions rather than a larger asset.
B split submits 1,080 extra triangles because the combined instance bounds are culled as a group. This is a normal batching/culling tradeoff; it reinforces why instancing every repeated source is not automatically beneficial.

## Visual regression

Five matching poses per variant are captured as sharp WebGL canvas PNGs. The DOM product and option overlays are not included in canvas-only images. Existing product/motion layout is unchanged by these experiments. Contact sheet: variant-contact-sheet.png; detailed C split comparison: baseline-vs-C-split.png.

Pixel tests compare identical viewport/camera/progress. RGB mean absolute error uses 0–255 channels; changed fraction counts pixels with any channel delta >8. These are diagnostics, not an automatic approval threshold.
Visual inspection of the contact sheet and full split captures found no composition, label, route or protected-domain regression. A is pixel-identical at all five tested poses. B/D are effectively identical. C changes local alternative-destination surface edges; the split view shows 0.2162% changed pixels, so C remains a review candidate rather than an approved production replacement.

| Variant | Pose | Mean RGB error | Changed pixels % |
|---|---|---:|---:|
| A | hero | 0.0000 | 0.0000 |
| A | core | 0.0000 | 0.0000 |
| A | split | 0.0000 | 0.0000 |
| A | text | 0.0000 | 0.0000 |
| A | response | 0.0000 | 0.0000 |
| B | hero | 0.0000 | 0.0000 |
| B | core | 0.0000 | 0.0000 |
| B | split | 0.0001 | 0.0001 |
| B | text | 0.0000 | 0.0000 |
| B | response | 0.0000 | 0.0000 |
| C | hero | 0.0263 | 0.0798 |
| C | core | 0.0000 | 0.0000 |
| C | split | 0.0683 | 0.2162 |
| C | text | 0.0080 | 0.0261 |
| C | response | 0.0000 | 0.0000 |
| D | hero | 0.0000 | 0.0000 |
| D | core | 0.0000 | 0.0000 |
| D | split | 0.0000 | 0.0000 |
| D | text | 0.0000 | 0.0000 |
| D | response | 0.0000 | 0.0000 |

B Text forward vs reverse: RGB error 0.0000, changed pixels 0.0000%.

## THREE.Clock ownership

Exact CDP Runtime.consoleAPICalled stack is preserved in clock-stack.json. Browser stack locations below are displayed one-based (CDP stores zero-based):

```text
warn → three/build/three.core.js:1970:21
Clock → three/build/three.core.js:39432:9
eval → @react-three/fiber/dist/events-b389eeca.esm.js:1020:20
createStoreImpl → zustand/esm/vanilla.mjs:23:32
createStore → zustand/esm/vanilla.mjs:26:53
createWithEqualityFn → zustand/traditional
createStore → @react-three/fiber/dist/events-b389eeca.esm.js
```

Installed R3F 9.6.1 source owns clock: new THREE.Clock() at events-b389eeca.esm.js:1016. No app-owned new Clock / THREE.Clock usage was found under src. Therefore no migration, dependency upgrade or node_modules patch was made. The warning remains dependency-owned. Browser verification after the diagnostic-module cache recovery showed the expected Clock warning; previous development HMR/file-cache errors were resolved by server restart, not asset changes.

## Validation and limits

36 focused tests pass (world foundation/runtime, v015 material/visibility contracts, audit instancing, lossless geometry and protected C geometry). TypeScript noEmit and targeted ESLint pass. Production build passes; it reports one existing unrelated unused-variable warning in vapour-text-effect.tsx:469 (transformedDensity). Production-build FPS was not benchmarked. Original source SHA-256: 174af39007d7326259c43a630113e658b30d28fda2cfa54e00d07a741723212e.

This audit does not prove that the renderer is exclusively GPU-bound. It shows that the tested triangle/draw-call reductions do not meaningfully improve measured FPS. The strongest remaining target is the four-view rendering/postprocessing workload: benchmark pass timing and consider sharing/downsampling costly passes before spending more effort on distant mesh reduction.

Reproduction: node --import ./tests/alias-hook.mjs scripts/world/armi-production-audit.mjs; start localhost:3000; open /world/armi-audit; choose variant and exact progress; Capture audit; node scripts/world/armi-audit-report.mjs. Generator requires the existing external Draco/validator toolchain recorded in the script. Production homepage remains unchanged in asset choice.
