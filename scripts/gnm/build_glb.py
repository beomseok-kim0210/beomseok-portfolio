"""docent_head.npz → public/models/docent.glb (모프타겟 6개 포함) 조립.

GLB 계약 (src/features/docent/DocentHead.tsx와의 인터페이스):
  - 루트 노드/메쉬 이름 "Head" (three.js에서 scene.getObjectByName("Head")가 Mesh)
  - morphTargetDictionary 키: smile, thinking, surprised, sad, talking, blink
    (mesh.extras.targetNames — three.js GLTFLoader가 읽는 위치)
  - 원점 = 목 피벗 근사(메쉬 바닥에서 35% 높이), +Z 응시, 머리 높이 ~0.25 유닛

사용법:
  cd C:/Users/kbs02/Desktop/gnm-pipeline
  ./venv/Scripts/python <repo>/scripts/gnm/build_glb.py \
      --npz ./out/docent_head.npz --out <repo>/public/models/docent.glb
"""

from __future__ import annotations

import argparse
import pathlib
import struct

import numpy as np
import pygltflib

MORPH_ORDER = ["smile", "thinking", "surprised", "sad", "talking", "blink"]
SKIN_COLOR = [0.851, 0.678, 0.573, 1.0]  # 무광 스킨톤


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
    # 목 피벗: 바닥에서 35% 높이, 수평은 스컬 중심
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

    # 얼굴이 +Z를 보는지 검증: 코끝(=|z| 최대인 얼굴 중앙 정점)의 z 부호 확인
    face_center_band = np.abs(base_t[:, 0]) < 0.01
    nose_z = base_t[face_center_band, 2]
    if abs(nose_z.min()) > abs(nose_z.max()):
        raise SystemExit(
            "얼굴이 -Z를 보고 있습니다. 180도 회전 로직을 추가해야 합니다. "
            f"(z range: {nose_z.min():.3f}..{nose_z.max():.3f})"
        )

    deltas = {
        name: transform(np.asarray(data[f"vertices_{name}"], dtype=np.float32))
        - base_t
        for name in MORPH_ORDER
    }

    # --- 바이너리 버퍼 조립 ---
    blob = bytearray()

    def push(arr: np.ndarray) -> tuple[int, int]:
        """blob에 4바이트 정렬로 추가하고 (offset, length) 반환."""
        while len(blob) % 4:
            blob.extend(b"\x00")
        offset = len(blob)
        raw = arr.tobytes()
        blob.extend(raw)
        return offset, len(raw)

    gltf = pygltflib.GLTF2()
    gltf.asset = pygltflib.Asset(version="2.0", generator="beomseok-portfolio gnm pipeline")

    accessors: list[pygltflib.Accessor] = []
    buffer_views: list[pygltflib.BufferView] = []

    def add_accessor(
        arr: np.ndarray,
        component_type: int,
        type_: str,
        target: int,
        minmax: bool = False,
    ) -> int:
        offset, length = push(arr)
        buffer_views.append(
            pygltflib.BufferView(buffer=0, byteOffset=offset, byteLength=length, target=target)
        )
        acc = pygltflib.Accessor(
            bufferView=len(buffer_views) - 1,
            componentType=component_type,
            count=len(arr) if arr.ndim > 1 else arr.size,
            type=type_,
        )
        if minmax:
            acc.min = arr.min(axis=0).tolist()
            acc.max = arr.max(axis=0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    idx_indices = add_accessor(
        triangles.reshape(-1), pygltflib.UNSIGNED_INT, "SCALAR", pygltflib.ELEMENT_ARRAY_BUFFER
    )
    idx_position = add_accessor(
        base_t, pygltflib.FLOAT, "VEC3", pygltflib.ARRAY_BUFFER, minmax=True
    )
    idx_normal = add_accessor(normals, pygltflib.FLOAT, "VEC3", pygltflib.ARRAY_BUFFER)

    target_accessors = []
    for name in MORPH_ORDER:
        target_accessors.append(
            add_accessor(deltas[name], pygltflib.FLOAT, "VEC3", pygltflib.ARRAY_BUFFER, minmax=True)
        )

    primitive = pygltflib.Primitive(
        attributes=pygltflib.Attributes(POSITION=idx_position, NORMAL=idx_normal),
        indices=idx_indices,
        material=0,
        targets=[pygltflib.Attributes(POSITION=i) for i in target_accessors],
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
    print(f"Saved {args.out} ({size_mb:.2f} MB)")
    print(f"  vertices={len(base_t)}, triangles={len(triangles)}, morphs={MORPH_ORDER}")
    print(f"  bounds y: {base_t[:,1].min():.3f}..{base_t[:,1].max():.3f} (pivot=origin)")
    if size_mb > 3:
        print("  WARNING: >3MB — gltf-transform draco 압축 필요")


if __name__ == "__main__":
    main()
