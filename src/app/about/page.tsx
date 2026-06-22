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
import { ProfileImage } from "@/components/ui/ProfileImage";

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

      <section className="mx-auto grid max-w-[1280px] items-start gap-12 px-6 pb-24 pt-36 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-10 lg:px-12">
        <div className="md:pt-4">
          <SectionLabel>About</SectionLabel>
          <h1 className="mt-8 text-[72px] font-bold leading-[0.98] text-[#111827] md:text-[96px]">
            Kim Beomseok
          </h1>
          <p className="mt-6 text-[36px] font-semibold leading-[1.15] text-slate-700 md:text-[48px]">
            AI Product Engineer
          </p>
          <p className="mt-10 max-w-[640px] text-[24px] leading-[1.55] text-slate-600 md:text-[30px]">
            Building AI products that connect
            <br />
            models to real user problems.
          </p>

          {/* 연락 링크 — 왼쪽으로 옮겨 좌우 균형을 맞춤 */}
          <div className="mt-12 flex flex-wrap gap-3">
            {[
              {
                label: "GitHub",
                handle: "@beomseok-kim0210",
                href: "https://github.com/beomseok-kim0210",
                external: true,
              },
              {
                label: "Email",
                handle: "yongt102028@gmail.com",
                href: "mailto:yongt102028@gmail.com",
                external: false,
              },
              {
                label: "Portfolio",
                handle: "Home",
                href: "/",
                external: false,
              },
            ].map((link) => {
              const content = (
                <>
                  <span className="text-[15px] font-semibold text-slate-900">
                    {link.label}
                  </span>
                  <span className="text-[13px] text-slate-400">
                    {link.handle}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#111827]" />
                </>
              );
              const className =
                "group inline-flex items-center gap-2.5 rounded-[8px] border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#111827]";

              if (link.href.startsWith("/")) {
                return (
                  <Link key={link.label} href={link.href} className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={className}
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>

        <aside className="h-auto rounded-[8px] border border-slate-200 bg-white p-8">
          <div className="mb-8 overflow-hidden rounded-[6px]">
            <div className="aspect-[4/5] w-full bg-slate-100">
              <ProfileImage
                src="/images/profile/beomseok-main.jpg"
                alt="김범석 프로필 사진"
              />
            </div>
          </div>
          <SectionLabel>Profile</SectionLabel>
          <div className="mt-9 space-y-5">
            {aboutProfile
              .filter((item) => item.label !== "Name" && item.label !== "Role")
              .map((item) => (
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
        </aside>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-[160px] md:px-10 lg:px-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-16">
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
          <div className="overflow-hidden rounded-[8px] border border-slate-200">
            <div className="aspect-[4/5] w-full bg-slate-100">
              <ProfileImage
                src="/images/profile/beomseok-formal.jpg"
                alt="김범석 프로필 사진 (정면)"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0B1120] py-[140px] md:py-[170px]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-12">
          <p className="text-[14px] font-semibold uppercase leading-none tracking-[0.18em] text-blue-300">
            At a Glance
          </p>
          <div className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {aboutSnapshot.map((item) => (
              <div key={item.label} className="border-t border-white/10 pt-6">
                <p className="text-[64px] font-bold leading-none tracking-[-0.03em] text-white md:text-[88px]">
                  {item.value}
                </p>
                <p className="mt-4 text-[18px] font-semibold leading-[1.3] text-slate-400 md:text-[20px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
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
