import { AnimationMixer, LoopOnce, PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { ArmiProductionAsset } from "./armiV015";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const local = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Integrated increasing speed, evaluated from scroll so reverse seeks restore exactly. */
export const coreRotorAngle = (p: number) => { const t=local(p,.31,.345);return Math.PI*2*(.12*t+1.88*t*t*t); };
export const armiStages = [
  { id: "product", start: 0, end: .055, title: "REAL ARMI UI", text: "실제 ARMI 환자 앱에서 시작합니다." },
  { id: "voice", start: .055, end: .12, title: "VOICE → REQUEST", text: "음성이 해석 가능한 요청으로 정돈됩니다." },
  { id: "enter", start: .12, end: .21, title: "ENTER ARMI WORLD", text: "제품의 요청을 따라 라우팅 공간으로 진입합니다." },
  { id: "routing", start: .21, end: .31, title: "FOLLOW THE REQUEST", text: "음성 요청과 함께 레일을 따라 라우팅 박스로 올라갑니다." },
  { id: "core", start: .31, end: .345, title: "ROUTING CORE", text: "박스 안의 라우팅 장치에 도착했습니다. 이제 실행 경로를 판단합니다." },
  { id: "options", start: .345, end: .402, title: "4 ROUTING OPTIONS", text: "네 목적지의 기능 미리보기입니다. 실제 요청은 Core에서 선택을 기다립니다." },
  { id: "decision", start: .402, end: .442, title: "TEXT ANSWER SELECTED", text: "Text만 선택됩니다. 나머지 세 후보는 이번 요청에서 실행하지 않습니다." },
  { id: "route", start: .442, end: .50, title: "SELECTED ROUTE", text: "선택된 답변 경로를 따라 시설 안으로 이동합니다." },
  { id: "text", start: .50, end: .59, title: "TEXT ANSWER", text: "요청을 처리하고 대화형 답변을 구성합니다." },
  { id: "response", start: .59, end: .82, title: "RESPONSE COMPOSITION", text: "선택된 Text Answer의 결과가 올라와 응답으로 정돈됩니다." },
  { id: "structured", start: .82, end: .89, title: "STRUCTURED RESPONSE", text: "하나의 실행 결과가 제품에 전달할 답변으로 완성됩니다." },
  { id: "return", start: .89, end: .94, title: "RETURN TO PRODUCT", text: "응답을 따라 실제 ARMI 제품 화면으로 돌아옵니다." },
  { id: "returned", start: .94, end: 1, title: "REAL ARMI UI", text: "처음의 실제 ARMI 제품 UI로 돌아왔습니다. 내부 여정은 설명용 시각화입니다." },
] as const;
export function armiStage(p: number) { return armiStages.find(s => p < s.end) ?? armiStages[armiStages.length - 1]; }
export const armiMotionWindows = [
  { group: "Core", clip: "Core_AuthoredMotion", start: .31, end: .345, frames: [70, 114] },
  { group: "Text", clip: "Text_AuthoredMotion", start: .515, end: .59, frames: [121, 188] },
  { group: "Response", clip: "Response_AuthoredMotion", start: .69, end: .89, frames: [351, 404] },
] as const;

export const armiOptionsWindow = { start: .345, select: .402, end: .442 } as const;
const optionMotionWindows = [
  { group: "Text", clip: "Text_AuthoredMotion", frames: [121, 188] },
  { group: "Memory", clip: "Memory_AuthoredMotion", frames: [189, 240] },
  { group: "Tavily", clip: "Tavily_AuthoredMotion", frames: [241, 292] },
  { group: "Robot", clip: "Robot_AuthoredMotion", frames: [293, 350] },
].map(window => ({ ...window, start: armiOptionsWindow.start, end: armiOptionsWindow.select }));

/** Absolute local times, no delta integration, replay or event-history dependence. */
export function createArmiMotion(asset: ArmiProductionAsset) {
  // Hidden-at-export flat labels retained local geometry but no useful stage pose.
  // Restore only their attachment to existing controls; never alter the GLB/cache.
  const attach = (name: string, position: number[]) => {
    const object = asset.objects.get(name);
    if (object && object.position.lengthSq() < .001) {
      object.position.fromArray(position); object.rotation.set(Math.PI / 2, 0, 0);
    }
  };
  attach("GEO-V013-SearchQuery", [31, 41, -47.5]);
  attach("GEO-V013-SearchContext", [31, 28, -47.5]);
  attach("GEO-V013-MemoryMeaning", [36, 113, -70]);
  attach("GEO-V013-MemoryContext", [36, 78, -69]);
  attach("GEO-V013-RobotMeaning", [-25, 24, -31]);
  for (let column = 0; column < 3; column++) {
    const names = (asset.manifest as ArmiProductionAsset["manifest"] & { groups?: Record<string, string[]> }).groups?.Tavily ?? [];
    const lines = names.filter(n => n.startsWith(`GEO-V013-Search-${column}-`));
    lines.forEach((name, row) => attach(name, [20 + column * 11, 35.6 - row * 1.3, -47.6]));
    const state = asset.objects.get(`GEO-V013-SearchState-${column}`);
    if (state) state.position.z = 1.5;
    for (let row = 0; row < 3; row++) {
      const line = asset.objects.get(`GEO-V013-SourceLine-${column}${row}`);
      if (line && !line.userData.web_surface_attached) { line.position.z += 1.5; line.userData.web_surface_attached = true; }
    }
  }
  const motions = armiMotionWindows.map(window => {
    const clip = asset.clips.find(c => c.name === window.clip);
    if (!clip) throw new Error(`Missing ARMI motion: ${window.clip}`);
    const mixer = new AnimationMixer(asset.root), action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true;
    action.play(); action.paused = true;
    return { window, clip, mixer, action };
  });
  // Candidate demos never carry the request; reset their authored pose after the split view.
  const optionMotions = optionMotionWindows.filter(w => w.group !== "Text").flatMap(window => {
    const clip = asset.clips.find(c => c.name === window.clip);
    if (!clip) return [];
    const mixer = new AnimationMixer(asset.root), action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); action.paused = true;
    return [{ window, clip, mixer, action }];
  });
  const visibility = [...asset.objects].filter(([name]) => asset.manifest.visibility_contract[name]).map(([name, object]) => {
    let group = object;
    while (group.parent && !asset.groups.has(group.name)) group = group.parent;
    return { object, events: asset.manifest.visibility_contract[name], window: armiMotionWindows.find(w => w.group === group.name), option: optionMotionWindows.find(w => w.group === group.name) };
  });
  let previousProgress = NaN;
  const outputPanel = asset.objects.get("GEO-V015-Core-SelectedSideWall");
  if (outputPanel) outputPanel.userData.web_output_rest_position ??= outputPanel.position.toArray();
  const outputPanelPosition = outputPanel ? new Vector3().fromArray(outputPanel.userData.web_output_rest_position) : null;
  const rotors=["GEO-V014-Core-SelectorRotor--2.9","GEO-V014-Core-SelectorRotor-2.9"].flatMap(name=>{
    const object=asset.objects.get(name);return object?[{object,rest:object.quaternion.clone()}]:[];
  });
  const rotorTurn=new Quaternion(),rotorAxis=new Vector3(0,1,0);
  return {
    /** `focus`: the overview hold plays one destination's authored demo (group, 0..1) in its magnified view. */
    sample(p: number, focus?: { group: string; t: number }) {
      const key = focus ? p + focus.t * 1e-3 + focus.group.length : p;
      if (key === previousProgress) return;
      previousProgress = key;
      const preview = p >= armiOptionsWindow.start && p < armiOptionsWindow.end;
      for (const { window, clip, mixer, action } of optionMotions) {
        action.play(); action.paused = true;
        action.time = (preview ? local(p, window.start, window.end) : focus?.group === window.group ? focus.t : 0) * clip.duration;
        mixer.update(0);
      }
      for (const { window, clip, mixer, action } of motions) {
        action.play(); action.paused = true;
        action.time = (preview && window.group === "Text" ? local(p, armiOptionsWindow.start, armiOptionsWindow.select) : focus?.group === window.group ? focus.t : local(p, window.start, window.end)) * clip.duration;
        mixer.update(0);
      }
      // Spin only the existing upper/lower rotors; no camera or geometry ownership changes.
      for(const {object,rest}of rotors){rotorTurn.setFromAxisAngle(rotorAxis,coreRotorAngle(p));object.quaternion.copy(rest).multiply(rotorTurn);}
      for (const { object, events, window: mainWindow, option } of visibility) {
        if (focus && option && option.group === focus.group) {
          const frame = option.frames[0] + focus.t * (option.frames[1] - option.frames[0]);
          let shown = object.userData.web_default_visible ?? true;
          for (const [at, state] of events) if (at <= frame) shown = state;
          object.visible = shown; continue;
        }
        const window = preview && option ? option : mainWindow;
        const frame = window ? window.frames[0] + local(p, window.start, window.end) * (window.frames[1] - window.frames[0]) : 49;
        let visible = object.userData.web_default_visible ?? true;
        for (const [at, state] of events) if (at <= frame) visible = state;
        object.visible = visible && !!window && p >= window.start && p <= (preview && option ? armiOptionsWindow.end : window.end);
      }
      // The existing closed side panel becomes the selected output gate.
      // Open for the physical traversal; close behind the departing request.
      if (outputPanel && outputPanelPosition) {
        const open = smooth(local(p, .412, .422)) * (1 - smooth(local(p, .46, .475)));
        outputPanel.position.copy(outputPanelPosition); outputPanel.position.y -= open * 14;
      }
      // Only the selected Text result enters the compositor, never three unexecuted branches.
      for (const [name, object] of asset.objects) {
        if (/^GEO-V014-ResponseRow-[123]$/.test(name) || /^GEO-V014-ResponseRowLine-[123]/.test(name)) object.visible = false;
        if (/^GEO-V014-(IncomingRecord|IntakeLabel|IntakeLoadConduit|ResponseIntake)-(ACTION|MEMORY|WEB)/.test(name)) object.visible = false;
        // Previs example speech is not verified product evidence.
        if (name === "GEO-V013-TextBody-0") object.visible = false;
      }
      // The isolated Blender Product set is never the website's UI location.
    asset.groups.get("Product")!.visible = false;
      const repeatedMemoryName = asset.objects.get("GEO-V013-MemoryMeaning");
      if (repeatedMemoryName) repeatedMemoryName.visible = false;
    },
    dispose() {
      previousProgress = NaN; for (const { mixer } of [...motions, ...optionMotions]) mixer.stopAllAction();
      if (outputPanel && outputPanelPosition) outputPanel.position.copy(outputPanelPosition);
      for(const {object,rest}of rotors)object.quaternion.copy(rest);
    },
  };
}

type Pose = { p: number; position: Vector3; rotation: Quaternion; fov: number };
/** Camera references establish readable holds; short authored-space handoffs join them. */
export function createArmiCameraPath(asset: ArmiProductionAsset) {
  const scratch = new PerspectiveCamera(), poses: Pose[] = [];
  const ref = (p: number, name: string) => {
    const camera = asset.root.getObjectByName(`CAM-WEB-Reference-${name}`) as PerspectiveCamera;
    camera.updateWorldMatrix(true, false);
    const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
    camera.matrixWorld.decompose(position, rotation, scale);
    poses.push({ p, position, rotation, fov: camera.fov });
  };
  const aim = (p: number, position: number[], target: number[], fov = 62) => {
    scratch.position.fromArray(position); scratch.up.set(0, 1, 0); scratch.lookAt(new Vector3().fromArray(target));
    poses.push({ p, position: scratch.position.clone(), rotation: scratch.quaternion.clone(), fov });
  };
  // Brief establishing view, then follow the same rising request into the box.
  ref(.18, "RoutingHero"); ref(.215, "RoutingHero");
  aim(.24, [-5, 15, 12], [-4, 25, -3], 66);
  aim(.265, [-4, 26, -1], [-3, 33, -11], 66);
  aim(.29, [-3, 36, -9], [-2, 40.35, -16.223], 68);
  // Retain the original encounter's intermediate pose instead of introducing a new frontal shot.
  const encounterRotation=new Quaternion().slerpQuaternions(new Quaternion(-.0743762298442941,0,0,.9972302524663745),new Quaternion(0,-.18910752115495125,0,.9819563867314219),.5);
  const encounter=(p:number)=>poses.push({p,position:new Vector3(-2,42.6,-15),rotation:encounterRotation.clone(),fov:71});
  encounter(.31); encounter(.33); encounter(.345);
  // Hold this cylinder encounter under the split. Exit directly toward the Text bridge.
  encounter(.422);
  aim(.442, [-7, 44, -25], [-20, 50, -36], 70);
  aim(.455, [-10, 49.5, -31], [-25, 57, -46], 68);
  aim(0.475, [-24, 61, -27], [-42, 68, -60], 64);
  ref(0.51, "TextAnswer"); ref(0.585, "TextAnswer");
  // Text is the sole executed destination. Handoff directly to the response lift.
  aim(0.635, [0, 35, -135.2], [0, 35, -166], 64);
  aim(0.656, [0, 48, -135.2], [0, 48, -166], 64);
  ref(.68, "ResponseCompositor"); ref(.94, "ResponseCompositor");
  return { sample(p: number, camera: PerspectiveCamera) {
    let i = 0; while (i < poses.length - 2 && p > poses[i + 1].p) i++;
    const a = poses[i], b = poses[i + 1], t = smooth(local(p, a.p, b.p));
    camera.position.lerpVectors(a.position, b.position, t);
    camera.quaternion.slerpQuaternions(a.rotation, b.rotation, t);
    camera.scale.set(1, 1, 1); camera.up.set(0, 1, 0);
    camera.fov = a.fov + (b.fov - a.fov) * t;
    camera.near = .08; camera.far = 1000;
    // Pure pose sampling also supports instant deep-link restoration.
    camera.updateProjectionMatrix();
  } };
}

export function productTransition(p: number) {
  const exit = smooth(local(p, .155, .21)), back = smooth(local(p, .89, .94));
  return { opacity: 1 - exit + back, scale: 1 + exit * .24 - back * .24, returning: p >= .89, signal: smooth(local(p, .11, .155)) * (1 - exit) };
}
