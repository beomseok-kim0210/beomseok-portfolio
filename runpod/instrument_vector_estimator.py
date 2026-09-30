"""Build the attention-exposing copy of Supertonic 3's vector_estimator.onnx.

voice/supertonic_align.py reads the text cross-attention of the very inference that
produces the waveform. The shipped graph does not return that attention, so this script
makes a copy whose only difference is that the attention Softmax tensors are also listed
as graph outputs. Nothing else changes: same nodes in the same order, same initializers
(weights), same inputs, and the original outputs first and in the same order — so the
latent the copy returns is the latent the original returns (checked by
runpod/verify_alignment_identity.py on byte-identical audio).

Run once when preparing the image build context (needs the `onnx` package, which the
runtime image does not carry):

    python runpod/instrument_vector_estimator.py \
        models/supertonic-3/onnx/vector_estimator.onnx \
        models/supertonic-align/vector_estimator_attn.onnx

It refuses a source whose sha256 is not the pinned one (runpod/MODEL-HASHES.md).
"""
import hashlib
import sys

import onnx

SOURCE_SHA256 = "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def weights(model):
    return {t.name: hashlib.sha256(t.SerializeToString()).hexdigest() for t in model.graph.initializer}


def main(src, dst):
    got = sha256(src)
    if got != SOURCE_SHA256:
        sys.exit(f"source sha256 {got} is not the pinned vector_estimator {SOURCE_SHA256}")

    original = onnx.load(src)
    model = onnx.load(src)
    names = [n.output[0] for n in model.graph.node if n.op_type == "Softmax"]
    for name in names:
        model.graph.output.append(onnx.helper.make_tensor_value_info(name, onnx.TensorProto.FLOAT, None))

    # Only outputs were added.
    assert [n.SerializeToString() for n in model.graph.node] == [n.SerializeToString() for n in original.graph.node]
    assert weights(model) == weights(original)
    assert [i.SerializeToString() for i in model.graph.input] == [i.SerializeToString() for i in original.graph.input]
    k = len(original.graph.output)
    assert [o.name for o in model.graph.output[:k]] == [o.name for o in original.graph.output]
    assert [o.name for o in model.graph.output[k:]] == names

    onnx.save(model, dst)
    if sha256(src) != SOURCE_SHA256:
        sys.exit("source changed while instrumenting")
    print(f"softmax outputs added: {len(names)}")
    print(f"initializers identical: {len(original.graph.initializer)}")
    print(f"{dst} sha256 {sha256(dst)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: instrument_vector_estimator.py <vector_estimator.onnx> <out.onnx>")
    main(sys.argv[1], sys.argv[2])
