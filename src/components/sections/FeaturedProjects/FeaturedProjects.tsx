import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { TrackingSkeleton } from "@/components/ui/TrackingSkeleton";

const featuredProjects = [
  {
    title: "ARMI",
    label: "Healthcare AI",
    href: "/projects/armi",
    problem: "병상 환자의 작은 요청은 어떻게 더 빠르고 안전하게 전달될 수 있을까?",
    chips: ["Voice AI", "Robot State", "WebSocket", "WearOS", "AI Agent"],
    className: "bg-[#07111F] text-white",
    accent: "#60A5FA",
    visual: "armi",
  },
  {
    title: "행가래",
    label: "Rehabilitation AI",
    href: "/projects/hangarae",
    problem: "재활 동작은 어떻게 게임처럼 지속 가능한 경험이 될 수 있을까?",
    chips: ["YOLOv11-M", "Jetson Nano", "3D UX", "MCP", "Gamification"],
    className: "bg-[#F6FFFB] text-[#111827]",
    accent: "#24C27A",
    visual: "hangarae",
  },
  {
    title: "Wedding AI",
    label: "Choice Intelligence",
    href: "/projects/wedding",
    problem: "비용 때문에 충분히 비교하지 못하는 선택을 AI가 어떻게 도울 수 있을까?",
    chips: ["Generative AI", "Prompt Engineering", "2D→3D Test", "Product Decision"],
    className: "bg-[#FFF9F7] text-[#111827]",
    accent: "#B98979",
    visual: "wedding",
  },
];

function ProjectVisual({ visual }: { visual: string }) {
  if (visual === "hangarae") {
    return (
      <div className="h-48 overflow-hidden rounded-[28px] border border-emerald-100 bg-white/70 p-5">
        <TrackingSkeleton compact />
      </div>
    );
  }

  if (visual === "wedding") {
    return (
      <div className="h-48 overflow-hidden rounded-[28px]">
        <BeforeAfterFrame compact />
      </div>
    );
  }

  return (
    <div className="h-48 rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
      <div className="grid h-full grid-cols-4 items-center gap-3">
        {["Voice", "Agent", "Robot", "Watch"].map((item, index) => (
          <div key={item} className="text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 rounded-2xl border border-blue-300/30 bg-blue-300/10"
              style={{ opacity: 0.45 + index * 0.15 }}
            />
            <p className="text-xs font-semibold text-blue-100">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturedProjects() {
  return (
    <section id="projects" className="scene-shell bg-[#FAFAFA] py-28 md:py-36">
      <div className="content-grid">
        <MotionBlock>
          <p className="cinematic-label mb-8 text-blue-600">Featured Projects</p>
          <h2 className="chapter-title max-w-[900px]">
            깊은 이야기는
            <br />
            Case Study에서 보여줍니다.
          </h2>
        </MotionBlock>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {featuredProjects.map((project, index) => (
            <MotionBlock key={project.title} delay={index * 0.05}>
              <Link
                href={project.href}
                className={`flex h-[560px] flex-col justify-between rounded-[36px] p-8 md:p-10 ${project.className}`}
              >
                <div>
                  <p className="cinematic-label opacity-60">{project.label}</p>
                  <h3 className="mt-6 text-4xl font-bold">{project.title}</h3>
                  <p className="mt-6 text-lg leading-8 opacity-75">
                    {project.problem}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {project.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-current/15 px-3 py-2 text-xs font-semibold opacity-80"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <ProjectVisual visual={project.visual} />
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 small-label text-[#111827]">
                    View Case Study <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
