import { MotionBlock } from "@/components/ui/MotionBlock";

const experts = [
  "Body Expert",
  "Color Expert",
  "Accessory Expert",
  "Design Expert",
  "Style Expert",
];

export function WeddingAgentScene() {
  return (
    <div className="min-h-screen px-6 py-28">
      <div className="content-grid">
        <MotionBlock>
          <div className="mx-auto max-w-[840px] text-center">
            <p className="cinematic-label mb-8 text-blue-600">
              Multi-Agent Prompt Structure
            </p>
            <h3 className="story-title">
              AI는 생성보다
              <br />
              판단 기준이 더 중요했습니다.
            </h3>
          </div>
        </MotionBlock>
        <MotionBlock delay={0.12}>
          <div className="mx-auto mt-16 grid max-w-[980px] gap-5 md:grid-cols-3">
            {[
              ["Input", "사용자 얼굴 사진 · 원하는 드레스 스타일 텍스트 · 조건 / 제약 / 출력 기준"],
              ["Prompt Design", "단순 문장이 아니라 조건, 제약, 출력 기준을 분리한 구조"],
              ["Output", "가상 피팅 이미지 · 추천 근거 · 비교 가능한 옵션"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-[28px] border border-rose-100 bg-white p-6 shadow-soft"
              >
                <p className="small-label text-blue-600">{title}</p>
                <p className="mt-8 text-[15px] leading-7 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <div className="relative mx-auto mt-8 grid max-w-[980px] gap-5 md:grid-cols-5">
            {experts.map((expert) => (
              <div
                key={expert}
                className="min-h-[190px] rounded-[32px] border border-rose-100 bg-white p-6 text-center shadow-soft"
              >
                <div className="mx-auto mb-10 h-3 w-3 rounded-full bg-blue-600" />
                <p className="text-xl font-semibold leading-tight">{expert}</p>
              </div>
            ))}
          </div>
        </MotionBlock>
      </div>
    </div>
  );
}
