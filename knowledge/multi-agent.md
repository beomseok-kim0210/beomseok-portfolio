---
title: Multi-Agent
category: Multi-Agent
summary: 역할 분리, 에이전트 협업, 검증 루프를 정리합니다.
keywords: multi-agent, planner, executor, reviewer, workflow
difficulty: Advanced
lastUpdated: 2026.05
readingTime: 5 min
---

## 핵심 관점

복잡한 판단은 하나의 AI보다 역할이 나뉜 구조에서 더 안정적일 수 있습니다. 계획, 실행, 검토를 분리하면 실패 지점도 더 명확해집니다.

## 적용 기준

- 각 에이전트는 하나의 책임만 갖습니다.
- 결과 통합 단계에서 충돌 기준을 정합니다.
- 검토 에이전트는 실행 에이전트와 다른 기준을 사용합니다.
