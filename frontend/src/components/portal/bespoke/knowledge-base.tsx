"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  FileUp,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  KB_CHUNK_SIZES,
  KB_DOC_TYPES,
  KB_MAX_FILE_BYTES,
  KB_OWNER_SUGGESTIONS,
  KB_SCOPES,
  KbAnswerSchema,
  KbCreatedSchema,
  KbDetailSchema,
  KbDocSchema,
  KbOverviewSchema,
  type KbDoc,
} from "@/lib/api/knowledge-schemas";
import type { Role } from "@/lib/auth/roles";
import { Badge, Button, Card, EmptyState, Field, Skeleton, Spinner, inputClass, toneForStatus } from "@/components/ui/primitives";
import { LoadError } from "@/components/ui/load-error";
import { toCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

/*
 * Institutional Knowledge Base: documents the college uploads (regulations, circulars, handbooks …) are split into
 * passages, indexed, and used to answer questions with citations. Everything on this page comes from /api/v1/knowledge.
 */

type Tab = "repository" | "ask" | "index";
const OVERVIEW_KEY = ["kb-overview"];
const PAGE_SIZE = 10;
const OkSchema = z.object({ ok: z.literal(true) });

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");

function indexingBadge(d: KbDoc) {
  if (d.indexing === "semantic") return <Badge tone="teal">Semantic</Badge>;
  if (d.indexing === "partial") return <Badge tone="amber">Partly indexed</Badge>;
  return <Badge tone="neutral">Keyword only</Badge>;
}

export function KnowledgeBaseModule({ role }: { role: Role }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("repository");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const overview = useQuery({ queryKey: OVERVIEW_KEY, queryFn: () => apiFetch("/api/v1/knowledge/documents", KbOverviewSchema) });
  const refresh = () => void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
  const say = (text: string, tone: "ok" | "error" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 6000);
  };

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => apiFetch(`/api/v1/knowledge/documents/${id}`, KbDocSchema, { method: "PATCH", body }),
    onSuccess: (d, v) => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["kb-doc", v.id] });
      say(d.status === "Approved" ? `“${d.title}” is approved and now grounds AI answers.` : d.status === "Archived" ? `“${d.title}” was archived and no longer grounds answers.` : `“${d.title}” updated.`);
    },
    onError: (e) => say(errMsg(e), "error"),
    onSettled: () => setBusyId(null),
  });
  const remove = useMutation({
    mutationFn: (d: KbDoc) => apiFetch(`/api/v1/knowledge/documents/${d.id}`, OkSchema, { method: "DELETE" }).then(() => d),
    onSuccess: (d) => {
      refresh();
      setInspectId((cur) => (cur === d.id ? null : cur));
      say(`Deleted “${d.title}” and its ${d.chunks} indexed passages.`);
    },
    onError: (e) => say(errMsg(e), "error"),
    onSettled: () => setBusyId(null),
  });
  const reindex = useMutation({
    mutationFn: (d: KbDoc) => apiFetch(`/api/v1/knowledge/documents/${d.id}/reindex`, KbDocSchema, { method: "POST", timeoutMs: 120_000 }),
    onSuccess: (d) => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["kb-doc", d.id] });
      say(`Re-indexed “${d.title}”: ${d.embeddedChunks} of ${d.chunks} passages are searchable by meaning.`);
    },
    onError: (e) => say(errMsg(e), "error"),
    onSettled: () => setBusyId(null),
  });

  const docs = useMemo(() => overview.data?.documents ?? [], [overview.data]);
  const types = useMemo(() => [...new Set(docs.map((d) => d.type))].sort(), [docs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (type === "all" || d.type === type) &&
        (status === "all" || d.status === status) &&
        (!q || [d.title, d.owner, d.type, d.description, d.fileName].some((s) => s.toLowerCase().includes(q))),
    );
  }, [docs, search, type, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);

  const act = (id: string, fn: () => void) => {
    setBusyId(id);
    fn();
  };
  const confirmDelete = (d: KbDoc) => {
    if (window.confirm(`Delete “${d.title}”? Its ${d.chunks} indexed passages are removed and AI answers will stop using it. This cannot be undone.`)) act(d.id, () => remove.mutate(d));
  };

  const exportManifest = () => {
    const rows: unknown[][] = [
      ["ID", "Document", "Type", "Issuing office", "Scope", "Status", "Passages", "Searchable by meaning", "Index", "File", "Size", "Uploaded by", "Uploaded", "Approved by"],
      ...docs.map((d) => [d.id, d.title, d.type, d.owner, d.scope, d.status, d.chunks, d.embeddedChunks, d.indexing, d.fileName, fmtSize(d.sizeBytes), d.uploadedBy, fmtDate(d.createdAt), d.approvedBy ?? ""]),
    ];
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-base-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (overview.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (overview.isError || !overview.data) return <LoadError error={overview.error} onRetry={() => void overview.refetch()} />;
  const { stats, ai } = overview.data;

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          role="status"
          className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm", toast.tone === "ok" ? "border-teal/30 bg-teal-soft/80 text-teal" : "border-rose/30 bg-rose-soft text-rose")}
        >
          <span className="font-medium">{toast.text}</span>
          <button onClick={() => setToast(null)} className="rounded p-1 hover:bg-black/5" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documents" icon={<FileText className="size-4" />} tone="brand" value={stats.documents} note={`${stats.categories} categor${stats.categories === 1 ? "y" : "ies"} · ${stats.approved} approved`} />
        <Stat label="Indexed passages" icon={<Layers className="size-4" />} tone="sky" value={stats.chunks.toLocaleString("en-IN")} note={stats.chunks ? `${stats.embeddedChunks.toLocaleString("en-IN")} searchable by meaning` : "Upload a document to start"} />
        <Stat
          label="Grounding"
          icon={<ShieldCheck className="size-4" />}
          tone="teal"
          value={`${stats.approved}/${stats.documents || 0}`}
          note={stats.pending > 0 ? `${stats.pending} awaiting approval` : stats.documents ? "All documents reviewed" : "No documents yet"}
        />
        <Stat label="AI service" icon={<Bot className="size-4" />} tone="amber" value={ai.enabled ? "On" : "Off"} note={ai.enabled ? `${ai.model} · ${ai.embedModel}` : "Keyword search and quoted answers"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={tab === "repository"} onClick={() => setTab("repository")} icon={<Database className="size-4" />}>
            Documents <span className="rounded-full bg-black/10 px-2 text-xs">{docs.length}</span>
          </TabButton>
          <TabButton active={tab === "ask"} onClick={() => setTab("ask")} icon={<Sparkles className="size-4" />}>
            Ask the knowledge base
          </TabButton>
          <TabButton active={tab === "index"} onClick={() => setTab("index")} icon={<Layers className="size-4" />}>
            Index &amp; AI
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral" className="hidden capitalize sm:inline-flex">{role}</Badge>
          <Button variant="secondary" size="sm" onClick={exportManifest} disabled={docs.length === 0}>
            <Download className="size-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" /> Upload document
          </Button>
        </div>
      </div>

      {tab === "repository" ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title, office, type or file name" aria-label="Search documents" className={cn(inputClass, "pl-9")} />
            </div>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type" className={cn(inputClass, "sm:w-auto")}>
              <option value="all">All types</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className={cn(inputClass, "sm:w-auto")}>
              <option value="all">All statuses</option>
              <option>Approved</option>
              <option>Pending approval</option>
              <option>Archived</option>
            </select>
          </div>

          {docs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No documents yet"
                body="Upload your regulations, academic calendar, handbooks and circulars. Approved documents become the only source the AI may answer from."
                action={<Button onClick={() => setUploadOpen(true)}><FileUp className="size-4" /> Upload the first document</Button>}
              />
            </div>
          ) : shown.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No documents match" body="Change the search or filters." action={<Button variant="secondary" onClick={() => { setSearch(""); setType("all"); setStatus("all"); }}>Reset filters</Button>} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/30 text-xs uppercase tracking-wide text-ink-3">
                    <th scope="col" className="px-4 py-3 font-semibold">Document</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Office</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Added</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Passages</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((d) => {
                    const busy = busyId === d.id;
                    return (
                      <tr key={d.id} onClick={() => setInspectId(d.id)} className="group cursor-pointer hover:bg-surface-2/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 group-hover:bg-brand-soft group-hover:text-brand"><FileText className="size-4" /></span>
                            <div className="min-w-0">
                              <div className="font-medium text-ink group-hover:text-brand">{d.title}</div>
                              <div className="line-clamp-1 text-xs text-ink-3">{d.description || d.fileName || d.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge tone="brand">{d.type}</Badge></td>
                        <td className="px-4 py-3 text-ink-2">{d.owner}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2">{fmtDate(d.createdAt)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink">{d.chunks}</td>
                        <td className="px-4 py-3"><Badge tone={toneForStatus(d.status)}>{d.status}</Badge></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {d.status !== "Approved" ? (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(d.id, () => patch.mutate({ id: d.id, body: { status: "Approved" } }))}>
                                {busy ? <Spinner /> : <CheckCircle2 className="size-4" />} Approve
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(d.id, () => patch.mutate({ id: d.id, body: { status: "Archived" } }))}>Archive</Button>
                            )}
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirmDelete(d)} aria-label={`Delete ${d.title}`}><Trash2 className="size-4 text-rose" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-3">
              <span>{filtered.length} documents</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
                <span>Page {Math.min(page, pages)} of {pages}</span>
                <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "ask" ? <AskPanel suggestions={overview.data.suggestions} approved={stats.approved} hasDocs={stats.documents > 0} aiOn={ai.enabled} onOpenDoc={(id) => setInspectId(id)} /> : null}

      {tab === "index" ? (
        <IndexPanel
          docs={docs}
          ai={ai}
          busyId={busyId}
          onReindex={(d) => act(d.id, () => reindex.mutate(d))}
          onOpen={(id) => setInspectId(id)}
          reindexing={reindex.isPending}
        />
      ) : null}

      {uploadOpen ? (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onDone={(d, notes) => {
            setUploadOpen(false);
            refresh();
            say([`Added “${d.title}” with ${d.chunks} passages${d.status === "Approved" ? " and approved it" : "; approve it to use it for AI answers"}.`, ...notes].join(" "));
          }}
        />
      ) : null}

      {inspectId ? (
        <InspectDialog
          id={inspectId}
          busy={busyId === inspectId}
          onClose={() => setInspectId(null)}
          onApprove={(d) => act(d.id, () => patch.mutate({ id: d.id, body: { status: "Approved" } }))}
          onArchive={(d) => act(d.id, () => patch.mutate({ id: d.id, body: { status: d.status === "Archived" ? "Pending approval" : "Archived" } }))}
          onReindex={(d) => act(d.id, () => reindex.mutate(d))}
          onDelete={confirmDelete}
          onSave={(d, body) => patch.mutate({ id: d.id, body })}
          saving={patch.isPending}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────────── small pieces ─────────────────────────── */

function Stat({ label, value, note, icon, tone }: { label: string; value: ReactNode; note: string; icon: ReactNode; tone: "brand" | "sky" | "teal" | "amber" }) {
  const chip = { brand: "bg-brand-soft text-brand", sky: "bg-sky-soft text-sky", teal: "bg-teal-soft text-teal", amber: "bg-gold-soft text-amber" }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-3">{label}</span>
        <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", chip)}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink-3">{note}</div>
    </Card>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all", active ? "bg-brand text-white shadow-sm" : "bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink")}
    >
      {icon}
      {children}
    </button>
  );
}

function Dialog({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={cn("w-full rounded-2xl bg-surface shadow-xl", wide ? "max-w-4xl" : "max-w-xl")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-3 hover:bg-surface-2"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────────── upload ─────────────────────────── */

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function UploadDialog({ onClose, onDone }: { onClose: () => void; onDone: (d: KbDoc, notes: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: "", type: "Policy" as (typeof KB_DOC_TYPES)[number], owner: "Registrar", scope: "Institution-wide" as (typeof KB_SCOPES)[number], description: "", chunkTokens: 512, approve: true, text: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const upload = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { ...f, fileName: file?.name ?? "", mime: file?.type ?? "" };
      if (file) {
        body.dataBase64 = await readAsBase64(file);
        delete body.text;
      }
      return apiFetch("/api/v1/knowledge/documents", KbCreatedSchema, { method: "POST", body, timeoutMs: 240_000 });
    },
    onSuccess: (r) => onDone(r.document, r.notes),
    onError: (e) => {
      setError(errMsg(e));
      setFieldErrors(e instanceof ApiError ? e.fields : {});
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (f.title.trim().length < 3) return setFieldErrors({ title: "Enter a title of at least 3 characters" });
    if (!file && f.text.trim().length < 40) return setFieldErrors({ text: "Attach a file or paste at least a few sentences" });
    upload.mutate();
  };

  const pick = (list: FileList | null) => {
    const picked = list?.[0] ?? null;
    setError("");
    if (picked && picked.size > KB_MAX_FILE_BYTES) {
      setFile(null);
      return setFieldErrors({ file: `That file is larger than ${KB_MAX_FILE_BYTES / 1024 / 1024} MB. Split it into parts.` });
    }
    setFieldErrors({});
    setFile(picked);
    if (picked && !f.title) set("title", picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  };

  return (
    <Dialog title="Upload a document" subtitle="It is split into passages and indexed so AI answers can cite it." onClose={upload.isPending ? () => undefined : onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Title" htmlFor="kb-title" error={fieldErrors.title}>
          <input id="kb-title" className={inputClass} value={f.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Regulations 2021 — B.E./B.Tech" disabled={upload.isPending} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="kb-type">
            <select id="kb-type" className={inputClass} value={f.type} onChange={(e) => set("type", e.target.value as typeof f.type)} disabled={upload.isPending}>
              {KB_DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Issuing office" htmlFor="kb-owner" error={fieldErrors.owner}>
            <input id="kb-owner" list="kb-owners" className={inputClass} value={f.owner} maxLength={60} onChange={(e) => set("owner", e.target.value)} disabled={upload.isPending} />
            <datalist id="kb-owners">{KB_OWNER_SUGGESTIONS.map((o) => <option key={o} value={o} />)}</datalist>
          </Field>
          <Field label="Audience" htmlFor="kb-scope">
            <select id="kb-scope" className={inputClass} value={f.scope} onChange={(e) => set("scope", e.target.value as typeof f.scope)} disabled={upload.isPending}>
              {KB_SCOPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Passage size" htmlFor="kb-size" hint="Smaller passages answer precise questions; larger keep more context.">
            <select id="kb-size" className={inputClass} value={f.chunkTokens} onChange={(e) => set("chunkTokens", Number(e.target.value))} disabled={upload.isPending}>
              {KB_CHUNK_SIZES.map((n) => <option key={n} value={n}>{n} tokens</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description (optional)" htmlFor="kb-desc">
          <input id="kb-desc" className={inputClass} value={f.description} maxLength={400} onChange={(e) => set("description", e.target.value)} disabled={upload.isPending} />
        </Field>

        <Field label="File" htmlFor="kb-file" hint="PDF, .txt, .md or .csv, up to 5 MB. Scanned PDFs are read with AI." error={fieldErrors.file}>
          <div className="flex items-center gap-3">
            <input ref={fileRef} id="kb-file" type="file" accept=".pdf,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown,text/csv" className="hidden" onChange={(e) => pick(e.target.files)} disabled={upload.isPending} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={upload.isPending}><FileUp className="size-4" /> Choose file</Button>
            <span className="truncate text-sm text-ink-3">{file ? `${file.name} · ${fmtSize(file.size)}` : "No file chosen"}</span>
            {file ? <button type="button" className="text-xs text-ink-3 underline" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button> : null}
          </div>
        </Field>
        {!file ? (
          <Field label="…or paste the text" htmlFor="kb-text" error={fieldErrors.text}>
            <textarea id="kb-text" rows={6} className={inputClass} value={f.text} onChange={(e) => set("text", e.target.value)} placeholder="Paste the document text here. Headings such as “Clause 4.2 Attendance” keep passages organised." disabled={upload.isPending} />
          </Field>
        ) : null}

        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={f.approve} onChange={(e) => set("approve", e.target.checked)} className="mt-0.5" disabled={upload.isPending} />
          <span>Approve now. Approved documents are used to answer questions; leave unticked to review it first.</span>
        </label>

        {error ? <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p> : null}
        {upload.isPending ? <p className="flex items-center gap-2 text-sm text-ink-3"><Spinner /> Reading, splitting and indexing the document. Large PDFs can take a minute or two.</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={upload.isPending}>Cancel</Button>
          <Button type="submit" disabled={upload.isPending}>{upload.isPending ? <Spinner /> : <FileUp className="size-4" />} Upload &amp; index</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ───────────────────────────── inspect ─────────────────────────── */

function InspectDialog({
  id,
  busy,
  saving,
  onClose,
  onApprove,
  onArchive,
  onReindex,
  onDelete,
  onSave,
}: {
  id: string;
  busy: boolean;
  saving: boolean;
  onClose: () => void;
  onApprove: (d: KbDoc) => void;
  onArchive: (d: KbDoc) => void;
  onReindex: (d: KbDoc) => void;
  onDelete: (d: KbDoc) => void;
  onSave: (d: KbDoc, body: Record<string, unknown>) => void;
}) {
  const detail = useQuery({ queryKey: ["kb-doc", id], queryFn: () => apiFetch(`/api/v1/knowledge/documents/${id}`, KbDetailSchema) });
  const [filter, setFilter] = useState("");
  const [edit, setEdit] = useState<{ title: string; owner: string; description: string } | null>(null);
  const d = detail.data?.document;
  const chunks = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (detail.data?.chunks ?? []).filter((c) => !q || c.content.toLowerCase().includes(q) || c.section.toLowerCase().includes(q));
  }, [detail.data, filter]);

  return (
    <Dialog title={d?.title ?? "Document"} subtitle={d ? `${d.id} · ${d.type} · ${d.owner}` : undefined} onClose={onClose} wide>
      {detail.isLoading ? (
        <div className="space-y-3 p-5"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40" /></div>
      ) : detail.isError || !d ? (
        <div className="p-5"><LoadError error={detail.error} onRetry={() => void detail.refetch()} /></div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneForStatus(d.status)}>{d.status}</Badge>
            {indexingBadge(d)}
            <span className="text-xs text-ink-3">Added {fmtDate(d.createdAt)} by {d.uploadedBy}{d.approvedBy ? ` · approved by ${d.approvedBy}` : ""}</span>
          </div>

          {edit ? (
            <div className="space-y-3 rounded-xl border border-line p-4">
              <Field label="Title" htmlFor="kb-e-title"><input id="kb-e-title" className={inputClass} value={edit.title} maxLength={140} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Issuing office" htmlFor="kb-e-owner"><input id="kb-e-owner" className={inputClass} value={edit.owner} maxLength={60} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} /></Field>
              <Field label="Description" htmlFor="kb-e-desc"><input id="kb-e-desc" className={inputClass} value={edit.description} maxLength={400} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                <Button disabled={saving || edit.title.trim().length < 3 || edit.owner.trim().length < 2} onClick={() => { onSave(d, { title: edit.title, owner: edit.owner, description: edit.description }); setEdit(null); }}>Save</Button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Meta label="Audience" value={d.scope} />
              <Meta label="File" value={d.fileName ? `${d.fileName} · ${fmtSize(d.sizeBytes)}` : `Pasted text · ${fmtSize(d.sizeBytes)}`} />
              <Meta label="Passages" value={`${d.chunks} (${d.embeddedChunks} searchable by meaning)`} />
              <Meta label="Embedding model" value={d.embedModel ?? "None — keyword search"} />
              <Meta label="Last updated" value={fmtDate(d.updatedAt)} />
              <div className="sm:col-span-3"><Meta label="Description" value={d.description || "—"} /></div>
            </dl>
          )}

          <div className="flex flex-wrap gap-2">
            {d.status !== "Approved" ? <Button size="sm" disabled={busy} onClick={() => onApprove(d)}>{busy ? <Spinner /> : <CheckCircle2 className="size-4" />} Approve</Button> : null}
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onArchive(d)}>{d.status === "Archived" ? "Restore" : "Archive"}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReindex(d)}>{busy ? <Spinner /> : <RefreshCw className="size-4" />} Re-index</Button>
            <Button size="sm" variant="secondary" disabled={busy || edit !== null} onClick={() => setEdit({ title: d.title, owner: d.owner, description: d.description })}>Edit details</Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onDelete(d)}><Trash2 className="size-4" /> Delete</Button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Passages</h3>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter passages" aria-label="Filter passages" className={cn(inputClass, "max-w-xs")} />
            </div>
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {chunks.map((c) => (
                <li key={c.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                    <span className="font-medium text-ink-2">#{c.index} · {c.section}</span>
                    <span>{c.page ? `Page ${c.page} · ` : ""}{c.tokens} tokens · {c.embedded ? "semantic" : "keyword"}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-ink-2">{c.content}</p>
                </li>
              ))}
              {chunks.length === 0 ? <li className="py-6 text-center text-sm text-ink-3">No passages match.</li> : null}
            </ul>
            {detail.data?.truncated ? <p className="mt-2 text-xs text-ink-3">Showing the first {detail.data.chunks.length} of {d.chunks} passages.</p> : null}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

/* ───────────────────────────── ask ─────────────────────────── */

function AskPanel({ suggestions, approved, hasDocs, aiOn, onOpenDoc }: { suggestions: string[]; approved: number; hasDocs: boolean; aiOn: boolean; onOpenDoc: (id: string) => void }) {
  const [q, setQ] = useState("");
  const ask = useMutation({
    mutationFn: (question: string) => apiFetch("/api/v1/knowledge/ask", KbAnswerSchema, { method: "POST", body: { question }, timeoutMs: 90_000 }),
  });
  const run = (question: string) => {
    const t = question.trim();
    if (t.length >= 3 && !ask.isPending) {
      setQ(t);
      ask.mutate(t);
    }
  };
  const a = ask.data;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="p-5">
        <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex flex-col gap-3 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} aria-label="Question" placeholder="Ask something your documents should answer, e.g. minimum attendance for exams" className={inputClass} />
          <Button type="submit" disabled={ask.isPending || q.trim().length < 3}>{ask.isPending ? <Spinner /> : <Send className="size-4" />} Ask</Button>
        </form>

        {!hasDocs ? <p className="mt-4 text-sm text-ink-3">Upload and approve a document first. Answers only ever come from approved documents.</p> : approved === 0 ? <p className="mt-4 text-sm text-amber">No document is approved yet, so nothing can be used to answer.</p> : null}
        {suggestions.length > 0 && !a ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => <button key={s} onClick={() => run(s)} className="rounded-lg bg-surface-2 px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-brand-soft hover:text-brand">{s}</button>)}
          </div>
        ) : null}

        {ask.isPending ? <p className="mt-6 flex items-center gap-2 text-sm text-ink-3"><Spinner /> Searching approved documents…</p> : null}
        {ask.isError ? <p role="alert" className="mt-4 rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{errMsg(ask.error)}</p> : null}

        {a && !ask.isPending ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={a.grounded ? "teal" : "amber"}>{a.grounded ? "Grounded in your documents" : "Not found in approved documents"}</Badge>
              <Badge tone="neutral">{a.mode === "ai" ? "Written by AI from the passages" : a.mode === "extract" ? "Quoted from the passages" : "No answer"}</Badge>
              <span className="text-xs text-ink-3">Searched {a.searched.passages} passages in {a.searched.documents} documents</span>
            </div>
            <p className="whitespace-pre-line rounded-xl bg-surface-2/60 p-4 text-sm leading-relaxed text-ink">{a.answer}</p>
            {a.citations.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">{a.grounded ? "Sources" : "Closest passages"}</h3>
                <ul className="space-y-2">
                  {a.citations.map((c) => (
                    <li key={c.n} className={cn("rounded-xl border p-3", c.cited ? "border-brand/40 bg-brand-soft/30" : "border-line")}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button onClick={() => onOpenDoc(c.docId)} className="font-medium text-brand hover:underline">[{c.n}] {c.docTitle} · {c.section}{c.page ? ` · p.${c.page}` : ""}</button>
                        <span className="text-ink-3">{c.basis === "semantic" ? "Similarity" : "Words matched"} {Math.round(c.similarity * 100)}%{c.cited ? " · cited" : ""}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-2">{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="h-fit p-5 text-sm text-ink-2">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink"><Sparkles className="size-4 text-amber" /> How answers work</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Only <b>approved</b> documents are searched.</li>
          <li>{aiOn ? "Your question is matched to passages by meaning and by keywords." : "Your question is matched to passages by keywords (AI search is off)."}</li>
          <li>{aiOn ? "The AI writes a short answer using only those passages and cites them." : "The best matching sentences are quoted with their sources."}</li>
          <li>If the documents do not cover it, you are told so rather than given a guess.</li>
        </ol>
      </Card>
    </div>
  );
}

/* ───────────────────────────── index & AI ─────────────────────────── */

function IndexPanel({ docs, ai, busyId, reindexing, onReindex, onOpen }: { docs: KbDoc[]; ai: { enabled: boolean; model: string | null; embedModel: string | null; dims: number | null }; busyId: string | null; reindexing: boolean; onReindex: (d: KbDoc) => void; onOpen: (id: string) => void }) {
  const live = docs.filter((d) => d.status !== "Archived");
  const needs = live.filter((d) => d.indexing !== "semantic" && d.chunks > 0);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">AI service</h3>
            <p className="mt-1 text-sm text-ink-3">
              {ai.enabled
                ? `Gemini is connected. Passages are embedded with ${ai.embedModel} (${ai.dims}-dimension vectors) and answers are written by ${ai.model}.`
                : "No Gemini key is configured. Documents are searched by keywords and answers quote the documents. Set GEMINI_API_KEY on the server to turn on semantic search and written answers, then re-index."}
            </p>
          </div>
          <Badge tone={ai.enabled ? "teal" : "neutral"}>{ai.enabled ? "Connected" : "Not configured"}</Badge>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <Meta label="Retrieval" value="Hybrid: 70% meaning + 30% keywords" />
          <Meta label="Passages used per answer" value="Top 6" />
          <Meta label="Documents that need re-indexing" value={String(needs.length)} />
        </dl>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Index health by document</div>
        {docs.length === 0 ? (
          <div className="p-8"><EmptyState title="Nothing indexed yet" body="Upload a document to see how it is indexed." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/30 text-xs uppercase tracking-wide text-ink-3">
                  <th scope="col" className="px-4 py-3 font-semibold">Document</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Index</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Passages</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Semantic</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Model</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3"><button onClick={() => onOpen(d.id)} className="text-left font-medium text-ink hover:text-brand">{d.title}</button><div className="text-xs text-ink-3">{d.id} · {d.status}</div></td>
                    <td className="px-4 py-3">{indexingBadge(d)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.chunks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.embeddedChunks}</td>
                    <td className="px-4 py-3 text-ink-2">{d.embedModel ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" disabled={!ai.enabled || reindexing || d.chunks === 0} onClick={() => onReindex(d)} title={ai.enabled ? undefined : "Needs the AI service"}>
                        {busyId === d.id ? <Spinner /> : <RefreshCw className="size-4" />} Re-index
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
