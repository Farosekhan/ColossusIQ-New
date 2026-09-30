"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarCheck2, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { GenerateReply } from "@/lib/api/schemas";
import { cleanText } from "@/lib/security/sanitize";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { AiLabel } from "@/components/ui/notices";
import { Button, Card, CardBody, CardHeader, EmptyState, Field, inputClass, Spinner } from "@/components/ui/primitives";

const MODES = ["Beginner", "Exam", "Deep learning", "Quick revision", "Last-minute preparation", "Interview", "Practical", "Project"];

const PlannerInput = z.object({
  days: z.coerce.number().int().min(3, "At least 3 days").max(90, "At most 90 days"),
  hours: z.coerce.number().int().min(1).max(12, "Keep it realistic — 12 hours max"),
  subjects: z.string().trim().min(2, "Add at least one subject").max(300),
  mode: z.enum(MODES as [string, ...string[]]),
});

export function StudyPlannerModule() {
  const [form, setForm] = useState({ days: "20", hours: "4", subjects: "DBMS, Operating Systems, Computer Networks, Machine Learning", mode: "Exam" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (inputs: Record<string, string>) => apiFetch("/api/v1/ai/generate", GenerateReply, { method: "POST", body: { module: "study-planner", inputs } }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = PlannerInput.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    mutation.mutate({ days: String(parsed.data.days), hours: String(parsed.data.hours), subjects: cleanText(parsed.data.subjects, 300), mode: parsed.data.mode });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Tell the planner your situation" subtitle="e.g. “I have 20 days for semester exams.”" />
        <CardBody>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Days until exams" htmlFor="days" error={errors.days}>
                <input id="days" type="number" inputMode="numeric" min={3} max={90} className={inputClass} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
              </Field>
              <Field label="Hours / day" htmlFor="hours" error={errors.hours}>
                <input id="hours" type="number" inputMode="numeric" min={1} max={12} className={inputClass} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </Field>
            </div>
            <Field label="Subjects (comma-separated)" htmlFor="subjects" error={errors.subjects}>
              <textarea id="subjects" rows={3} maxLength={300} className={inputClass} value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
            </Field>
            <Field label="Study mode" htmlFor="mode">
              <select id="mode" className={inputClass} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <Sparkles className="size-4" />} Generate my plan
            </Button>
            <p className="text-xs text-ink-3">The plan prioritises your weakest subjects using your mock-test history.</p>
          </form>
        </CardBody>
      </Card>

      <Card className="min-h-96">
        <CardHeader title="Your plan" subtitle="Daily schedule · subject priority · revision slots · mock tests · final strategy" />
        <CardBody>
          {mutation.isError ? (
            <p className="text-sm text-rose" role="alert">
              {mutation.error instanceof ApiError ? mutation.error.message : "Could not generate a plan."}
            </p>
          ) : mutation.isPending ? (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Spinner /> Building your plan…
            </p>
          ) : mutation.data ? (
            <div className="space-y-4">
              <SafeMarkdown>{mutation.data.markdown}</SafeMarkdown>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <AiLabel />
                <Button variant="secondary" size="sm">
                  <CalendarCheck2 className="size-4" /> Add to my calendar
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="No plan yet" body="Enter your exam window and subjects to get a day-by-day plan with revision and mock tests." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
