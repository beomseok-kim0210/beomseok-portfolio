"use client";

import { Check, Copy, Lightbulb } from "lucide-react";
import { useState } from "react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { designPrompts } from "@/data/designPrompts";

export function DesignPromptLibrary() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1800);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시 (권한/HTTP 등)
    }
  };

  return (
    <section id="design-prompts" className="scene-shell bg-[#FAFAFA]">
      <div className="content-grid py-20 md:py-28">
        <MotionBlock>
          <p className="cinematic-label text-blue-600">Prompt Engineering</p>
          <h2 className="section-title mt-5 max-w-[720px]">
            이미지 생성 디자인 프롬프트 라이브러리.
          </h2>
          <p className="body-copy mt-5 max-w-[680px]">
            2026 트렌드 디자인 스타일 {designPrompts.length}종을 복사해 바로 쓰는
            프롬프트로 정리했습니다. 스타일을 입히고 싶은 이미지를 첨부하고,
            바꾸고 싶은 점을 적은 뒤 프롬프트를 붙여넣으세요. (ChatGPT 이미지
            생성 기준)
          </p>
        </MotionBlock>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {designPrompts.map((item, index) => (
            <MotionBlock key={item.id} delay={Math.min(index * 0.05, 0.3)}>
              <article className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="small-label text-slate-400">
                      {item.id}
                    </span>
                    <h3 className="mt-2 text-2xl font-semibold text-ink">
                      {item.nameKo}
                    </h3>
                    <p className="mt-1 text-[13px] font-medium uppercase tracking-widest text-blue-600">
                      {item.nameEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.prompt)}
                    aria-label={`${item.nameKo} 프롬프트 복사`}
                    className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                      copiedId === item.id
                        ? "bg-blue-600 text-white"
                        : "bg-ink text-white hover:bg-slate-700"
                    }`}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-4 w-4" /> 복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> 복사
                      </>
                    )}
                  </button>
                </div>

                <p className="body-copy mt-4">{item.description}</p>

                {item.tip ? (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-[13px] leading-6 text-blue-900">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{item.tip}</span>
                  </div>
                ) : null}

                <pre className="knowledge-scroll mt-5 max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[#0b1120] p-5 font-mono text-[12.5px] leading-6 text-slate-200">
                  {item.prompt}
                </pre>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
