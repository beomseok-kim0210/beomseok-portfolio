import assert from "node:assert/strict";
import { test } from "node:test";
import { getProjectDetail } from "@/data/projectDetails";
import { projectCatalog, resolveExistingProjectData } from "@/features/world/catalog/projectCatalog";
import { districtRegistry } from "@/features/world/registry/districtRegistry";
import { worldSegments, worldItinerary, resolveWorldItinerary } from "@/features/world/itinerary/worldItinerary";
import { districtShotProfiles, validateShotProfile } from "@/features/world/director/shotProfiles";
import { evaluateWorld, positionForSegment } from "@/features/world/director/evaluateWorld";
import { districtAssetManifests } from "@/features/world/assets/assetManifests";
import { validateWorldFoundation } from "@/features/world/registry/validateFoundation";
import { armiAdapterBoundary } from "@/features/world/adapters/armiAdapter";
import type { DistrictDefinition, ProjectCatalogEntry, WorldSegment } from "@/features/world/types/contracts";

const validate = () => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, districtShotProfiles, districtAssetManifests);
const evaluate = (position: number, direction: "forward" | "reverse" | "stationary" = "forward", itinerary = worldItinerary) =>
  evaluateWorld({ position, direction, renderMode: "webgl" }, itinerary, districtRegistry, districtShotProfiles);

test("published district references, project references, shot and manifest ownership resolve", () => {
  assert.doesNotThrow(validate);
  for (const entry of worldItinerary.segments.filter((entry) => entry.districtId)) {
    assert.ok(districtRegistry.some((district) => district.districtId === entry.districtId));
  }
  for (const district of districtRegistry.filter((district) => district.projectId)) {
    assert.ok(projectCatalog.some((project) => project.projectId === district.projectId));
  }
});

test("duplicate stable IDs are rejected within each namespace", () => {
  assert.throws(() => validateWorldFoundation([...projectCatalog, projectCatalog[0]], districtRegistry, worldSegments, districtShotProfiles, districtAssetManifests), /Duplicate/);
  assert.throws(() => validateWorldFoundation(projectCatalog, [...districtRegistry, districtRegistry[0]], worldSegments, districtShotProfiles, districtAssetManifests), /Duplicate/);
  assert.throws(() => resolveWorldItinerary([...worldSegments, worldSegments[0]]), /Duplicate/);
  assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, [...districtShotProfiles, districtShotProfiles[0]], districtAssetManifests), /Duplicate/);
  assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, districtShotProfiles, [...districtAssetManifests, districtAssetManifests[0]]), /Duplicate/);
  const profile = districtShotProfiles[0];
  assert.throws(() => validateShotProfile({ ...profile, shots: [profile.shots[0], profile.shots[0]] }), /Duplicate/);
});

test("experimental installations resolve to a non-project Experimental Wing", () => {
  const wing = districtRegistry.find((entry) => entry.districtId === "experimental-wing")!;
  assert.equal(wing.tier, "wing");
  assert.equal(wing.projectId, undefined);
  for (const id of ["digital-docent", "bcos", "crime-scene"]) {
    const district = districtRegistry.find((entry) => entry.districtId === id)!;
    assert.equal(district.tier, "installation");
    assert.equal(district.parentDistrictId, wing.districtId);
  }
});

test("Claw Dev remains in existing project data/catalog but outside initial itinerary", () => {
  assert.ok(getProjectDetail("claw-dev"));
  const claw = projectCatalog.find((entry) => entry.projectId === "claw-dev")!;
  assert.equal(claw.href, "/projects/claw-dev");
  assert.equal(claw.worldParticipation, "excluded");
  assert.ok(!worldSegments.some((entry) => entry.districtId === "claw-dev"));
});

test("Digital Docent identity explicitly bridges existing summary key and route", () => {
  const docent = projectCatalog.find((entry) => entry.projectId === "digital-docent")!;
  assert.equal(docent.summaryReference?.key, "docent");
  assert.equal(docent.dataReference.key, "ai-docent");
  assert.equal(docent.routeSlug, "ai-docent");
  assert.equal(docent.href, "/projects/ai-docent");
  assert.strictEqual(resolveExistingProjectData(docent), getProjectDetail("ai-docent"));
  assert.strictEqual(docent.mediaReference, getProjectDetail("ai-docent")!.media);
});

test("adding a synthetic future district changes traversal, never existing shot-local ranges", () => {
  const before = JSON.stringify(districtShotProfiles);
  const existing = districtRegistry[0];
  const future: DistrictDefinition = { ...existing, districtId: "future", projectId: "future", assetManifestId: "future/assets", shotProfileId: "future/shots" };
  const project: ProjectCatalogEntry = { ...projectCatalog[0], projectId: "future", routeSlug: "future", href: "/projects/future", dataReference: { sourceId: "future-data", key: "future" } };
  const segment: WorldSegment = { segmentId: "future", kind: "district", districtId: "future", scrollWeight: 8, anchor: "#future", publishState: "published" };
  const entries = [worldSegments[0], segment, ...worldSegments.slice(1)];
  const expanded = resolveWorldItinerary(entries);
  const profile = { ...districtShotProfiles[1], profileId: "future/shots", districtId: "future" };
  const registry = [...districtRegistry, future];
  const profiles = [...districtShotProfiles, profile];
  assert.doesNotThrow(() => validateWorldFoundation([...projectCatalog, project], registry, entries, profiles, [...districtAssetManifests, { manifestId: "future/assets", districtId: "future", publishState: "planned", assets: [] }]));
  for (const district of districtRegistry) {
    for (const local of [0, .15, .33, .58, .79, .99]) {
      const original = evaluate(positionForSegment(worldItinerary, district.districtId, local));
      const added = evaluateWorld({ position: positionForSegment(expanded, district.districtId, local), direction: "forward", renderMode: "webgl" }, expanded, registry, profiles);
      assert.equal(added.districtId, original.districtId);
      assert.equal(added.shotId, original.shotId);
      assert.ok(Math.abs(added.shotProgress! - original.shotProgress!) < 1e-12);
    }
  }
  assert.equal(JSON.stringify(districtShotProfiles), before);
  assert.equal(expanded.segments[0].nextSegmentId, "future");
  assert.deepEqual(expanded.segments[1].preloadAdjacentSegmentIds, ["arrival", "world-spine"]);
});

test("forward/reverse/direct-jump evaluation selects identical identities at the same position", () => {
  const before = JSON.stringify([worldItinerary, districtRegistry, districtShotProfiles]);
  const positions = worldItinerary.segments.flatMap((entry) => [entry.startPosition, entry.startPosition + entry.scrollWeight * .63, entry.endPosition]);
  for (const position of positions) {
    const forward = evaluate(position, "forward");
    assert.deepEqual(evaluate(position, "reverse"), { ...forward, direction: "reverse" });
    assert.deepEqual(evaluate(position, "stationary"), { ...forward, direction: "stationary" });
  }
  assert.equal(JSON.stringify([worldItinerary, districtRegistry, districtShotProfiles]), before);
});

test("segment seams use next entry, final endpoint uses final entry, independent of direction", () => {
  for (const entry of worldItinerary.segments.slice(1)) {
    assert.equal(evaluate(entry.startPosition).segmentId, entry.segmentId);
    assert.equal(evaluate(entry.startPosition, "reverse").localProgress, 0);
  }
  const final = evaluate(worldItinerary.totalWeight);
  assert.equal(final.segmentId, "contact");
  assert.equal(final.localProgress, 1);
  assert.equal(final.districtId, null);
  assert.equal(final.shotId, null);
});

test("shot seams are district-local and deterministic with a complete final endpoint", () => {
  const onlyArmi = resolveWorldItinerary([{ ...worldSegments[2], scrollWeight: 1 }]);
  const profile = districtShotProfiles[0];
  for (const shot of profile.shots) {
    const state = evaluate(shot.localStart, "forward", onlyArmi);
    assert.equal(state.shotId, shot.shotId);
    assert.equal(state.shotProgress, 0);
    assert.deepEqual(evaluate(shot.localStart, "reverse", onlyArmi), { ...state, direction: "reverse" });
  }
  assert.equal(evaluate(1, "forward", onlyArmi).shotProgress, 1);
  assert.equal(evaluate(1, "forward", onlyArmi).shotId, "exit");
});

test("shot anchor seams remain exact after weighted offsets and future insertion", () => {
  const inserted = resolveWorldItinerary([{ ...worldSegments[0], segmentId: "extra", scrollWeight: 7.3 }, ...worldSegments]);
  for (const itinerary of [worldItinerary, inserted]) {
    for (const shot of districtShotProfiles[0].shots) {
      const position = positionForSegment(itinerary, "armi", shot.localStart);
      for (const direction of ["forward", "reverse", "stationary"] as const) {
        const state = evaluate(position, direction, itinerary);
        assert.equal(state.shotId, shot.shotId);
        assert.equal(state.shotProgress, 0);
      }
    }
  }
});

test("non-project segments have no district/shot; publication filtering recomputes adjacency", () => {
  assert.ok(!worldItinerary.segments.some((entry) => entry.segmentId === "future-projects"));
  const crime = worldItinerary.segments.find((entry) => entry.segmentId === "crime-scene")!;
  assert.equal(crime.nextSegmentId, "world-exit");
  for (const entry of worldItinerary.segments.filter((entry) => !entry.districtId)) {
    const state = evaluate(entry.startPosition);
    assert.equal(state.districtId, null);
    assert.equal(state.shotProgress, null);
  }
});

test("finite out-of-range positions clamp while invalid positions and weights reject", () => {
  assert.deepEqual(evaluate(-5), evaluate(0));
  assert.deepEqual(evaluate(1e6), evaluate(worldItinerary.totalWeight));
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => evaluate(invalid), /finite/);
    assert.throws(() => positionForSegment(worldItinerary, "armi", invalid), /finite/);
  }
  for (const invalid of [0, -1, NaN, Infinity]) assert.throws(() => resolveWorldItinerary([{ ...worldSegments[0], scrollWeight: invalid }]), /weight/);
  assert.throws(() => resolveWorldItinerary([]), /published/);
  assert.throws(() => positionForSegment(worldItinerary, "unknown"), /Unknown/);
});

test("malformed local partitions reject gaps, overlaps, reversed and incomplete ranges", () => {
  const profile = districtShotProfiles[0];
  for (const localStart of [.01, -.01, NaN]) assert.throws(() => validateShotProfile({ ...profile, shots: [{ ...profile.shots[0], localStart }, ...profile.shots.slice(1)] }), /partition/);
  assert.throws(() => validateShotProfile({ ...profile, shots: profile.shots.slice(0, -1) }), /Incomplete/);
  assert.throws(() => validateShotProfile({ ...profile, shots: [] }), /Empty/);
});

test("dangling references, installation parents and ownership violations reject", () => {
  assert.throws(() => validateWorldFoundation(projectCatalog.slice(1), districtRegistry, worldSegments, districtShotProfiles, districtAssetManifests), /Unknown project/);
  assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry.slice(1), worldSegments, districtShotProfiles, districtAssetManifests), /unknown itinerary district/);
  const registry = districtRegistry.map((entry) => entry.districtId === "bcos" ? { ...entry, parentDistrictId: "armi" } : entry);
  assert.throws(() => validateWorldFoundation(projectCatalog, registry, worldSegments, districtShotProfiles, districtAssetManifests), /wing parent/);
  assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, districtShotProfiles.slice(1), districtAssetManifests), /shot profile/);
  const manifests = districtAssetManifests.map((entry, index) => index === 0 ? { ...entry, assets: entry.assets.map((asset) => ({ ...asset, districtId: "bcos" })) } : entry);
  assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, districtShotProfiles, manifests), /foreign shot asset|ownership/);
});

test("asset fallbacks resolve and reject missing targets or cycles without loading assets", () => {
  const armi = districtAssetManifests[0];
  for (const fallbackAssetId of ["missing", armi.assets[0].assetId]) {
    const manifests = [{ ...armi, assets: armi.assets.map((asset, index) => index === 0 ? { ...asset, fallbackAssetId } : asset) }, ...districtAssetManifests.slice(1)];
    assert.throws(() => validateWorldFoundation(projectCatalog, districtRegistry, worldSegments, districtShotProfiles, manifests), /fallback/);
  }
});

test("render capability changes only the renderMode field, not choreography", () => {
  const position = positionForSegment(worldItinerary, "armi", .63);
  const base = evaluate(position);
  for (const renderMode of ["static", "reduced-motion", "fallback"] as const) {
    assert.deepEqual(evaluateWorld({ position, direction: "forward", renderMode }, worldItinerary, districtRegistry, districtShotProfiles), { ...base, renderMode });
  }
});

test("ARMI boundary stays semantic, unintegrated and explicit about unresolved legacy phases", () => {
  assert.equal(armiAdapterBoundary.status, "unintegrated");
  assert.equal(armiAdapterBoundary.conceptualShotToLegacyPhase.portal, "enter");
  assert.deepEqual(armiAdapterBoundary.preservedEntryShots, ["entry", "voice", "tablet-approach", "portal"]);
  assert.deepEqual(armiAdapterBoundary.unresolvedLegacyPhases, ["stt", "travel", "result", "return"]);
  assert.ok(districtShotProfiles.every((profile) => profile.publishState === "planned"));
});
