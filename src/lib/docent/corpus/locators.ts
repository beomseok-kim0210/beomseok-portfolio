/**
 * 공개 파일(런타임 스냅샷·임베딩 아티팩트)에 있으면 안 되는 원 출처 위치 검사.
 * 큐레이션 원본(gitignore)은 실제 Notion/GitHub 출처를 그대로 갖고, 공개 스냅샷은 불투명 sourceKey 만 갖는다.
 */

/** 원 출처 위치: Notion URL · collection:// · 원시 Notion 페이지 ID(32 hex 또는 UUID). 커밋 SHA(40 hex)는 걸리지 않는다. */
export const PRIVATE_LOCATOR_RE = /https?:\/\/[^\s"')]*notion\.(?:so|site|com)[^\s"')]*|notion\.(?:so|site|com)\/[^\s"')]*|collection:\/\/[^\s"')]*|(?<![0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![0-9a-f])|(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/gi;

/** 공개 JSON 에 남은 원 출처 위치·비공개 이름(소문자 비교). 빌드 게이트·런타임 재검사·감사 스크립트가 같이 쓴다. */
export function publicSnapshotLeaks(json: string, privateNames: string[] = []): string[] {
  const out = [...new Set(json.match(PRIVATE_LOCATOR_RE) ?? [])].map((m) => `locator:${m.slice(0, 24)}…`);
  const lower = json.toLowerCase();
  for (const n of privateNames) if (lower.includes(n)) out.push("private_name");
  return [...new Set(out)];
}
