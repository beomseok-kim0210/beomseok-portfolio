/**
 * 이 테스트 파일은 레거시 코퍼스(src/data · knowledge 빌더)를 전제로 한다 — 스냅샷이 있어도 레거시로 고정한다.
 * 반드시 테스트 파일의 첫 import 로 둔다(다른 모듈이 코퍼스를 읽기 전에 환경을 정해야 한다).
 * 레거시 코퍼스는 DOCENT_CORPUS=legacy 되돌리기 경로이자 스냅샷 검증 실패 시의 폴백이라 회귀 테스트로 유지한다.
 */
process.env.DOCENT_CORPUS = "legacy";
