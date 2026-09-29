"""Supertonic 3 가 발화 전체를 거부하는 기호·서식 문자의 코드포인트 범위를 뽑는다.

`src/lib/docent/supertonicUnsupported.ts` 의 표는 이 스크립트의 출력이다. 표를 손으로
고치지 말고, 모델이나 supertonic 패키지가 바뀌면 이것을 다시 돌려 표를 교체한다.

판정은 추측이 아니라 모델의 `unicode_indexer.json` 을 로드한 `UnicodeProcessor`
`.validate_text()` 다 — 합성 경로가 `ValueError: Found N unsupported character(s)` 를
던질 때 쓰는 바로 그 함수. 범주는 구두점(P*)·기호(S*)·공백(Z*)·제어/서식(C*) 만 본다.
글자(L*)·숫자(N*)는 지우면 뜻이 사라지므로 이 표의 대상이 아니다.

  D:/dd-supertonic-v1/venv/Scripts/python.exe scripts/voice/supertonic-unsupported-ranges.py \
      D:/dd-supertonic-v1/models/supertonic-3/onnx/unicode_indexer.json > ranges.json
"""
import json
import sys
import unicodedata

from supertonic.core import UnicodeProcessor

processor = UnicodeProcessor(sys.argv[1])

rejected = []
for cp in range(0x0, 0x30000):
    if 0xD800 <= cp <= 0xDFFF:
        continue
    ch = chr(cp)
    category = unicodedata.category(ch)
    if category == "Cn" or category[0] not in "PSZC" or ch in "\n\t\r":
        continue
    if not processor.validate_text(ch)[0]:
        rejected.append(cp)

ranges = []
for cp in rejected:
    if ranges and cp == ranges[-1][1] + 1:
        ranges[-1][1] = cp
    else:
        ranges.append([cp, cp])

json.dump(ranges, sys.stdout)
