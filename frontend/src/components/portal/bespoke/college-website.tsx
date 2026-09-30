"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { WEBSITE, emptyValues, recordSchema, type RecordValue } from "@/config/resources";
import { apiFetch, ApiError } from "@/lib/api/client";
import { FieldInput } from "@/components/crud/fields";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Fi } from "@/components/ui/icon";
import { Button, Card, CardBody, EmptyState, IconChip, LinkButton, Spinner } from "@/components/ui/primitives";

const SiteResponse = z.object({
  collegeId: z.string(),
  site: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
});

export function CollegeWebsiteModule() {
  const { data, isLoading, error } = useQuery({ queryKey: ["college-website"], queryFn: () => apiFetch("/api/v1/website", SiteResponse) });
  if (isLoading) return <TemplateSkeleton />;
  if (error || !data)
    return (
      <EmptyState
        title={error instanceof ApiError && error.code === "choose_college" ? "Choose a college first" : "Could not load the website"}
        body={error instanceof ApiError ? error.message : undefined}
      />
    );
  return <Editor key={String(data.site.version)} collegeId={data.collegeId} site={data.site} />;
}

function Editor({ collegeId, site }: { collegeId: string; site: Record<string, RecordValue> }) {
  const qc = useQueryClient();
  const initial = Object.fromEntries(WEBSITE.fields.map((f) => [f.name, site[f.name] ?? emptyValues(WEBSITE)[f.name] ?? null]));
  const [values, setValues] = useState<Record<string, RecordValue>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: (d: Record<string, RecordValue>) => apiFetch("/api/v1/website", SiteResponse, { method: "PUT", body: { data: d, version: Number(site.version) } }),
    onSuccess: (res) => {
      qc.setQueryData(["college-website"], res);
      setMessage("Website saved. Changes are live on your public college page.");
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        setMessage(e.message);
      } else setMessage("Could not save.");
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <form
        noValidate
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          const parsed = recordSchema(WEBSITE).safeParse(values);
          if (!parsed.success) {
            const next: Record<string, string> = {};
            for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
            setErrors(next);
            setMessage(`Please fix ${Object.keys(next).length} highlighted field(s).`);
            return;
          }
          setErrors({});
          save.mutate(parsed.data as Record<string, RecordValue>);
        }}
      >
        {message ? (
          <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink" role="status">
            <Fi name={save.isSuccess ? "check-circle" : "info"} className={save.isSuccess ? "text-teal" : "text-sky"} /> {message}
          </p>
        ) : null}
        {WEBSITE.sections.map((section, i) => (
          <Card key={section} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-5 py-4">
              <IconChip tone={(["gold", "brand", "teal"] as const)[i % 3]} className="size-9 text-base">
                <Fi name={["picture", "book-open-cover", "marker"][i] ?? "apps"} />
              </IconChip>
              <h2 className="text-[15px] font-semibold text-ink">{section}</h2>
            </div>
            <CardBody className="grid gap-5 sm:grid-cols-2">
              {WEBSITE.fields
                .filter((f) => f.section === section)
                .map((f) => (
                  <FieldInput
                    key={f.name}
                    field={f}
                    value={values[f.name] ?? null}
                    error={errors[f.name]}
                    disabled={save.isPending}
                    onChange={(v) => {
                      setMessage(null);
                      setValues((p) => ({ ...p, [f.name]: v }));
                    }}
                  />
                ))}
            </CardBody>
          </Card>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
            {save.isPending ? <Spinner /> : <Fi name="disk" />} Save website
          </Button>
          <LinkButton href={`/colleges/${collegeId}`} target="_blank" rel="noopener noreferrer" size="lg" variant="secondary">
            <Fi name="arrow-up-right-from-square" /> View public page
          </LinkButton>
        </div>
      </form>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">Your public pages</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={`/colleges/${collegeId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand hover:underline">
                <Fi name="globe" /> College home page
              </Link>
            </li>
            <li>
              <Link href={`/colleges/${collegeId}/login`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand hover:underline">
                <Fi name="sign-in-alt" /> Student &amp; staff login
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-3">Share the login link with your students and staff — it signs them straight in to your college.</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">What appears on the page</p>
          <ul className="mt-3 space-y-1.5 text-xs text-ink-2">
            <li>• Hero image, tagline and announcement</li>
            <li>• About, principal&apos;s message and highlights</li>
            <li>• Programmes and departments of your stream</li>
            <li>
              • Published <Link href="events" className="text-brand hover:underline">events</Link> and <Link href="gallery" className="text-brand hover:underline">gallery photos</Link>
            </li>
            <li>• Contact details and an Apply button (when admissions are open)</li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}
