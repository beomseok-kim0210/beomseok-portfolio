---
title: Agent Architecture
category: Agent Architecture
summary: AI Agent의 상태, 기억, 도구 사용 흐름을 정리합니다.
keywords: agent, tool routing, state, memory, recovery
difficulty: Advanced
lastUpdated: 2026.05
readingTime: 6 min
---

## 핵심 관점

에이전트는 모델 호출이 아니라 상태와 도구를 다루는 제품 구조입니다. 사용자의 의도를 유지하면서 실패를 복구할 수 있어야 합니다.

## 적용 기준

- 도구 호출 전 필요한 입력을 검증합니다.
- 장기 기억과 현재 작업 상태를 분리합니다.
- 실패 시 재시도보다 복구 전략을 먼저 정의합니다.
