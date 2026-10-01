/**
 * 코퍼스에 비밀값이 섞였는지 — 큐레이션 패키지는 Notion·GitHub 에서 옮겨 온 글이라 .env 조각, 토큰, 키가 섞일
 * 수 있다. 코퍼스는 방문자 답변의 근거이자 임베딩 API 로 보내는 글이므로 하나라도 있으면 빌드를 막는다.
 *
 * 오탐이 있으면 패키지의 secretAllowlist 에 {chunkId, match, reason} 으로 정확한 부분 문자열만 허용한다
 * (그 조각의 그 문자열만 — 패턴 전체를 끄지 않는다).
 */
import type { SecretAllowlistEntry } from "./schema";

export interface SecretFinding {
  kind: string;
  /** 앞 6자 + 길이만. 값 자체는 보고서·로그에 남기지 않는다. */
  preview: string;
}

const PATTERNS: Array<[string, RegExp]> = [
  ["openai_key", /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g],
  ["anthropic_key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["runpod_key", /\brpa_[A-Za-z0-9]{20,}/g],
  ["github_token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/g],
  ["aws_access_key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["google_api_key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["slack_token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ["notion_token", /\b(?:secret|ntn)_[A-Za-z0-9]{40,}/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["bearer_token", /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/g],
  ["private_key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g],
  // .env 꼴: 대문자 변수명이 KEY/SECRET/TOKEN/PASSWORD 로 끝나고 값이 8자 이상
  ["env_secret", /\b[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD)\s*[=:]\s*["']?[^\s"'<>]{8,}/g],
  ["url_credentials", /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{6,}@/gi],
];

export function findSecrets(text: string, allow: string[] = []): SecretFinding[] {
  const out: SecretFinding[] = [];
  for (const [kind, re] of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const hit = m[0];
      if (allow.some((a) => a.length > 0 && (hit.includes(a) || a.includes(hit)))) continue;
      out.push({ kind, preview: `${hit.slice(0, 6)}…(${hit.length})` });
    }
  }
  return out;
}

export function allowFor(chunkId: string, list: SecretAllowlistEntry[] | undefined): string[] {
  return (list ?? []).filter((e) => e.chunkId === chunkId).map((e) => e.match);
}
