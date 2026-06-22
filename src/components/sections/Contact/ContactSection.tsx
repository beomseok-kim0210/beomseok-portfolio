import { Github, Mail, NotebookTabs } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";

const contactLinks = [
  {
    label: "Email",
    handle: "yongt102028@gmail.com",
    href: "mailto:yongt102028@gmail.com",
    icon: Mail,
    external: false,
  },
  {
    label: "GitHub",
    handle: "@beomseok-kim0210",
    href: "https://github.com/beomseok-kim0210",
    icon: Github,
    external: true,
  },
  {
    label: "Notion",
    handle: "Portfolio",
    href: "https://app.notion.com/p/Home-37c8c96517988158aaf8f07a40dff2f4",
    icon: NotebookTabs,
    external: true,
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

          {/* 연락 링크 — 세 개 동일한 크기·형태 */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {contactLinks.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="group inline-flex items-center gap-2.5 text-[16px] transition-colors"
                >
                  <Icon
                    className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-[#111827]"
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
