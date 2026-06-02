import { ArrowRight, BrainCircuit, Github, Mail, NotebookTabs } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";

const contactLinks = [
  { label: "GitHub", href: "#hero", icon: Github },
  { label: "Notion", href: "#hero", icon: NotebookTabs },
  { label: "Email", href: "mailto:", icon: Mail },
  { label: "Resume", href: "#hero", icon: ArrowRight },
  { label: "AI Knowledge", href: "/knowledge", icon: BrainCircuit },
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
            <p className="cinematic-label mb-8 text-blue-600">Contact</p>
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
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {contactLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    aria-label={link.label}
                    className="group flex h-24 items-center justify-between rounded-[24px] border border-[#E2E8F0] bg-white px-5 transition duration-200 hover:-translate-y-1 hover:border-[#111827]"
                  >
                    <span className="small-label text-slate-700">{link.label}</span>
                    <Icon
                      className="h-5 w-5 text-slate-400 transition-colors group-hover:text-[#111827]"
                      aria-hidden="true"
                    />
                  </a>
                );
              })}
            </div>
          </div>
        </MotionBlock>
      </div>
    </footer>
  );
}
