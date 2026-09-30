"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { emptyValues, recordSchema, RESOURCES, streamRuleErrors, type RecordValue } from "@/config/resources";
import { STREAM_DEFS, STREAMS, streamOfType } from "@/config/streams";
import { apiFetch, ApiError } from "@/lib/api/client";
import { PublicColleges } from "@/lib/api/schemas";
import { inputClass } from "@/components/ui/primitives";
import { FieldInput } from "@/components/crud/fields";
import { Fi } from "@/components/ui/icon";
import { Button, Card, LinkButton, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const RES = RESOURCES.admissions!;
// Applicants only see applicant-facing sections; status, documents and staff notes are set by the admission office.
const STEPS = RES.sections.filter((s) => s !== "Admission status");
const STEP_ICONS = ["user", "graduation-cap", "diploma", "users-alt"];
const APPLICANT_FIELDS = RES.fields.filter((f) => STEPS.includes(f.section));

export function ApplyForm() {
  const schema = useMemo(() => recordSchema(RES).omit({ status: true, documents: true, notes: true }), []);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, RecordValue>>(() => {
    const all = emptyValues(RES);
    return Object.fromEntries(APPLICANT_FIELDS.map((f) => [f.name, all[f.name] ?? null]));
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ no: string; college: string } | null>(null);
  const [colleges, setColleges] = useState<PublicColleges["colleges"]>([]);
  const [collegeId, setCollegeId] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch("/api/v1/public/colleges", PublicColleges)
      .then((d) => {
        if (!alive) return;
        const open = d.colleges.filter((c) => c.admissionsOpen);
        setColleges(open);
        const wanted = new URLSearchParams(window.location.search).get("college");
        if (wanted && open.some((c) => c.id === wanted)) setCollegeId(wanted);
      })
      .catch(() => alive && setFormError("Could not load colleges. Refresh to try again."));
    return () => {
      alive = false;
    };
  }, []);

  const picked = colleges.find((c) => c.id === collegeId);
  const stream = picked ? streamOfType(picked.type) : null;
  const stepFields = APPLICANT_FIELDS.filter((f) => f.section === STEPS[step]);
  const isLast = step === STEPS.length - 1;

  const validate = (names: string[]) => {
    const parsed = schema.safeParse(values);
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) if (names.includes(String(i.path[0]))) next[String(i.path[0])] ??= i.message;
    setErrors(next);
    if (Object.keys(next).length) document.getElementById(`f-${Object.keys(next)[0]}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const next = async () => {
    setFormError(null);
    if (step === 0 && !collegeId) {
      setErrors({ collegeId: "Choose the college you are applying to" });
      document.getElementById("f-collegeId")?.focus();
      return;
    }
    if (!validate(stepFields.map((f) => f.name))) return;
    if (stream) {
      const names = stepFields.map((f) => f.name);
      const errs = Object.fromEntries(Object.entries(streamRuleErrors(RES, values, stream)).filter(([k]) => names.includes(k)));
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
    }
    if (!isLast) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!consent) {
      setFormError("Please confirm the declaration to submit.");
      return;
    }
    if (!validate(APPLICANT_FIELDS.map((f) => f.name))) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/v1/public/admissions", z.object({ applicationNo: z.string() }), { method: "POST", body: { data: values, website, collegeId } });
      setDone({ no: res.applicationNo, college: colleges.find((c) => c.id === collegeId)?.name ?? "" });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        setFormError(e.message);
        const firstBad = APPLICANT_FIELDS.find((f) => e.fields[f.name]);
        if (e.fields.collegeId) setStep(0);
        else if (firstBad) setStep(STEPS.indexOf(firstBad.section));
      } else setFormError("Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Card className="animate-fade-up mx-auto max-w-xl p-8 text-center">
        <span className="bg-brand-gradient mx-auto flex size-16 items-center justify-center rounded-2xl text-2xl text-gold shadow-lg shadow-brand/25">
          <Fi name="check-circle" solid />
        </span>
        <h2 className="mt-5 text-2xl font-semibold text-ink">Application submitted!</h2>
        <p className="mt-2 text-ink-2">Your application number is</p>
        <p className="mt-2 inline-block rounded-xl bg-brand-soft px-4 py-2 font-mono text-xl font-semibold text-brand">{done.no}</p>
        {done.college ? <p className="mt-2 text-sm text-ink-2">Submitted to <strong>{done.college}</strong></p> : null}
        <p className="mt-4 text-sm text-ink-3">Save this number. The admission office will verify your documents and contact you on the email and mobile number you provided.</p>
        <LinkButton href="/" variant="secondary" className="mt-6">
          Back to home
        </LinkButton>
      </Card>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* Stepper */}
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li key={s} className="shrink-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                i === step && "bg-brand-gradient border-transparent text-white shadow-lg shadow-brand/20",
                i < step && "border-teal/30 bg-teal-soft text-teal",
                i > step && "border-line bg-surface text-ink-3",
              )}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", i === step ? "bg-white/15 text-gold" : i < step ? "bg-teal text-white" : "bg-surface-2")}>
                <Fi name={i < step ? "check" : STEP_ICONS[i] ?? "apps"} />
              </span>
              <span>
                <span className="block text-[11px] uppercase tracking-wider opacity-70">Step {i + 1}</span>
                <span className="block whitespace-nowrap text-sm font-semibold">{s}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-surface-2/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">{STEPS[step]}</h2>
          <p className="text-xs text-ink-3">Fields marked * are required. We never ask for Aadhaar or bank details in this form.</p>
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void next();
          }}
          className="space-y-6 p-6"
        >
          {formError ? (
            <p className="flex items-center gap-2 rounded-xl border border-rose/30 bg-rose-soft px-4 py-3 text-sm text-ink" role="alert">
              <Fi name="triangle-warning" className="text-rose" /> {formError}
            </p>
          ) : null}
          {step === 0 ? (
            <div className="space-y-1.5 rounded-2xl border border-violet/30 bg-violet-soft/50 p-4">
              <label htmlFor="f-collegeId" className="flex items-center gap-1 text-sm font-medium text-ink">
                College you are applying to <span className="text-rose" aria-hidden>*</span>
              </label>
              <select
                id="f-collegeId"
                className={inputClass}
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  // Programme choices differ per stream — clear a programme that no longer applies.
                  setValues((p) => ({ ...p, program: "" }));
                }}
                aria-invalid={Boolean(errors.collegeId)}
                disabled={busy}
              >
                <option value="">Select a college…</option>
                {STREAMS.map((s) => {
                  const list = colleges.filter((c) => streamOfType(c.type) === s);
                  return list.length ? (
                    <optgroup key={s} label={STREAM_DEFS[s].label}>
                      {list.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.city}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
              {errors.collegeId ? (
                <p className="text-xs text-rose" role="alert">
                  {errors.collegeId}
                </p>
              ) : (
                <p className="text-xs text-ink-3">
                  {stream ? `${STREAM_DEFS[stream].label} · ${STREAM_DEFS[stream].regulator} · entrance: ${STREAM_DEFS[stream].entrance.label}` : "Only colleges currently accepting online applications are listed."}
                </p>
              )}
            </div>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            {stepFields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={values[f.name] ?? null}
                error={errors[f.name]}
                disabled={busy}
                stream={stream}
                onChange={(v) => {
                  setValues((p) => ({ ...p, [f.name]: v }));
                  if (errors[f.name])
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n[f.name];
                      return n;
                    });
                }}
              />
            ))}
          </div>

          {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
          <div className="hidden" aria-hidden>
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>

          {isLast ? (
            <label className="flex items-start gap-3 rounded-xl border border-line bg-bg p-4 text-sm text-ink-2">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I declare that the information provided is true, and I consent to the institution processing it for admission purposes under the Digital Personal Data Protection Act, 2023.
            </label>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="secondary" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
              <Fi name="angle-left" /> Back
            </Button>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Spinner /> : null}
              {isLast ? (
                <>
                  <Fi name="paper-plane" /> Submit application
                </>
              ) : (
                <>
                  Continue <Fi name="angle-right" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
