---
title: RAG
category: RAG
summary: 검색, 임베딩, 벡터DB, 응답 품질 개선 방식을 정리합니다.
keywords: rag, retrieval, grounding, chunk, embedding
difficulty: Intermediate
lastUpdated: 2026.05
readingTime: 4 min
---

## 핵심 관점

RAG는 문서를 넣는 기능이 아니라, 질문에 맞는 근거를 찾아 답변의 책임 범위를 좁히는 구조입니다.

## 적용 기준

- 청크 크기는 문서 형식보다 질문 단위에 맞춥니다.
- 검색 결과는 점수와 출처를 함께 확인합니다.
- 답변은 검색된 근거 밖으로 확장하지 않습니다.
