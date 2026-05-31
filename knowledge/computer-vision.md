---
title: Computer Vision
category: Computer Vision
summary: YOLO, pose estimation, tracking point, 온디바이스 추론 구조를 정리합니다.
keywords: computer vision, yolo, pose, threshold, rehabilitation
difficulty: Intermediate
lastUpdated: 2026.05
readingTime: 4 min
---

## 핵심 관점

비전 모델의 출력은 그대로 제품 판단이 되지 않습니다. 화면 조건, 움직임 속도, 사용자 차이를 고려한 후처리 기준이 필요합니다.

## 적용 기준

- 판정에 필요한 관절과 구간을 먼저 좁힙니다.
- 임계값은 동작별로 분리합니다.
- 실패 사례를 기준으로 오차 범위를 조정합니다.
