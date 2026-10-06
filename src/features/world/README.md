# Portfolio World foundation and ARMI runtime (Phase 1B)

The Phase 1A metadata contracts now feed the Home runtime through an ARMI-only
mounted itinerary projection. Registry publication means inclusion in the intended
exhibition, **not** that its scene, camera, landmark or lookdev exists.

## Responsibilities

- `catalog/projectCatalog.ts`: adapts existing project metadata/media. It references
  existing factual data instead of owning narratives. World `digital-docent`
  maps explicitly to summary key `docent` and detail/route `ai-docent`. Claw Dev
  remains catalogued and available at its existing route, with participation excluded.
- `registry/districtRegistry.ts`: project-independent districts and wing hierarchy.
  Scene, visitor-role, landmark, lookdev and camera IDs reserve future authoring
  identities only. No dynamic imports or coordinates exist here.
- `itinerary/worldItinerary.ts`: ordered traversal units, positive local weights,
  anchors and publication. Links and preload neighbors are derived after filtering.
  New World anchors are contracts; most do not exist in V1 DOM yet.
- `director/shotProfiles.ts`: district-local complete shot partitions. ARMI's seven
  conceptual shots use provisional equal spans; other districts have an overview
  placeholder. **All profiles are planned and are not approved choreography.**
- `director/evaluateWorld.ts`: pure evaluation from absolute weight units to
  segment -> district-local progress -> shot-local progress. No camera/material
  mutation, event replay, DOM reads, elapsed time, rendering or factual ownership.
- `assets/assetManifests.ts`: typed ownership, priority, variants, fallback and
  lifecycle policy. Existing ARMI media URLs are referenced from productEvidence.
  Other manifests are empty/planned. Nothing is loaded, disposed or generated.
- `registry/validateFoundation.ts`: authoring graph integrity checks.
- `adapters/armiAdapter.ts`: interface and semantic mapping for Phase 1B only.

## Position and boundary rules

World position is in cumulative **scrollWeight units**, not normalized world
progress and not pixels. `useWorldDirector` maps the existing section ScrollTrigger
clock to its resolved segment weight; direct DOM range evaluation is also pure.
The derived start/end positions may move when itinerary weights or
entries change. District shot ranges and `(districtId, shotId)` identities do not.

Intervals are half-open `[start,end)`. Exact segment/shot seams choose the next
entry regardless of direction; the final endpoint chooses the final entry at 1.
Finite out-of-range positions clamp; NaN/infinity reject. Direction is supplied
as forward/reverse/stationary and cannot influence selection. Direct navigation
uses `positionForSegment(segmentId, localProgress)` with the same evaluator.
At localProgress=1 it intentionally reaches the next segment's start, unless last.
Shot IDs are scoped by district/profile (many districts may have `overview`).

Render modes (`webgl`, `static`, `reduced-motion`, `fallback`) are capabilities
supplied to evaluation, not detected or implemented here. Asset lifecycle states
are unloaded -> loading -> ready -> active -> retained -> evicted/error; transitions
and GPU ownership belong to future infrastructure.

## ARMI boundary and terminology

V1's `armiJourney/worldConfig.ts` uses "district" for ARMI function/service branches.
World District means an exhibition such as ARMI or Hangarae. The future internal
rename should be `serviceZone`/`serviceZones`; V1 files are not renamed now.

Entry, Voice, Tablet Approach and Portal retain V1 choreography. The World runtime
uses the separate `adapters/armiRuntime.ts` compatibility implementation. The 1A
`armiAdapterBoundary` remains planning metadata, not a mounted runtime adapter.
Routing Reveal, Observe /
Decision and Exit are conceptual identities; STT, Travel, Result and Return are
explicitly unresolved legacy phases, named `legacy-*` in the runtime profile.
The compatibility profile preserves V1 choreography; the provisional equal spans must not be
used to rescale the legacy clock accidentally.

## Runtime ownership

Home wraps the immersive flow in `WorldHost`, which portals one `WorldCanvas`
into the original ARMI DOM slot. `ArmiExperience` retains narrative, media,
fallback and skip UI. `ArmiDistrictScene` mounts only the preserved scene content.
`WorldCameraController` alone applies camera samples before district callbacks;
`WorldRenderPipeline` alone submits the final render (same direct/bloom windows,
passes, fog and strengths). Legacy owners remain on disk but are unmounted.

`worldRuntime` stores continuous director/legacy progress in refs. Semantic
subscriptions change only at segment/district/shot/mode changes. No other
district has a DOM binding or renderer in Phase 1B. Full itinerary traversal,
district loading and authored post-Portal shots await later phases.

Motion capability is separate from actual Canvas width/aspect. Container resize
selects the existing 700px camera/geometry and DPR policy. The signal receives
the same compact policy, including exactly
700px (V1 independently used `<700` for the signal and `<=700` for the camera).
Active frames remain
continuous; inactive frames use demand invalidation on progress/size updates,
instead of V1's `never`, so refreshes can apply a current pose without reload.
Reduced motion uses the existing stills and media with a shortened 180svh track
(formerly 750svh); keyboard/skip navigation remains available.

Texture/media caching and disposal remain in the original scene. There is no
preload manager, GPU eviction system, new asset loader or Phase 2 art.

## Adding a district

Add its catalog metadata adapter (if project-backed), district registry entry,
itinerary entry, district-local shot profile and owned asset manifest. Validate
the graph and resolve the itinerary. Existing shot definitions stay unchanged;
previous/next links, preload neighbors and traversal positions are recomputed.
Catalog IDs/data references and district IDs are open strings for future projects.
Existing V1 `ProjectSlug` types/routes remain untouched; future route/data adapters
must be supplied when those projects actually exist.

## Validation

`node --import ./tests/alias-hook.mjs --test tests/world-foundation.test.ts`

Retain the approved 22-test V1 baseline, build and browser regression before any
future integration. Passing these contracts does not validate new art or a World
render pipeline.

Runtime tests: `node --import ./tests/alias-hook.mjs --test tests/world-runtime.test.ts`.
The camera oracle executes the preserved tag's V1 callback and verifies its path
dependencies still match, then compares both layouts and pointer offsets.
