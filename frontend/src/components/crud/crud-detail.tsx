"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import type { RecordValue, ResourceDef, ResourceRecord } from "@/config/resources";
import type { ModuleDef } from "@/config/modules";
import type { Role } from "@/lib/auth/roles";
import { apiFetch, ApiError } from "@/lib/api/client";
import { RecordEnvelope, ResourceRecordSchema } from "@/lib/api/schemas";
import { ModuleHeader } from "@/components/modules/module-header";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Fi } from "@/components/ui/icon";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, IconChip, LinkButton, Spinner, toneForStatus } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "./confirm-delete";
import { formatDate, ValueView } from "./fields";
import { fieldLabel } from "@/config/resources";
import { streamOfType } from "@/config/streams";
import { clearFlash, setFlash, useFlash } from "./flash";
import { DepartmentDetail } from "./department-detail";

export function CrudDetail({ mod, role, resource, recordId }: { mod: ModuleDef; role: Role; resource: ResourceDef; recordId: string }) {
  if (resource.key === "departments") {
    return <DepartmentDetail mod={mod} role={role} resource={resource} recordId={recordId} />;
  }

  const router = useRouter();
  const qc = useQueryClient();
  const base = `/${role}/${mod.slug}`;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const flash = useFlash();

  const { data, isLoading, error } = useQuery({
    queryKey: ["record", resource.key, recordId],
    queryFn: () => apiFetch(`/api/v1/records/${resource.key}/${encodeURIComponent(recordId)}`, RecordEnvelope),
  });

  const del = useMutation({
    mutationFn: () => apiFetch(`/api/v1/records/${resource.key}/${encodeURIComponent(recordId)}`, z.object({ ok: z.literal(true) }), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["records", resource.key] });
      setFlash(`${resource.singular} ${recordId} was deleted.`);
      router.push(base);
    },
  });

  const advance = useMutation({
    mutationFn: (next: { record: ResourceRecord; status: string }) => {
      const dataOnly = Object.fromEntries(resource.fields.map((f) => [f.name, next.record[f.name] ?? null])) as Record<string, RecordValue>;
      dataOnly[resource.statusField!] = next.status;
      return apiFetch(`/api/v1/records/${resource.key}/${encodeURIComponent(recordId)}`, ResourceRecordSchema, {
        method: "PUT",
        body: { data: dataOnly, version: next.record.version },
      });
    },
    onSuccess: (rec) => {
      qc.setQueryData(["record", resource.key, recordId], { record: rec, canManage: true });
      void qc.invalidateQueries({ queryKey: ["records", resource.key] });
      setFlash(`Status changed to “${String(rec[resource.statusField!])}”.`);
    },
  });

  if (isLoading) return <TemplateSkeleton />;
  if (error || !data)
    return (
      <div>
        <ModuleHeader mod={mod} role={role} crumbs={[{ label: recordId }]} />
        <EmptyState title="Record not found" body={error instanceof ApiError ? error.message : "It may have been deleted."} action={<LinkButton href={base}>Back to {resource.title}</LinkButton>} />
      </div>
    );

  const { record, canManage } = data;
  const title = String(record[resource.titleField] ?? record.id);
  const status = resource.statusField ? String(record[resource.statusField] ?? "") : "";
  const flow = resource.statusFlow ?? [];
  const flowIndex = flow.indexOf(status);
  const nextStatus = flowIndex >= 0 && flowIndex < flow.length - 1 ? flow[flowIndex + 1] : undefined;
  const initials = title
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, "")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <ModuleHeader
        mod={mod}
        role={role}
        crumbs={[{ label: record.id }]}
        title={title}
        description={resource.subtitleFields.map((f) => record[f]).filter(Boolean).join(" · ")}
        actions={
          canManage ? (
            <>
              <LinkButton href={`${base}/${encodeURIComponent(record.id)}/edit`} variant="gold">
                <Fi name="pencil" /> Edit
              </LinkButton>
              <Button
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-rose hover:text-white"
                onClick={() => {
                  del.reset();
                  setConfirmOpen(true);
                }}
              >
                <Fi name="trash" /> Delete
              </Button>
            </>
          ) : undefined
        }
      />

      {flash ? (
        <div className="animate-fade-up mb-4 flex items-center justify-between gap-3 rounded-2xl border border-teal/30 bg-teal-soft px-4 py-3 text-sm text-ink" role="status">
          <span className="flex items-center gap-2">
            <Fi name="check-circle" className="text-teal" /> {flash}
          </span>
          <button onClick={clearFlash} aria-label="Dismiss" className="rounded-lg p-1 hover:bg-surface">
            <Fi name="cross-small" />
          </button>
        </div>
      ) : null}

      {/* Lifecycle timeline (e.g. admissions pipeline) */}
      {flow.length > 0 ? (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Admission progress</p>
              <p className="text-xs text-ink-3">{flowIndex >= 0 ? `Stage ${flowIndex + 1} of ${flow.length}` : `This application is ${status.toLowerCase()}`}</p>
            </div>
            {canManage && nextStatus ? (
              <Button size="sm" disabled={advance.isPending} onClick={() => advance.mutate({ record, status: nextStatus })}>
                {advance.isPending ? <Spinner /> : <Fi name="arrow-right" />} Move to “{nextStatus}”
              </Button>
            ) : null}
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {flow.map((s, i) => {
              const state = flowIndex < 0 ? "todo" : i < flowIndex ? "done" : i === flowIndex ? "active" : "todo";
              return (
                <li key={s} className={cn("rounded-xl border px-3 py-2.5 text-xs", state === "done" && "border-teal/30 bg-teal-soft text-teal", state === "active" && "bg-brand-gradient border-transparent font-semibold text-white shadow-md", state === "todo" && "border-line text-ink-3")}>
                  <span className="flex items-center gap-1.5">
                    {state === "done" ? <Fi name="check" className="text-[10px]" /> : <span className="font-mono">{i + 1}</span>}
                    {s}
                  </span>
                  <span className="sr-only"> ({state})</span>
                </li>
              );
            })}
          </ol>
          {advance.error ? <p className="mt-3 text-sm text-rose">{advance.error instanceof ApiError ? advance.error.message : "Could not update status."}</p> : null}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {resource.sections.map((section) => {
            const fields = resource.fields.filter((f) => f.section === section);
            if (!fields.length) return null;
            return (
              <Card key={section}>
                <CardHeader title={section} />
                <CardBody>
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {fields.map((f) => (
                      <div key={f.name} className={cn(f.wide && "sm:col-span-2")}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-ink-3">{fieldLabel(f, record.collegeType ? streamOfType(record.collegeType) : null)}</dt>
                        <dd className="mt-1 text-sm text-ink">
                          <ValueView field={f} value={record[f.name]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <Card className="p-5 text-center">
            <span className="bg-brand-gradient mx-auto flex size-16 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-lg shadow-brand/25">{initials || <Fi name="user" />}</span>
            <p className="mt-3 font-semibold text-ink">{title}</p>
            <p className="font-mono text-xs text-ink-3">{record.id}</p>
            {status ? (
              <Badge tone={toneForStatus(status)} className="mt-3">
                {status}
              </Badge>
            ) : null}
            {record.collegeName ? (
              <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-violet-soft px-2.5 py-1 text-xs font-medium text-violet">
                <Fi name="school" className="shrink-0" />
                <span className="truncate">{String(record.collegeName)}</span>
              </p>
            ) : null}
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-sm font-semibold text-ink">Record history</p>
            <ul className="space-y-3 text-sm">
              <Meta icon="calendar" label="Created" value={formatDate(record.createdAt)} />
              <Meta icon="time-past" label="Last updated" value={formatDate(record.updatedAt)} />
              <Meta icon="layers" label="Version" value={String(record.version)} />
            </ul>
            {!canManage ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-2">
                <Fi name="lock" /> View only · contact details are masked
              </p>
            ) : null}
          </Card>
          <LinkButton href={base} variant="secondary" className="w-full">
            <Fi name="arrow-left" /> Back to {resource.title}
          </LinkButton>
        </aside>
      </div>

      <ConfirmDelete
        open={confirmOpen}
        recordId={record.id}
        recordName={title}
        singular={resource.singular}
        warning={resource.deleteWarning}
        strong={resource.strongDeleteConfirm}
        busy={del.isPending}
        error={del.error instanceof ApiError ? del.error.message : del.error ? "Delete failed." : null}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <IconChip tone="neutral" className="size-8 text-sm">
        <Fi name={icon} />
      </IconChip>
      <span className="flex-1 text-ink-3">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </li>
  );
}
