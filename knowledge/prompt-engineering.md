---
title: Prompt Engineering
category: Prompt Engineering
summary: Few-shot, CoT, Role Prompting, 전문가 프롬프트 구조를 정리합니다.
keywords: prompt, evaluation, output criteria, generative ai
difficulty: Intermediate
lastUpdated: 2026.05
readingTime: 4 min
---

## 핵심 관점

프롬프트는 문장이 아니라 제품 요구사항에 가깝습니다. 사용자가 원하는 결과를 반복 가능하게 만들려면 역할, 입력, 판단 기준, 출력 형식을 분리해야 합니다.

## 적용 기준

- 결과를 평가할 기준을 먼저 정의합니다.
- 모델이 추측하면 안 되는 제약을 명시합니다.
- 실패한 출력은 문장보다 기준 단위로 수정합니다.
