import { MotionBlock } from "@/components/ui/MotionBlock";
import { weddingPivot } from "@/data/weddingResearch";

export function WeddingPivotSection() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr_1fr]">
      <MotionBlock>
        <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
          <p className="small-label text-[#B98979]">Original Goal</p>
          <h3 className="mt-6 text-3xl font-semibold leading-tight text-[#111827]">
            {weddingPivot.originalGoal}
          </h3>
        </article>
      </MotionBlock>
      <MotionBlock delay={0.06}>
        <article className="rounded-[32px] border border-[#E5E7EB] bg-white/78 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
          <p className="small-label text-[#B98979]">Pivot Reason</p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            {weddingPivot.reason}
          </p>
          <div className="mt-6 rounded-[24px] bg-[#FFF4EF] p-6">
            <p className="text-lg leading-8 text-[#111827]">{weddingPivot.insight}</p>
          </div>
          <div className="mt-6 border-t border-[#E5E7EB] pt-6">
            <p className="small-label text-slate-500">Therefore</p>
            <p className="mt-3 text-lg leading-8 text-slate-600">
              {weddingPivot.therefore}
            </p>
          </div>
        </article>
      </MotionBlock>
      <MotionBlock delay={0.12}>
        <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
          <p className="small-label text-[#B98979]">Final Direction</p>
          <h3 className="mt-6 text-3xl font-semibold leading-tight text-[#111827]">
            {weddingPivot.finalDirection}
          </h3>
        </article>
      </MotionBlock>
    </div>
  );
}
