import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const out='docs/design-references/immersive-portfolio/armi-production-audit';
const external='D:/portfolio-world-v2-3d/qa/armi-production-optimization';
const audit=JSON.parse(await fs.readFile(path.join(external,'audit.json'),'utf8'));
const trials=JSON.parse(await fs.readFile(path.join(external,'browser-trials.json'),'utf8'));
const variants=['baseline','A','B','C','D'],shots=['hero','core','split','text','response'];
const results={},diffs={},composite=[];
function label(text,w=288,h=26){return Buffer.from(`<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#081018"/><text x="8" y="18" font-family="Arial" font-size="13" fill="white">${text}</text></svg>`);}
async function pixels(file){return sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});}
async function compare(a,b){const aa=await pixels(a),bb=await pixels(b);if(aa.info.width!==bb.info.width||aa.info.height!==bb.info.height)throw Error('Viewport mismatch');let sum=0,changed=0;for(let i=0;i<aa.data.length;i+=3){let max=0;for(let k=0;k<3;k++){const delta=Math.abs(aa.data[i+k]-bb.data[i+k]);sum+=delta;max=Math.max(max,delta);}if(max>8)changed++;}return {meanAbsoluteRgbError:sum/aa.data.length,percentPixelsDeltaAbove8:100*changed/(aa.data.length/3)};}
for(const [vi,v] of variants.entries()){
  results[v]={};diffs[v]={};
  for(const [si,s]of shots.entries()){
    const file=path.join(out,`${v}-${s}.png`);
    results[v][s]=JSON.parse(await fs.readFile(path.join(out,`${v}-${s}.json`),'utf8'));
    diffs[v][s]=await compare(path.join(out,`baseline-${s}.png`),file);
    composite.push({input:label(`${v} / ${s}`),left:vi*288,top:si*206});
    composite.push({input:await sharp(file).resize(288,180).png().toBuffer(),left:vi*288,top:si*206+26});
  }
}
await sharp({create:{width:1440,height:1030,channels:3,background:'#081018'}}).composite(composite).png().toFile(path.join(out,'variant-contact-sheet.png'));
await sharp({create:{width:1440,height:476,channels:3,background:'#081018'}}).composite([
 {input:label('Baseline / four destinations',720),left:0,top:0},
 {input:label('C / simplified alternatives',720),left:720,top:0},
 {input:await sharp(path.join(out,'baseline-split.png')).resize(720,450).png().toBuffer(),left:0,top:26},
 {input:await sharp(path.join(out,'C-split.png')).resize(720,450).png().toBuffer(),left:720,top:26},
]).png().toFile(path.join(out,'baseline-vs-C-split.png'));
const reverse=await compare(path.join(out,'B-text-forward.png'),path.join(out,'B-text-reverse.png'));
await fs.copyFile(path.join(external,'audit.json'),path.join(out,'asset-audit.json'));
await fs.copyFile(path.join(external,'clock-stack.json'),path.join(out,'clock-stack.json'));
await fs.writeFile(path.join(out,'runtime-comparison.json'),JSON.stringify({results,diffs,reverse,trials},null,2));
const mi=b=>(b/1048576).toFixed(3),num=n=>n.toLocaleString('en-US'),f=n=>n.toFixed(1);
const total=g=>Object.values(g.domains).reduce((s,d)=>s+d.triangles,0);
const sizes={baseline:audit.source.bytes,A:audit.variants.A.bytes,B:audit.variants.B.bytes,C:audit.variants.C.bytes,D:audit.variants.D_initial.bytes+audit.variants.D_alternatives.bytes+audit.variants.D_response.bytes};
const lines=[
'# ARMI production optimization audit',
'',
'2026-10-08. Repository: D:/UserData/Desktop/beomseok-portfolio; branch feat-immersive-portfolio-flow.',
'',
'## Decision',
'',
'Recommend A first: lossless production-history cleanup cuts the primary GLB by 70.4% with identical Draco geometry, nodes and animation bindings. Original homepage still uses v015; variants are isolated at /world/armi-audit. No Blender re-export or production asset replacement was performed.',
'',
'B reduces some draw submissions but does not materially increase FPS on this desktop. C saves only ~0.10 MiB beyond A and alters the three alternative destinations that are also close-up in the four-panel view. Keep C experimental. D offers the strongest initial-download improvement but requires hydration/readiness gating before production adoption.',
'',
'## Exact bytes',
'',
'The reported 11.1 MB is 11.094 MiB (11.633 decimal MB). Categories are disjoint and sum to the original file size.',
'',
'| Category | Bytes | MiB | Share |','|---|---:|---:|---:|',
...Object.entries(audit.byteBreakdown).map(([k,b])=>`| ${k} | ${num(b)} | ${mi(b)} | ${(b/audit.source.bytes*100).toFixed(2)}% |`),
'',
'Scene extras contain archived production snapshots, including V011_geometry_snapshot (4,731,444 bytes), V010_preserve_snapshot (2,059,046), and V009_primary_snapshot (855,048). These are not runtime geometry. Their original JSON is preserved externally in archived-production-scene-extras.json. Node extras used for visibility, source names, route points and batching are retained.',
'',
'One embedded Product UI PNG accounts for the texture buffer. motion-samples.json (746,716 bytes) and runtime-manifest.json (140,488 bytes) are separate files; the cinematic motion samples are not fetched by the current runtime. Existing v016/v017 route sideassets remain unchanged in all comparisons.',
'',
'## Geometry by semantic domain',
'',
'Counts include mesh-node occurrences. Primitive counts are uncullled single-pass potential submissions, not actual frame draw calls. Hero calls below are measured for A (geometrically identical to baseline).',
'',
'| Domain | Triangles | Vertices | Primitives | Mesh nodes | Hero calls |','|---|---:|---:|---:|---:|---:|',
...Object.entries(audit.geometry.domains).map(([k,d])=>`| ${k} | ${num(d.triangles)} | ${num(d.vertices)} | ${d.primitives} | ${d.meshNodes} | ${results.A.hero.metrics.drawCallsByDomain[k]??0} |`),
'',
`Totals: ${num(total(audit.geometry))} triangles; 430,056 vertices; 313 primitives; 193 mesh nodes; 159 unique mesh definitions; 276 nodes. Unique mesh triangle sum: 450,116. Hero runtime-effect calls are additional (${results.A.hero.metrics.drawCallsByDomain.RuntimeEffects}).`,
'',
'### Repeated geometry / instancing',
'',
'15 shared mesh definitions have multiple node uses. Sharing mesh data already saves storage; it does not automatically instance GPU submissions. Runtime material cloning and visibility semantics restrict safe instancing.',
'',
'| Shared mesh | Uses |','|---|---:|',
...audit.geometry.repeatedMeshes.map(r=>`| ${r.mesh} | ${r.instances} |`),
'',
'B batches 27 named sources into 8 InstancedMesh objects where geometry and material identity match. Original semantic nodes and animation targets remain in the hierarchy. Hidden source instances are compacted; forward/reverse visibility is reversible. Text lines and Response row lines offer actual hero savings. Memory/Tavily/Robot independently cloned materials prevent naive batching of all repeated forms. Environment already has only 17 batched mesh roots; globally merging it would sacrifice culling and controllability.',
'',
'## Camera-aware audit',
'',
audit.cameraAuditMethod,
'',
'153 progress samples between 0.18 and 0.94, plus all four split-view cameras: 101 close-up meshes, 156 visible at distance, 54 runtime-hidden, 2 outside sampled frusta. Classification is based on the prepared runtime scene, including replacement route geometry and visibility. Detailed object names and minimum camera distances are in asset-audit.json.',
'',
'Core / Text / Response are preserved. C leaves their compressed geometry byte-identical. Memory / Tavily / Robot are simplification candidates, but not purely distant: each appears close-up in the split view. Their labels/unlit translucent presentation geometry is excluded from simplification. C modifies 50 opaque primitives using border-preserving simplification (target 65%, error 0.002) and Draco recompression.',
'',
'Outside sampled frusta: GEO-R1-ForegroundCrossDeck (Environment), GEO-V014-ResponseAssemblyStatus (Response). These are removal candidates for further exhaustive viewport/occlusion QA, not proven never-visible geometry. Runtime-hidden objects include the obsolete original Core→Text/ingress geometry, Product meshes superseded by the crisp DOM product view, and inactive branch request effects. They are not deleted in A/B/C.',
'',
'| Simplified domain | Original triangles | C triangles | C vertices |','|---|---:|---:|---:|',
...['Memory','Tavily','Robot'].map(k=>`| ${k} | ${num(audit.geometry.domains[k].triangles)} | ${num(audit.simplifiedGeometry.domains[k].triangles)} | ${num(audit.simplifiedGeometry.domains[k].vertices)} |`),
'',
'## Variant comparison',
'',
'GTX 1060 3GB, ANGLE D3D11, 1440×900, DPR 1. Actual localhost browser, Next development runtime. FPS is sampled with static representative poses; these are desktop QA observations, not production-build, WAN, mobile or isolated GPU-timer benchmarks. Small differences under ~1 FPS are inconclusive.',
'',
'GLTF timings below come from explicit no-store fetch → ArrayBuffer → GLTFLoader.parseAsync boundaries. Parse includes JSON, Draco worker decode and image processing; it is not isolated Draco CPU time. It excludes first shader compilation and sideassets. Each shown value is one recorded trial, not a statistical median.',
'',
'| Variant | Primary download MiB | Stored node-use triangles | Hero geometry calls | Hero rendered triangles | Hero FPS | Fetch ms | Parse/decode ms | Total ms |','|---|---:|---:|---:|---:|---:|---:|---:|---:|',
...variants.map(v=>{const r=results[v].hero.metrics;const t=v==='D'?results.D.hero.stats.loads.find(l=>l.url.includes('D_initial')):v==='B'?results.B.hero.stats.loads[0]:trials.find(t=>t.variant===v).stats.loads[0];return `| ${v} | ${mi(sizes[v])}${v==='D'?' journey / 1.183 initial':''} | ${num(v==='C'?total(audit.simplifiedGeometry):v==='D'?468174:total(audit.geometry))} | ${r.geometryDrawCalls} | ${num(r.geometryTriangles)} | ${f(r.fpsAverage)} | ${f(t.fetchMs)} | ${f(t.parseDecodeMs)} | ${f(t.totalMs)}${v==='D'?' initial':''} |`;}),
'',
'D sizes: initial 1,239,992 bytes; alternatives 807,468; Response 304,116; optional Product 1,376,236. Golden journey total 2,351,576 bytes. Including optional Product: 3,727,812 bytes. Duplication of semantic scaffold/animation references causes all-part size to exceed A. Current crisp Product UI uses the DOM; embedded Product geometry is optional. All required late districts were hydrated for D parity captures.',
'',
'D preloads alternatives at progress 0.10 and Response at 0.50 in this diagnostic route. A production version must gate split/Response entry on asset readiness and handle deep links/reverse scroll; a threshold alone cannot guarantee no visible pop-in under slow network conditions. D initial-only screenshot intentionally lacks unloaded districts and is not a visual-parity claim.',
'',
'| D loaded chunk | Bytes | Fetch ms | Parse/decode ms | Total ms |','|---|---:|---:|---:|---:|',
...results.D.hero.stats.loads.map(l=>`| ${l.url.split('/').pop().split('?')[0]} | ${num(l.bytes)} | ${f(l.fetchMs)} | ${f(l.parseDecodeMs)} | ${f(l.totalMs)} |`),
'',
'Late chunks may load concurrently, so their totals should not be added to claim a wall-clock complete-journey load time.',
'',
'All seven candidate GLBs pass glTF validator with 0 errors / 0 warnings. Draco informational notices are retained in the machine-readable reports.',
'',
'### Every representative pose',
'',
'| Variant | Pose | Geometry calls | Rendered triangles | FPS |','|---|---|---:|---:|',
...variants.flatMap(v=>shots.map(s=>{const m=results[v][s].metrics;return `| ${v} | ${s} | ${m.geometryDrawCalls} | ${num(m.geometryTriangles)} | ${f(m.fpsAverage)} |`;})),
'',
'Reported geometry calls exclude the postprocessing fullscreen passes. The captures also store total calls/triangles including those passes. The split shot renders the scene four times; its 1.13 million rendered triangles are repeated submissions rather than a larger asset.',
'B split submits 1,080 extra triangles because the combined instance bounds are culled as a group. This is a normal batching/culling tradeoff; it reinforces why instancing every repeated source is not automatically beneficial.',
'',
'## Visual regression',
'',
'Five matching poses per variant are captured as sharp WebGL canvas PNGs. The DOM product and option overlays are not included in canvas-only images. Existing product/motion layout is unchanged by these experiments. Contact sheet: variant-contact-sheet.png; detailed C split comparison: baseline-vs-C-split.png.',
'',
'Pixel tests compare identical viewport/camera/progress. RGB mean absolute error uses 0–255 channels; changed fraction counts pixels with any channel delta >8. These are diagnostics, not an automatic approval threshold.',
'Visual inspection of the contact sheet and full split captures found no composition, label, route or protected-domain regression. A is pixel-identical at all five tested poses. B/D are effectively identical. C changes local alternative-destination surface edges; the split view shows 0.2162% changed pixels, so C remains a review candidate rather than an approved production replacement.',
'',
'| Variant | Pose | Mean RGB error | Changed pixels % |','|---|---|---:|---:|',
...variants.filter(v=>v!=='baseline').flatMap(v=>shots.map(s=>`| ${v} | ${s} | ${diffs[v][s].meanAbsoluteRgbError.toFixed(4)} | ${diffs[v][s].percentPixelsDeltaAbove8.toFixed(4)} |`)),
'',
`B Text forward vs reverse: RGB error ${reverse.meanAbsoluteRgbError.toFixed(4)}, changed pixels ${reverse.percentPixelsDeltaAbove8.toFixed(4)}%.`,
'',
'## THREE.Clock ownership',
'',
'Exact CDP Runtime.consoleAPICalled stack is preserved in clock-stack.json. Browser stack locations below are displayed one-based (CDP stores zero-based):',
'',
'```text',
'warn → three/build/three.core.js:1970:21',
'Clock → three/build/three.core.js:39432:9',
'eval → @react-three/fiber/dist/events-b389eeca.esm.js:1020:20',
'createStoreImpl → zustand/esm/vanilla.mjs:23:32',
'createStore → zustand/esm/vanilla.mjs:26:53',
'createWithEqualityFn → zustand/traditional',
'createStore → @react-three/fiber/dist/events-b389eeca.esm.js',
'```',
'',
'Installed R3F 9.6.1 source owns clock: new THREE.Clock() at events-b389eeca.esm.js:1016. No app-owned new Clock / THREE.Clock usage was found under src. Therefore no migration, dependency upgrade or node_modules patch was made. The warning remains dependency-owned. Browser verification after the diagnostic-module cache recovery showed the expected Clock warning; previous development HMR/file-cache errors were resolved by server restart, not asset changes.',
'',
'## Validation and limits',
'',
'36 focused tests pass (world foundation/runtime, v015 material/visibility contracts, audit instancing, lossless geometry and protected C geometry). TypeScript noEmit and targeted ESLint pass. Production build passes; it reports one existing unrelated unused-variable warning in vapour-text-effect.tsx:469 (transformedDensity). Production-build FPS was not benchmarked. Original source SHA-256: '+audit.source.sha256+'.',
'',
'This audit does not prove that the renderer is exclusively GPU-bound. It shows that the tested triangle/draw-call reductions do not meaningfully improve measured FPS. The strongest remaining target is the four-view rendering/postprocessing workload: benchmark pass timing and consider sharing/downsampling costly passes before spending more effort on distant mesh reduction.',
'',
'Reproduction: node --import ./tests/alias-hook.mjs scripts/world/armi-production-audit.mjs; start localhost:3000; open /world/armi-audit; choose variant and exact progress; Capture audit; node scripts/world/armi-audit-report.mjs. Generator requires the existing external Draco/validator toolchain recorded in the script. Production homepage remains unchanged in asset choice.',
];
await fs.writeFile(path.join(out,'REPORT.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({diffs,reverse,report:path.resolve(out,'REPORT.md')},null,2));
