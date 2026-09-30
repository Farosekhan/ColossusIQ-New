"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, CircleX, ScanSearch, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ResumeAnalysis } from "@/lib/api/schemas";
import { acceptAttr, validateUpload } from "@/lib/security/upload";
import { cleanText } from "@/lib/security/sanitize";
import { AiLabel, Notice } from "@/components/ui/notices";
import { Badge, Button, Card, CardBody, CardHeader, Field, inputClass, Progress, Spinner, toneForScore } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const TYPES = ["ATS-oriented", "Fresher", "Internship", "Technical", "Academic CV", "Research CV", "Management", "Experienced"];
const ROLES = ["Software Engineer", "Data Analyst", "Data Scientist"];

interface ResumeForm {
  name: string;
  headline: string;
  email: string;
  links: string;
  education: string;
  skills: string;
  projects: string;
  experience: string;
  achievements: string;
}

const INITIAL: ResumeForm = {
  name: "Anand Kumar",
  headline: "B.E. Computer Science (2027) · Aspiring Data Scientist",
  email: "anand.k@ait.edu.in",
  links: "github.com/anandk · linkedin.com/in/anandk",
  education: "B.E. CSE, Anna Institute of Technology — CGPA 8.21 (expected 2027)",
  skills: "Python, SQL, pandas, scikit-learn, React, Git",
  projects: "Smart Campus AI — attendance & energy insights using face embeddings and IoT meters; reduced manual attendance time by 70% for 3 sections.\nAgriSoil Sense — low-cost soil sensor with Tamil voice app (prototype).",
  experience: "Coding Club Secretary (2025–26) — organised 12 weekly contests.",
  achievements: "Smart India Hackathon 2025 finalist · SQL fundamentals certification",
};

const FIELDS: Array<[keyof ResumeForm, string, number]> = [
  ["name", "Full name", 1],
  ["headline", "Headline", 1],
  ["email", "Email", 1],
  ["links", "Links (GitHub, LinkedIn, portfolio)", 1],
  ["education", "Education", 2],
  ["skills", "Skills", 2],
  ["projects", "Projects", 4],
  ["experience", "Experience / leadership", 3],
  ["achievements", "Certifications & achievements", 2],
];

export function ResumeModule() {
  const [form, setForm] = useState<ResumeForm>(INITIAL);
  const [type, setType] = useState(TYPES[0]!);
  const [role, setRole] = useState(ROLES[0]!);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const text = useMemo(
    () => [form.name, form.headline, form.email, form.links, "Education", form.education, "Skills", form.skills, "Projects", form.projects, "Experience", form.experience, "Certifications", form.achievements].join("\n"),
    [form],
  );

  const analyze = useMutation({
    mutationFn: () => apiFetch("/api/v1/ai/resume/analyze", ResumeAnalysis, { method: "POST", body: { text: cleanText(text, 20000), role } }),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Builder"
            subtitle="Everything stays in this form until you choose to analyse or export."
            action={
              <select aria-label="Resume type" className={cn(inputClass, "w-auto")} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            }
          />
          <CardBody className="space-y-4">
            {FIELDS.map(([key, label, rows]) => (
              <Field key={key} label={label} htmlFor={`cv-${key}`}>
                {rows === 1 ? (
                  <input id={`cv-${key}`} maxLength={200} className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                ) : (
                  <textarea id={`cv-${key}`} rows={rows} maxLength={3000} className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                )}
              </Field>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Live preview" subtitle={`${type} · single-column, ATS-friendly`} />
            <CardBody>
              {/* All values are rendered as React text nodes (auto-escaped). */}
              <article className="rounded-lg border border-line bg-white p-6 text-[13px] leading-relaxed text-[#1b2233] shadow-inner">
                <h2 className="font-serif text-2xl font-semibold">{form.name}</h2>
                <p className="text-[#4a5268]">{form.headline}</p>
                <p className="mt-1 text-xs text-[#6b7285]">
                  {form.email} · {form.links}
                </p>
                {(
                  [
                    ["Education", form.education],
                    ["Skills", form.skills],
                    ["Projects", form.projects],
                    ["Experience", form.experience],
                    ["Certifications & Achievements", form.achievements],
                  ] as const
                ).map(([h, v]) =>
                  v.trim() ? (
                    <section key={h} className="mt-4">
                      <h3 className="border-b border-[#e4dfd3] pb-1 font-sans text-xs font-bold uppercase tracking-wider text-[#1e2a5a]">{h}</h3>
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                        {v.split("\n").filter(Boolean).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null,
                )}
              </article>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="AI Resume Optimisation" subtitle="Keywords · structure · skill match · missing sections · quantification" />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select aria-label="Target role" className={cn(inputClass, "w-auto")} value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <Button onClick={() => analyze.mutate()} disabled={analyze.isPending}>
                  {analyze.isPending ? <Spinner /> : <ScanSearch className="size-4" />} Analyse builder content
                </Button>
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" /> Upload existing resume
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept={acceptAttr("resume")}
                  aria-label="Resume file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const check = await validateUpload(f, "resume");
                    setUploadMsg(check.ok ? "File verified. Text extraction runs server-side on the live platform; the demo analyses the builder content." : check.reason);
                  }}
                />
              </div>
              {uploadMsg ? <Notice tone="sky">{uploadMsg}</Notice> : null}
              {analyze.isError ? (
                <p className="text-sm text-rose" role="alert">
                  {analyze.error instanceof ApiError ? analyze.error.message : "Analysis failed."}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      {analyze.data ? <AnalysisView a={analyze.data} role={role} /> : null}
    </div>
  );
}

function AnalysisView({ a, role }: { a: ResumeAnalysis; role: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="p-6">
        <p className="text-sm text-ink-3">ATS readiness for {role}</p>
        <p className="mt-1 font-serif text-5xl font-semibold text-ink">{a.atsScore}</p>
        <Progress value={a.atsScore} tone={toneForScore(a.atsScore)} className="mt-3" label="ATS score" />
        <p className="mt-3 text-xs text-ink-3">An indicator of parse-ability and keyword coverage — not a hiring prediction.</p>
      </Card>
      <Card>
        <CardHeader title="Findings" />
        <CardBody className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {a.keywordsFound.map((k) => (
                <Badge key={k} tone="teal">
                  {k}
                </Badge>
              ))}
              {a.keywordsMissing.map((k) => (
                <Badge key={k} tone="neutral">
                  + {k}
                </Badge>
              ))}
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {a.sections.map((s) => (
              <li key={s.name} className="flex gap-2.5 rounded-lg border border-line p-3">
                {s.status === "good" ? <CheckCircle2 className="size-4 shrink-0 text-teal" /> : s.status === "improve" ? <CircleAlert className="size-4 shrink-0 text-amber" /> : <CircleX className="size-4 shrink-0 text-rose" />}
                <div>
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-2">{s.note}</p>
                </div>
              </li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {a.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <AiLabel />
        </CardBody>
      </Card>
    </div>
  );
}
