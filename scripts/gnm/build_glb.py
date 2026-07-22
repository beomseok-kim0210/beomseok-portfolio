"""docent_head.npz → public/models/docent.glb (감정 5 + 비짐 6 모프타겟).

GLB 계약 (src/features/docent/DocentHead.tsx와의 인터페이스):
  - 루트 노드/메쉬 이름 "Head" (three.js에서 scene.getObjectByName("Head")가 Mesh)
  - morphTargetDictionary 키:
      감정: smile, thinking, surprised, sad, blink
      비짐: viseme_a, viseme_i, viseme_u, viseme_e, viseme_o, viseme_m
  - 원점 = 목 피벗 근사(메쉬 바닥에서 35% 높이), +Z 응시, 머리 높이 ~0.25 유닛

비짐은 입 주변 정점만 움직이므로 glTF sparse accessor로 저장한다. 움직이지
않는 정점은 파일에 아예 담기지 않아 모프 하나당 용량이 크게 줄어든다.

사용법:
  cd C:/Users/kbs02/Desktop/gnm-pipeline
  ./venv/Scripts/python <repo>/scripts/gnm/build_glb.py \
      --npz ./out/docent_head.npz --out <repo>/public/models/docent.glb
"""

from __future__ import annotations

import argparse
import pathlib

import numpy as np
import pygltflib

MORPH_ORDER = [
    "smile",
    "thinking",
    "surprised",
    "sad",
    "blink",
    "viseme_a",
    "viseme_i",
    "viseme_u",
    "viseme_e",
    "viseme_o",
    "viseme_m",
]
SKIN_COLOR = [0.851, 0.678, 0.573, 1.0]  # 무광 스킨톤
# sparse 제외 임계값. CVAE 샘플러가 얼굴 전체에 미세 노이즈를 남기므로
# 절대값만으로는 걸러지지 않는다. 모프 자신의 최대 변위 대비 상대 임계를 함께 쓴다.
SPARSE_EPSILON_ABS = 2e-5
SPARSE_EPSILON_REL = 0.01  # 최대 변위의 1% 미만 이동은 눈에 보이지 않음


def compute_vertex_normals(vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    normals = np.zeros_like(vertices)
    tri_verts = vertices[triangles]
    face_n = np.cross(
        tri_verts[:, 1] - tri_verts[:, 0], tri_verts[:, 2] - tri_verts[:, 0]
    )
    for i in range(3):
        np.add.at(normals, triangles[:, i], face_n)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    lengths[lengths == 0] = 1.0
    return (normals / lengths).astype(np.float32)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", type=pathlib.Path, required=True)
    parser.add_argument("--out", type=pathlib.Path, required=True)
    parser.add_argument("--head-height", type=float, default=0.25)
    args = parser.parse_args()

    data = np.load(args.npz)
    triangles = np.asarray(data["triangles"], dtype=np.uint32)
    base = np.asarray(data["vertices_neutral"], dtype=np.float32)

    # --- 좌표 정규화: 원점=목 피벗 근사, 높이 스케일 ---
    mins, maxs = base.min(axis=0), base.max(axis=0)
    height = maxs[1] - mins[1]
    scale = args.head_height / height
    pivot = np.array(
        [
            (mins[0] + maxs[0]) / 2.0,
            mins[1] + 0.35 * height,
            (mins[2] + maxs[2]) / 2.0,
        ],
        dtype=np.float32,
    )
    transform = lambda v: ((v - pivot) * scale).astype(np.float32)  # noqa: E731

    base_t = transform(base)
    normals = compute_vertex_normals(base_t, triangles)

    # 얼굴이 +Z를 보는지 검증
    face_center_band = np.abs(base_t[:, 0]) < 0.01
    nose_z = base_t[face_center_band, 2]
    if abs(nose_z.min()) > abs(nose_z.max()):
        raise SystemExit(
            "얼굴이 -Z를 보고 있습니다. 180도 회전 로직이 필요합니다. "
            f"(z range: {nose_z.min():.3f}..{nose_z.max():.3f})"
        )

    missing = [n for n in MORPH_ORDER if f"vertices_{n}" not in data]
    if missing:
        raise SystemExit(
            f"npz에 없는 모프: {missing}\n"
            "generate_docent_head.py를 먼저 다시 실행하세요."
        )

    deltas = {
        name: transform(np.asarray(data[f"vertices_{name}"], dtype=np.float32)) - base_t
        for name in MORPH_ORDER
    }

    # --- 바이너리 버퍼 조립 ---
    blob = bytearray()

    def push(arr: np.ndarray) -> int:
        """blob에 4바이트 정렬로 추가하고 bufferView 인덱스를 반환."""
        while len(blob) % 4:
            blob.extend(b"\x00")
        offset = len(blob)
        raw = arr.tobytes()
        blob.extend(raw)
        buffer_views.append(
            pygltflib.BufferView(buffer=0, byteOffset=offset, byteLength=len(raw))
        )
        return len(buffer_views) - 1

    accessors: list[pygltflib.Accessor] = []
    buffer_views: list[pygltflib.BufferView] = []

    def add_dense(
        arr: np.ndarray, component_type: int, type_: str, target: int, minmax: bool
    ) -> int:
        view = push(arr)
        buffer_views[view].target = target
        acc = pygltflib.Accessor(
            bufferView=view,
            componentType=component_type,
            count=len(arr),
            type=type_,
        )
        if minmax:
            acc.min = arr.min(axis=0).tolist()
            acc.max = arr.max(axis=0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    def add_sparse_morph(delta: np.ndarray) -> tuple[int, int]:
        """움직인 정점만 담는 sparse accessor. (accessor 인덱스, 저장 정점 수)."""
        magnitude = np.abs(delta).max(axis=1)
        threshold = max(SPARSE_EPSILON_ABS, SPARSE_EPSILON_REL * magnitude.max())
        moved = np.flatnonzero(magnitude > threshold)
        # 전혀 안 움직이면 spec상 sparse.count>=1이라 첫 정점을 0 델타로 넣는다
        if moved.size == 0:
            moved = np.array([0], dtype=np.uint32)

        idx_view = push(moved.astype(np.uint32))
        val_view = push(delta[moved].astype(np.float32))

        acc = pygltflib.Accessor(
            # bufferView 없음 = 기본값 전부 0, sparse가 움직인 곳만 덮어씀
            componentType=pygltflib.FLOAT,
            count=len(delta),
            type="VEC3",
            min=delta.min(axis=0).tolist(),
            max=delta.max(axis=0).tolist(),
            sparse=pygltflib.Sparse(
                count=int(moved.size),
                indices=pygltflib.AccessorSparseIndices(
                    bufferView=idx_view,
                    byteOffset=0,
                    componentType=pygltflib.UNSIGNED_INT,
                ),
                values=pygltflib.AccessorSparseValues(
                    bufferView=val_view, byteOffset=0
                ),
            ),
        )
        accessors.append(acc)
        return len(accessors) - 1, int(moved.size)

    idx_indices = add_dense(
        triangles.reshape(-1, 1),
        pygltflib.UNSIGNED_INT,
        "SCALAR",
        pygltflib.ELEMENT_ARRAY_BUFFER,
        minmax=False,
    )
    # SCALAR는 (N,1)로 넣었으므로 count를 정점 인덱스 개수로 되돌린다
    accessors[idx_indices].count = triangles.size

    idx_position = add_dense(
        base_t, pygltflib.FLOAT, "VEC3", pygltflib.ARRAY_BUFFER, minmax=True
    )
    idx_normal = add_dense(
        normals, pygltflib.FLOAT, "VEC3", pygltflib.ARRAY_BUFFER, minmax=False
    )

    target_accessors: list[int] = []
    print("모프타겟 sparse 통계:")
    for name in MORPH_ORDER:
        acc_index, moved_count = add_sparse_morph(deltas[name])
        target_accessors.append(acc_index)
        ratio = moved_count / len(base_t) * 100
        print(f"  {name:12s} 움직인 정점 {moved_count:6d} / {len(base_t)} ({ratio:4.1f}%)")

    primitive = pygltflib.Primitive(
        attributes=pygltflib.Attributes(POSITION=idx_position, NORMAL=idx_normal),
        indices=idx_indices,
        material=0,
        targets=[pygltflib.Attributes(POSITION=i) for i in target_accessors],
    )

    gltf = pygltflib.GLTF2()
    gltf.asset = pygltflib.Asset(
        version="2.0", generator="beomseok-portfolio gnm pipeline"
    )
    gltf.materials = [
        pygltflib.Material(
            name="Skin",
            pbrMetallicRoughness=pygltflib.PbrMetallicRoughness(
                baseColorFactor=SKIN_COLOR, metallicFactor=0.0, roughnessFactor=0.75
            ),
            doubleSided=False,
        )
    ]
    gltf.meshes = [
        pygltflib.Mesh(
            name="Head",
            primitives=[primitive],
            weights=[0.0] * len(MORPH_ORDER),
            extras={"targetNames": MORPH_ORDER},
        )
    ]
    gltf.nodes = [pygltflib.Node(name="Head", mesh=0)]
    gltf.scenes = [pygltflib.Scene(name="DocentHead", nodes=[0])]
    gltf.scene = 0
    gltf.accessors = accessors
    gltf.bufferViews = buffer_views
    gltf.buffers = [pygltflib.Buffer(byteLength=len(blob))]

    gltf.set_binary_blob(bytes(blob))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    gltf.save_binary(str(args.out))

    size_mb = args.out.stat().st_size / 1e6
    print(f"\nSaved {args.out} ({size_mb:.2f} MB)")
    print(f"  vertices={len(base_t)}, triangles={len(triangles)}")
    print(f"  morphs({len(MORPH_ORDER)})={MORPH_ORDER}")
    if size_mb > 3:
        print("  WARNING: >3MB — gltf-transform draco 압축 검토")


if __name__ == "__main__":
    main()
