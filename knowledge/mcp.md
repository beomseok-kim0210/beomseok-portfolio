---
title: MCP
category: MCP
summary: AI 도구 연결과 컨텍스트 관리 구조를 정리합니다.
keywords: mcp, tools, context, workspace, integration
difficulty: Intermediate
lastUpdated: 2026.05
readingTime: 3 min
---

## 핵심 관점

MCP는 AI에게 도구를 붙이는 방식이 아니라, 도구 사용에 필요한 맥락과 권한을 구조화하는 방식입니다.

## 적용 기준

- 도구별 입력과 출력 계약을 명확히 둡니다.
- 사용자의 작업 공간 상태를 먼저 확인합니다.
- 외부 시스템 변경은 검증 가능한 단계로 나눕니다.
