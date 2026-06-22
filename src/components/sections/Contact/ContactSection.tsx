import { ArrowUpRight, Github, NotebookTabs } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";

const PRIMARY_EMAIL = "yongt102028@gmail.com";

const secondaryLinks = [
  {
    label: "GitHub",
    handle: "@beomseok-kim0210",
    href: "https://github.com/beomseok-kim0210",
    icon: Github,
  },
  {
    label: "Notion",
    handle: "Portfolio",
    href: "https://app.notion.com/p/Home-37c8c96517988158aaf8f07a40dff2f4",
    icon: NotebookTabs,
  },
];

export function ContactSection() {
  return (
    <footer
      id="contact"
      className="scene-shell flex min-h-[80vh] items-center bg-[#FAFAFA] py-24"
    >
      <div className="mx-auto w-full max-w-[1100px] px-5 md:px-8 lg:px-12">
        <MotionBlock>
          <div className="text-center">
            <p className="cinematic-label mb-8 text-blue-600">
              Contact · 함께 만들 동료를 찾습니다
            </p>
            <h2 className="chapter-title">
              <span className="block">
                <span className="font-black text-blue-700">사람</span>은 기술을
              </span>
              <span className="block">기억하지 않습니다.</span>
              <span className="block">
                <span className="font-black text-blue-700">경험을 기억</span>합니다.
              </span>
            </h2>
            <p className="subtitle mx-auto mt-8 max-w-[680px] text-slate-600">
              제품처럼 작동하는 AI 경험을 함께 만들고 싶습니다.
            </p>
          </div>

          {/* Signature: 실제 이메일을 오버사이즈 타이포 링크로 — 이 페이지의 마지막 한 방 */}
          <div className="mt-16 flex justify-center md:mt-20">
            <a
              href={`mailto:${PRIMARY_EMAIL}`}
              className="group inline-flex items-center gap-3 text-[clamp(26px,5vw,56px)] font-[680] leading-none tracking-[-0.035em] text-[#111827] transition-colors hover:text-blue-700"
            >
              <span className="underline decoration-transparent decoration-2 underline-offset-[12px] transition-colors group-hover:decoration-blue-600">
                {PRIMARY_EMAIL}
              </span>
              <ArrowUpRight
                className="h-[0.7em] w-[0.7em] shrink-0 text-blue-600 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
          </div>

          {/* 보조 링크 — 조용하게, 실제 핸들과 함께 */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {secondaryLinks.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-[15px] transition-colors"
                >
                  <Icon
                    className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#111827]"
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-slate-700 transition-colors group-hover:text-[#111827]">
                    {link.label}
                  </span>
                  <span className="text-slate-400 transition-colors group-hover:text-slate-600">
                    {link.handle}
                  </span>
                </a>
              );
            })}
          </div>
        </MotionBlock>
      </div>
    </footer>
  );
}
