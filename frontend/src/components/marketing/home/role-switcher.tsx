"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface RoleView {
  key: string;
  label: string;
  icon: string;
  headline: ReactNode;
  points: string[];
  preview: ReactNode;
}

const Row = ({ a, b, tone = "ink" }: { a: string; b: string; tone?: "ink" | "teal" | "amber" }) => (
  <div className="flex items-center justify-between border-b border-dashed border-line py-2 text-[13px] last:border-0">
    <span className="text-ink-2">{a}</span>
    <span className={cn("font-mono text-[12px]", tone === "teal" ? "text-teal" : tone === "amber" ? "text-amber" : "text-ink")}>{b}</span>
  </div>
);

const ROLES: RoleView[] = [
  {
    key: "student",
    label: "Student",
    icon: "graduation-cap",
    headline: (
      <>
        Your semester, <em>planned</em>. Your career, <em>visible</em>.
      </>
    ),
    points: [
      "Courses published by your department, read one lesson at a time.",
      "A 30-question final assessment per course, and a certificate graded by your marks.",
      "A placement-readiness score out of 100, with the next step to raise it.",
    ],
    preview: (
      <>
        <p className="eyebrow">My courses</p>
        <Row a="Database Management Systems" b="100% · Grade O" tone="teal" />
        <Row a="Operating Systems" b="6 / 8 lessons" />
        <Row a="Python Programming" b="Final unlocked" tone="amber" />
        <Row a="Placement readiness" b="78 / 100" tone="teal" />
      </>
    ),
  },
  {
    key: "faculty",
    label: "Faculty",
    icon: "chalkboard-user",
    headline: (
      <>
        Teach more. <em>Grade less</em>. Stay in charge.
      </>
    ),
    points: [
      "Quiz builder that drafts department questions you edit before publishing.",
      "AI evaluation of answer sheets with confidence and evidence. You approve every mark.",
      "Lesson plans, question papers and rubrics from the teaching copilot.",
    ],
    preview: (
      <>
        <p className="eyebrow">Evaluation review · Q3</p>
        <Row a="AI suggested mark" b="7 / 10" />
        <Row a="Confidence" b="82%" tone="teal" />
        <Row a="Missing concept" b="Lossless join" tone="amber" />
        <div className="mt-3 flex gap-2">
          <span className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white">Approve</span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink">Override</span>
        </div>
      </>
    ),
  },
  {
    key: "hod",
    label: "HOD",
    icon: "users",
    headline: (
      <>
        Build the course <em>once</em>. Every student benefits.
      </>
    ),
    points: [
      "Start from a course title or paste your university syllabus.",
      "Review the lessons and a 30-question final assessment built from them.",
      "Publish to your students in one click. Nothing goes live without you.",
    ],
    preview: (
      <>
        <p className="eyebrow">AI Course Studio</p>
        <ol className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px]">
          {["Details", "Lessons", "Assessment", "Publish"].map((s, i) => (
            <li key={s} className={cn("rounded-lg px-1 py-2", i < 3 ? "bg-teal-soft text-teal" : "bg-brand text-white")}>
              <span className="block font-mono">0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <Row a="Lessons" b="13 in 4 units" />
        <Row a="Questions reviewed" b="30 / 30" tone="teal" />
      </>
    ),
  },
  {
    key: "principal",
    label: "Principal",
    icon: "building",
    headline: (
      <>
        The whole college, on <em>one page</em>.
      </>
    ),
    points: [
      "NAAC, NMC and AICTE readiness tracked against the norms that apply to you.",
      "Your college website, events, gallery and admissions, managed in one place.",
      "Early-warning signals turned into support recommendations for staff to review.",
    ],
    preview: (
      <>
        <p className="eyebrow">Command center</p>
        <Row a="Attendance this week" b="91.4%" tone="teal" />
        <Row a="NAAC criteria ready" b="6 / 7" />
        <Row a="Students needing support" b="14" tone="amber" />
        <Row a="Admissions this cycle" b="1,284" />
      </>
    ),
  },
  {
    key: "placement",
    label: "Placement",
    icon: "briefcase",
    headline: (
      <>
        Shortlists in <em>seconds</em>, not spreadsheets.
      </>
    ),
    points: [
      "Every student's readiness total and exactly what is missing.",
      "Certificates recruiters can verify online, without calling the college.",
      "Filter and export a drive shortlist, with roll numbers masked.",
    ],
    preview: (
      <>
        <p className="eyebrow">Readiness board</p>
        <Row a="Imran B. · Commerce" b="81 · Ready" tone="teal" />
        <Row a="Nikhil S. · Computer Sci." b="77 · Ready" tone="teal" />
        <Row a="Meera N. · Zoology" b="73 · Almost" tone="amber" />
        <Row a="Shreya M. · Mathematics" b="72 · Almost" tone="amber" />
      </>
    ),
  },
];

export function RoleSwitcher() {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const role = ROLES[active]!;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? ROLES.length - 1 : delta ? (active + delta + ROLES.length) % ROLES.length : null;
    if (to === null) return;
    e.preventDefault();
    setActive(to);
    tabs.current[to]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Choose a role" onKeyDown={onKey} className="flex flex-wrap gap-2">
        {ROLES.map((r, i) => (
          <button
            key={r.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`role-tab-${r.key}`}
            aria-selected={i === active}
            aria-controls={`role-panel-${r.key}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              i === active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink/40 hover:text-ink",
            )}
          >
            <Fi name={r.icon} /> {r.label}
          </button>
        ))}
      </div>

      <div
        key={role.key}
        role="tabpanel"
        id={`role-panel-${role.key}`}
        aria-labelledby={`role-tab-${role.key}`}
        className="animate-fade-up mt-8 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]"
      >
        <div>
          <h3 className="display text-4xl text-ink sm:text-5xl">{role.headline}</h3>
          <ul className="mt-7 space-y-4">
            {role.points.map((p, i) => (
              <li key={p} className="flex gap-4 text-ink-2">
                <span className="mt-0.5 font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 border-b border-ink pb-0.5 text-sm font-semibold text-ink hover:border-gold hover:text-brand">
            Open the {role.label.toLowerCase()} portal <Fi name="arrow-up-right" />
          </Link>
        </div>
        <div className="paper relative p-6">
          <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[#1b2233]">
            {role.label} view
          </span>
          {role.preview}
        </div>
      </div>
    </div>
  );
}
