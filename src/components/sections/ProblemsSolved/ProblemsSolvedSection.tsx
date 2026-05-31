import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";

const problems = [
  {
    title: "ARMI",
    summary: "Voice, Realtime, Watch",
    href: "/projects/armi",
    cta: "View ARMI Challenges",
  },
  {
    title: "행가래",
    summary: "Pose AI, Gamification",
    href: "/projects/hangarae",
    cta: "View Hangarae Challenges",
  },
  {
    title: "Wedding AI",
    summary: "Product Decision, Generative AI",
    href: "/projects/wedding",
    cta: "View Wedding Challenges",
  },
];

export function ProblemsSolvedSection() {
  return (
    <section id="problems" className="scene-shell bg-white py-28 md:py-36">
      <div className="content-grid">
        <MotionBlock>
          <p className="cinematic-label mb-8 text-blue-600">Problems I Solved</p>
          <h2 className="chapter-title max-w-[900px]">Problems I Solved</h2>
          <p className="subtitle mt-8 max-w-[720px] text-slate-600">
            대표 프로젝트마다 마주한 문제를 각 Case Study 안에서 정리했습니다.
          </p>
        </MotionBlock>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {problems.map((problem) => (
            <Link
              key={problem.title}
              href={problem.href}
              className="rounded-[32px] border border-slate-200 bg-[#FAFAFA] p-7 transition-colors hover:bg-white"
            >
              <p className="text-3xl font-semibold">{problem.title}</p>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                {problem.summary}
              </p>
              <p className="small-label mt-12 inline-flex items-center gap-2 text-blue-600">
                {problem.cta} <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
