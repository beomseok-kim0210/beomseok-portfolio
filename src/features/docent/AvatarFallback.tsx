import type { DocentEmotion } from "@/types/docent";

/**
 * 3D 를 정말 쓸 수 없을 때(WebGL 미지원, 또는 짧은 시간에 컨텍스트를 반복해서 잃음)만
 * 쓰는 조용한 자리 표시. 예전의 이모지 얼굴은 "얼굴이 이상한 이모티콘으로 바뀐다"로
 * 읽혀서 없앴다. 텍스트 대화는 그대로 쓸 수 있다.
 */
export function AvatarFallback({
  emotion,
  shell = false,
}: {
  emotion: DocentEmotion;
  shell?: boolean;
}) {
  return (
    <div
      data-avatar-fallback
      data-emotion={emotion}
      className={shell
        ? "relative z-10 flex h-full w-full flex-col items-center justify-center gap-3"
        : "relative flex h-[42vh] min-h-[300px] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:h-[560px]"}
    >
      <span aria-hidden="true" className="h-10 w-10 rounded-full border border-sky-200/25 bg-sky-300/10" />
      <p className="px-6 text-center text-xs leading-5 text-slate-400">
        이 환경에서는 3D 도슨트를 표시할 수 없어요. 텍스트로 계속 대화할 수 있습니다.
      </p>
    </div>
  );
}
