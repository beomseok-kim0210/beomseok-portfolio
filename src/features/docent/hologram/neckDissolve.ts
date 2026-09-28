import { Color, Material, Matrix4, Mesh, Vector4, type Object3D } from "three";
import { HOLOGRAM_GEOMETRY, HOLOGRAM_PALETTE } from "./hologramConfig";
import {
  neckDissolveFragmentDecl,
  neckDissolveFragmentDiscard,
  neckDissolveFragmentEdge,
  neckDissolveVertexBody,
  neckDissolveVertexDecl,
} from "./hologramShaders";

/**
 * 모든 패치된 재질이 같은 uniform 객체를 가리킨다. 챔버가 시간을 한 번 쓰면
 * 피부·구강·치아가 함께 따라간다.
 */
export const neckDissolveUniforms = {
  uHoloTime: { value: 0 },
  uHoloSolidY: { value: HOLOGRAM_GEOMETRY.neck.solidY as number },
  uHoloEnergyY: { value: HOLOGRAM_GEOMETRY.neck.energyY as number },
  uHoloGoneY: { value: HOLOGRAM_GEOMETRY.neck.goneY as number },
  /** 챔버가 매 프레임 카메라·캔버스에서 계산해 넣는다 — 스캔 행을 렌더 픽셀로 맞춘다. */
  uHoloUnitsPerPx: { value: 0.0007 },
  uHoloColor: { value: new Color(HOLOGRAM_PALETTE.primary) },
  uHoloColor2: { value: new Color(HOLOGRAM_PALETTE.secondary) },
};

const CACHE_KEY = "holoNeckDissolveV3";

interface Patched {
  material: Material;
  /** 메쉬 로컬 → 머리 공간 변환의 y 행. 재질마다 따로 쥔다. */
  yRow: { value: Vector4 };
}

// 원본 재질 → 패치본. 다시 마운트돼도 셰이더를 새로 컴파일하지 않는다.
const patched = new WeakMap<Material, Patched>();
const clones = new WeakMap<Material, Patched>();

function patch(material: Material): Patched {
  // 이미 패치본이면 두 번 주입하지 않는다.
  const existing = clones.get(material) ?? patched.get(material);
  if (existing) return existing;
  // 원본은 useGLTF 캐시가 쥐고 있다. 복제본에만 주입한다 — 이름·색·맵은 그대로 복제된다.
  const clone = material.clone();
  const yRow = { value: new Vector4(0, 1, 0, 0) };
  clone.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, neckDissolveUniforms, { uHoloYRow: yRow });
    // 모프 타깃이 반영된 transformed 를 쓴다 — 입이 열려도 경계가 정점을 따라간다.
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${neckDissolveVertexDecl}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${neckDissolveVertexBody}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${neckDissolveFragmentDecl}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>\n${neckDissolveFragmentDiscard}`,
      )
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>\n${neckDissolveFragmentEdge}`);
  };
  clone.customProgramCacheKey = () => CACHE_KEY;
  const entry = { material: clone, yRow };
  patched.set(material, entry);
  clones.set(clone, entry);
  return entry;
}

/**
 * 목 아래쪽 디졸브만 주입한다. 모프 타깃·UV·기본 색은 건드리지 않는다.
 * 경계는 `root`(= GLB 씬, 머리 그룹 안) 공간에서 판정하므로 머리의 아이들
 * 흔들림·끄덕임과 함께 움직인다. 반환된 함수가 원래 재질을 되돌린다.
 */
export function applyNeckDissolve(root: Object3D): () => void {
  const originals = new Map<Mesh, Material | Material[]>();
  root.updateWorldMatrix(true, true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const relative = new Matrix4();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    relative.multiplyMatrices(toRoot, object.matrixWorld);
    const e = relative.elements;
    const bind = (material: Material) => {
      const entry = patch(material);
      entry.yRow.value.set(e[1], e[5], e[9], e[13]);
      return entry.material;
    };
    originals.set(object, object.material);
    object.material = Array.isArray(object.material)
      ? object.material.map(bind)
      : bind(object.material);
  });
  return () => {
    for (const [mesh, material] of originals) mesh.material = material;
  };
}
