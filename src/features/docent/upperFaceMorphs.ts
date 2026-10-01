import { BufferAttribute, type BufferGeometry, type Mesh } from "three";

/**
 * 말하는 동안에도 감정이 보이게 하는 윗얼굴 전용 감정 모프 — GLB 를 바꾸지 않고 로드할 때 만든다.
 *
 * 감정 모프(smile/thinking/surprised/sad)는 변위의 대부분이 입 영역에 있어서, 입모양 모프와 같은
 * 입술 정점을 두고 싸운다. 그래서 발화 중에는 감정 모프 전체를 0.1 로 줄여 왔다(립싱크 보호).
 * 그러면 눈·눈썹·볼의 감정까지 함께 사라진다.
 *
 * 여기서는 같은 감정 모프를 복사하되 입 영역을 부드럽게 0 으로 가린 사본(`smile:upper` 등)을
 * 더한다. 발화 중에는 원래 모프를 지금처럼 0.1 로 두고(입 영역은 그대로), 사본으로 윗얼굴만
 * 나머지 0.9 를 채운다 — 입술은 한 정점도 더 움직이지 않는다.
 *
 * 가림 경계는 운영 자산(M2.13 runtime-compat) 실측: 입술은 y ≈ -0.4, 눈은 y ≈ 0.0~0.1
 * (blink 변위 위치), 볼은 그 사이. y ≤ -0.28 은 0, y ≥ -0.16 은 1, 사이는 smoothstep.
 */
export const UPPER_FACE_SUFFIX = ":upper";
export const UPPER_FACE_MASK = Object.freeze({ fromY: -0.28, toY: -0.16 });

export function upperFaceWeight(y: number): number {
  const { fromY, toY } = UPPER_FACE_MASK;
  if (y <= fromY) return 0;
  if (y >= toY) return 1;
  const x = (y - fromY) / (toY - fromY);
  return x * x * (3 - 2 * x);
}

export const upperFaceName = (name: string) => `${name}${UPPER_FACE_SUFFIX}`;

const DERIVED = "ddUpperFaceMorphs";

function maskedCopy(src: BufferAttribute, weights: Float32Array): BufferAttribute {
  const out = new Float32Array(src.count * 3);
  for (let i = 0; i < src.count; i += 1) {
    const w = weights[i];
    if (w === 0) continue;
    out[3 * i] = src.getX(i) * w;
    out[3 * i + 1] = src.getY(i) * w;
    out[3 * i + 2] = src.getZ(i) * w;
  }
  const attr = new BufferAttribute(out, 3);
  attr.name = src.name ? upperFaceName(src.name) : "";
  return attr;
}

/**
 * 메쉬의 감정 모프마다 윗얼굴 사본을 더한다. 같은 지오메트리에 두 번 더하지 않는다(useGLTF 는
 * 장면을 캐시해 여러 마운트가 같은 지오메트리를 쓴다). 더한 이름을 돌려준다.
 * 위치와 법선 모프를 함께 복사한다 — 둘의 개수가 어긋나면 셰이더가 깨진다.
 */
export function deriveUpperFaceMorphs(mesh: Mesh, names: readonly string[]): string[] {
  const geometry = mesh.geometry as BufferGeometry;
  const dictionary = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  const positions = geometry.morphAttributes.position;
  const position = geometry.attributes.position;
  if (!dictionary || !influences || !positions || !position) return [];

  // 지오메트리에 이미 만든 사본의 자리(이름 → 모프 인덱스). 다른 메쉬 인스턴스와 공유된다.
  const done = (geometry.userData[DERIVED] as Record<string, number> | undefined) ?? {};
  const normals = geometry.morphAttributes.normal;
  let weights: Float32Array | null = null;
  const added: string[] = [];
  for (const name of names) {
    const derived = upperFaceName(name);
    const slot = dictionary[name];
    if (slot === undefined || dictionary[derived] !== undefined) continue;
    let index = done[derived];
    if (index === undefined) {
      if (!weights) {
        weights = new Float32Array(position.count);
        for (let i = 0; i < position.count; i += 1) weights[i] = upperFaceWeight(position.getY(i));
      }
      index = positions.length;
      positions.push(maskedCopy(positions[slot] as BufferAttribute, weights));
      if (normals && normals[slot]) normals.push(maskedCopy(normals[slot] as BufferAttribute, weights));
      done[derived] = index;
    }
    dictionary[derived] = index;
    while (influences.length <= index) influences.push(0);
    added.push(derived);
  }
  geometry.userData[DERIVED] = done;
  return added;
}
