# ARMI v015 — first Portfolio World integration and runtime lookdev

Working tree: D:/UserData/Desktop/beomseok-portfolio, feat-immersive-portfolio-flow.
Source: D:/portfolio-world-v2-3d/armi/routing-chamber/exports/armi-v015-web.

The approved GLB was copied byte-for-byte; no Blender changes or re-export.
SHA256: 174af39007d7326259c43a630113e658b30d28fda2cfa54e00d07a741723212e.
Size: 11,632,952 bytes (11.094 MiB). Local Draco WASM and wrapper are bundled.
The runtime manifest and motion samples are available alongside the model.

## Runtime ownership and asset contract

ArmiDistrictScene now loads the production GLB through R3F/GLTFLoader/DRACOLoader.
Original units, transforms, geometry sharing, robot parent chain, anchors and names
are retained. The runtime publishes root, semantic groups, stable source-name
lookup, manifest and 6 idle clips through WorldRuntime. Core, Text, Memory,
Tavily, Robot, Response, Product, Routes, Environment and Anchors remain separate.
Default visibility includes the manifest's source-frame-49 events. No animation
mixer or previs camera timeline plays. No full scroll choreography was authored.

WorldCameraController remains the only live camera owner. Post-portal currently
holds the authored RoutingHero pose as an explicit temporary visual reference;
legacy director identities and numeric clock are retained pending choreography.
The original product entry is retained. The static review surface uses the exact
same WorldCanvas, district, camera controller and final render pipeline as home:
http://localhost:3000/world/armi-review.

The model is registered in the existing district asset manifest with a session
retention policy and poster fallback. Cached geometry remains owned by useLoader.
Materials are cloned and calibrated once per shared source material, preserving
cached source materials and buffer sharing.

## Runtime lighting and post-processing

14 consolidated chamber RectAreaLights plus 2 Product-stage lights; only the
current stage's rig is active. Authored matrices and linear colors come from the
runtime manifest. Powers are calibrated to Three intensities, not interpreted as
an exact Blender-watts conversion. No 44-light duplication or shadow-map fanout.
Cool-tinted RoomEnvironment PMREM supplies metal reflections. Environment intensity
0.12; nonmetal envMapIntensity 0.3, metal 1.0. Architectural panels have a 0.55
linear albedo adjustment and Robot enamel roughness 0.42 to reduce white highlights.
AgX exposure 2^-0.3. Linear fog from 180 to 700 source meters approximates distant
haze. UnrealBloom strength 0.025 / radius 0.1 / threshold 3.5. Four-sample MSAA on
composer targets. The existing WorldRenderPipeline owns all final rendering.

The actual Product screen uses unlit material, toneMapped=false, fog=false,
anisotropy=8 and layer 2. It renders after bloom/output conversion and does not
enter the bloom source. ProductOpening was inspected and saved. This screen-only
overlay clears depth, so future close camera paths must verify screen/bezel
occlusion rather than assuming the original world depth buffer is shared.

## Visual iterations

Pass 1: matching camera and semantic layout, but broad glow and excessive fill
made the chamber pale. Saved browser-pass1.png.
Pass 2: reduced bloom and diffuse environment response, regional amber/cyan fill,
more readable metal and lower districts. AO was evaluated, then removed because
it over-darkened routes and doubled geometry submission; it is not enabled.
Final: cool reflections, localized lower/foreground lighting, architecture
exposure correction, product lighting separated by stage. Same-aspect comparison
uses the original authored hero and the 834/944 reference ratio, with no arbitrary
model scaling or camera fitting. Desktop uses the same vertical FOV at 1440x900.

Home's actual ARMI GLB was also visually inspected through the existing director.
Its DOM gradients were reduced to keep authored geometry visible. That home tab
was inspected at the panel's narrow viewport; 1440x900 performance and reference
captures use the real runtime on the clean review surface.

## Measurements and limits

Final desktop: 1440x900, DPR 1, development server, one active ARMI review surface.
Base geometry: 257 calls / 415,326 rendered triangles.
Complete final pipeline: 271 calls / 415,340 rendered triangles, including screen
passes. These are per-frame submissions, not the model's unique triangle count.
Six consecutive ~2-second steady windows: 56.1, 56.0, 56.4, 57.5, 56.8, 56.8 FPS;
mean 56.6 FPS. Loading/shader compilation are outside those steady windows.
This is a local development measurement, not a production/mobile performance
certification. Higher DPR and moving closeups must be measured separately.
Final review console errors: zero. Warning: THREE.Clock deprecation from the
installed R3F/Three dependency path (repeated under development Strict Mode).

Remaining differences: background faces are more uniformly lit; metallic route
and robot reflections differ from Blender; soft cast/contact shadows and actual
volumetric shaft scattering are not reproduced. Three AgX and Blender AgX are not
pixel-identical. The desktop view intentionally exposes more side architecture
than the portrait Blender render. Geometry and landmark alignment are preserved.

Verdict: GO for desktop scroll-choreography development on this asset/controller
contract. Final lighting approval, responsive camera shots and performance tuning
remain necessary before shipping. This pass does not approve all future camera
angles or implement scroll motion.

Validation: 33 World/asset tests passed; TypeScript and scoped ESLint passed.
Production build result is recorded in the completion report.
Production build: PASS. Existing unrelated ESLint warning in src/components/ui/vapour-text-effect.tsx:469 (unused transformedDensity). Dev server restored on localhost:3000 for review.
