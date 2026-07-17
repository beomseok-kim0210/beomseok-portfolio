"""GNM으로 도슨트 헤드의 베이스+표정 메쉬 세트를 생성한다.

Google GNM(github.com/google/gnm)의 시맨틱 샘플러(CVAE)로 identity 1개와
표정 6종(smile/thinking/surprised/sad/talking/blink)의 정점 배열을 만들어
docent_head.npz 로 저장하고, 확인용 프리뷰 PNG를 함께 렌더한다.

사용법 (gnm-pipeline venv에서 실행):
  cd C:/Users/kbs02/Desktop/gnm-pipeline
  ./venv/Scripts/python <repo>/scripts/gnm/generate_docent_head.py --out ./out

출력:
  out/docent_head.npz   # vertices_{name}, triangles, base 대비 델타는 빌드 단계에서 계산
  out/preview_{name}.png
"""

from __future__ import annotations

import argparse
import os
import pathlib

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import numpy as np

from gnm.shape import gnm_numpy
from gnm.shape import semantic_sampler

Expression = semantic_sampler.Expression

# 표정 레시피: CVAE 클래스 블렌드 → 383차원 expression 벡터.
# scale은 블렌드 결과를 곱해 강도를 조절한다 (морф는 웹에서 0~1로 다시 조절되므로
# 여기서는 "최대 강도" 기준의 자연스러운 상한을 잡는다).
EXPRESSION_RECIPES: dict[str, tuple[dict[Expression, float], float]] = {
    "smile": ({Expression.HAPPY: 0.7, Expression.SMILE_WIDE: 0.3}, 1.0),
    "thinking": ({Expression.SQUINT: 0.6, Expression.MOUTH_LEFT: 0.4}, 0.9),
    "surprised": ({Expression.SURPRISE: 1.0}, 1.0),
    "sad": ({Expression.CORNERS_DOWN: 0.8, Expression.COMPRESS_FACE: 0.2}, 0.9),
    # 턱 관절이 없어 입벌림은 SURPRISE(턱 하강 성분 포함)를 약하게 써서 만든다.
    "talking": ({Expression.SURPRISE: 0.55, Expression.FUNNELER: 0.25}, 0.8),
    "blink": ({Expression.WINK_LEFT: 1.0, Expression.WINK_RIGHT: 1.0}, 1.0),
}


def render_preview(vertices: np.ndarray, triangles: np.ndarray, path: pathlib.Path) -> None:
    """matplotlib로 정면 프리뷰를 렌더한다 (확인용, 저품질이어도 무방)."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig = plt.figure(figsize=(5, 6))
    ax = fig.add_subplot(111, projection="3d")
    step = 2  # 삼각형 절반만 그려도 실루엣 확인엔 충분
    ax.plot_trisurf(
        vertices[:, 0],
        vertices[:, 2],
        vertices[:, 1],
        triangles=triangles[::step],
        color=(0.85, 0.72, 0.62),
        edgecolor="none",
        shade=True,
    )
    ax.view_init(elev=5, azim=-90)
    ax.set_box_aspect((1, 1, 1.2))
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=pathlib.Path, default=pathlib.Path("out"))
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument(
        "--identity-scale",
        type=float,
        default=1.0,
        help="identity 벡터 스케일 (0=평균 얼굴)",
    )
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(args.seed)

    print("Loading GNM head model...")
    gnm = gnm_numpy.GNM.from_local(
        version=gnm_numpy.GNMMajorVersion.V3,
        variant=gnm_numpy.GNMVariant.HEAD,
    )

    print("Sampling identity (MALE + ASIAN)...")
    identity_sampler = semantic_sampler.IdentitySampler()
    identity = identity_sampler.blend_identities(
        {semantic_sampler.Gender.MALE: 1.0},
        {semantic_sampler.Ethnicity.ASIAN: 1.0},
        1,
        rng=rng,
    )
    identity = np.asarray(identity).reshape(-1) * args.identity_scale

    expression_sampler = semantic_sampler.ExpressionSampler()
    rotations = np.zeros((gnm.num_joints, 3))
    translation = np.zeros(3)

    meshes: dict[str, np.ndarray] = {}
    neutral_expr = np.zeros(gnm.expression_dim)
    meshes["neutral"] = np.asarray(
        gnm(identity, neutral_expr, rotations, translation), dtype=np.float32
    )

    for name, (weights, scale) in EXPRESSION_RECIPES.items():
        print(f"Generating expression: {name}")
        expr = np.asarray(
            expression_sampler.blend_expressions(weights, rng=rng)
        ).reshape(-1) * scale
        meshes[name] = np.asarray(
            gnm(identity, expr, rotations, translation), dtype=np.float32
        )

    triangles = np.asarray(gnm.triangles, dtype=np.uint32)

    npz_payload: dict[str, np.ndarray] = {"triangles": triangles}
    for name, verts in meshes.items():
        npz_payload[f"vertices_{name}"] = verts
        render_preview(verts, triangles, args.out / f"preview_{name}.png")
        delta = float(np.abs(verts - meshes["neutral"]).max()) if name != "neutral" else 0.0
        print(f"  {name}: verts={verts.shape}, max delta vs neutral={delta:.4f}")

    out_npz = args.out / "docent_head.npz"
    np.savez_compressed(out_npz, **npz_payload)
    print(f"Saved {out_npz} ({out_npz.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
