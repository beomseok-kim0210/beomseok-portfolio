import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  aboutAwards,
  aboutExploration,
  aboutFocusAreas,
  aboutIntroduction,
  aboutJourney,
  aboutProfile,
  aboutSnapshot,
  aboutToolbox,
} from "@/data/about";
import { navItems } from "@/data/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "Kim Beomseok, AI Product Engineer focused on AI agents, computer vision, multi-agent systems, and product engineering.",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] font-semibold uppercase leading-none tracking-[0.18em] text-blue-600">
      {children}
    </p>
  );
}

function ChipList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-[8px] border border-slate-200 bg-white px-3.5 py-2 text-[17px] font-semibold text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="bg-[#FAFAFA] text-[#111827]">
      <SiteHeader items={navItems} />

      <section className="mx-auto grid min-h-[80vh] max-w-[1280px] items-center gap-12 px-6 pb-24 pt-36 md:grid-cols-[1.5fr_1fr] md:px-10 lg:px-12">
        <div>
          <SectionLabel>About</SectionLabel>
          <h1 className="mt-8 text-[72px] font-bold leading-[0.98] text-[#111827] md:text-[96px]">
            Kim Beomseok
          </h1>
          <p className="mt-6 text-[36px] font-semibold leading-[1.15] text-slate-700 md:text-[48px]">
            AI Product Engineer
          </p>
          <p className="mt-10 max-w-[720px] text-[24px] leading-[1.55] text-slate-600 md:text-[30px]">
            Building AI products that connect
            <br />
            models to real user problems.
          </p>
        </div>

        <aside className="h-auto min-h-[780px] rounded-[8px] border border-slate-200 bg-white p-8">
          <SectionLabel>Profile</SectionLabel>
          <div className="mt-9 space-y-5">
            {aboutProfile.map((item) => (
              <div key={item.label} className="border-b border-slate-100 pb-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.value.map((value) => (
                    <span
                      key={value}
                      className="rounded-[8px] bg-slate-50 px-3 py-1.5 text-[17px] font-semibold text-slate-900"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3">
            {["GitHub", "Portfolio", "Email"].map((item) => (
              <Link
                key={item}
                href={item === "Portfolio" ? "/" : "#"}
                className="flex h-14 items-center justify-between rounded-[8px] border border-slate-200 px-4 text-[16px] font-semibold text-slate-700"
              >
                {item}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <div className="max-w-[840px]">
          <SectionLabel>Who I Am</SectionLabel>
          <h2 className="mt-8 text-[52px] font-bold leading-[1] text-slate-950 md:text-[72px]">
            From trade major
            <br />
            to AI product builder.
          </h2>
          <p className="mt-10 text-[24px] leading-[1.7] text-slate-600">
            {aboutIntroduction}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>At a Glance</SectionLabel>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {aboutSnapshot.map((item) => (
            <div
              key={item.label}
              className="flex h-[220px] flex-col justify-between rounded-[8px] border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-2"
            >
              <p className="text-[72px] font-bold leading-none text-[#111827]">
                {item.value}
              </p>
              <p className="text-[22px] font-semibold leading-[1.2] text-slate-700">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>Journey</SectionLabel>
        <div className="mt-14 border-l border-slate-300">
          {aboutJourney.map((item) => (
            <article key={item.step} className="relative pb-16 pl-10 last:pb-0">
              <span className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full bg-blue-600" />
              <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                {item.step}
              </p>
              <div className="mt-3 grid gap-6 md:grid-cols-[180px_1fr]">
                <p className="text-[42px] font-bold leading-none text-slate-900">
                  {item.year}
                </p>
                <div className="rounded-[8px] border border-slate-200 bg-white p-7">
                  <h2 className="text-[34px] font-semibold leading-[1.1] text-slate-900">
                    {item.title}
                  </h2>
                  <div className="mt-7 grid gap-5 md:grid-cols-2">
                    {item.groups.map((group) => (
                      <div key={group.label}>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                          {group.label}
                        </p>
                        <div className="mt-3">
                          <ChipList items={group.items} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>What I Focus On</SectionLabel>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {aboutFocusAreas.map((area) => (
            <article
              key={area.title}
              className="flex min-h-[420px] flex-col justify-between rounded-[8px] border border-slate-200 bg-white p-8"
            >
              <div>
                <h2 className="text-[40px] font-bold leading-[1] text-slate-950">
                  {area.title}
                </h2>
                <p className="mt-6 text-[22px] font-semibold leading-[1.55] text-slate-600">
                  {area.description}
                </p>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Key Technologies
                  </p>
                  <div className="mt-3">
                    <ChipList items={area.technologies} />
                  </div>
                </div>
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Representative Projects
                  </p>
                  <div className="mt-3">
                    <ChipList items={area.projects} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>Technical Toolbox</SectionLabel>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {aboutToolbox.map((group) => (
            <article
              key={group.title}
              className="min-h-[220px] rounded-[8px] border border-slate-200 bg-white p-7"
            >
              <h2 className="text-[30px] font-bold text-slate-950">
                {group.title}
              </h2>
              <div className="mt-7">
                <ChipList items={group.items} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>Recognition</SectionLabel>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {aboutAwards.map((award) => (
            <article
              key={award.title}
              className="min-h-[260px] rounded-[8px] border border-slate-200 bg-white p-8"
            >
              <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Award
              </p>
              <h2 className="mt-8 text-[42px] font-bold leading-[1.05] text-slate-950">
                {award.title}
              </h2>
              <p className="mt-6 text-[22px] font-semibold leading-[1.55] text-slate-600">
                {award.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <SectionLabel>Currently Exploring</SectionLabel>
        <div className="mt-12 flex gap-5 overflow-x-auto pb-4">
          {aboutExploration.map((item) => (
            <article
              key={item.title}
              className="h-[180px] w-[320px] shrink-0 rounded-[8px] border border-slate-200 bg-white p-6"
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                {item.status}
              </p>
              <h2 className="mt-8 text-[30px] font-bold leading-[1.05] text-slate-950">
                {item.title}
              </h2>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
