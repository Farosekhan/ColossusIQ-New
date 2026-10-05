"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import type { Role } from "@/lib/auth/roles";
import { Fi } from "@/components/ui/icon";
import { Badge, Button, Card, EmptyState, inputClass } from "@/components/ui/primitives";
import { TemplateSkeleton } from "@/components/modules/shared";
import { LoadError } from "@/components/ui/load-error";

const AssignmentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  due: z.string(),
  submitted: z.number(),
  status: z.enum(["Open", "Closed", "Draft"]),
  createdAt: z.string(),
});

type AssignmentItem = z.infer<typeof AssignmentItemSchema>;

export function AssignmentsModule({ role }: { role: Role }) {
  const qc = useQueryClient();
  const isFaculty = role === "faculty" || role === "admin" || role === "hod";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssignmentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCourse, setFormCourse] = useState("OS");
  const [formDue, setFormDue] = useState("");
  const [formStatus, setFormStatus] = useState<"Open" | "Closed" | "Draft">("Open");
  const [formSubmitted, setFormSubmitted] = useState(0);

  const { data: assignments, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["assignments-list"],
    queryFn: () => apiFetch("/api/v1/assignments", z.array(AssignmentItemSchema)),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; course: string; due: string; status: string; submitted: number }) =>
      apiFetch("/api/v1/assignments", AssignmentItemSchema, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      void qc.invalidateQueries({ queryKey: ["assignments-list"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssignmentItem> }) =>
      apiFetch(`/api/v1/assignments/${id}`, AssignmentItemSchema, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      setEditingItem(null);
      resetForm();
      void qc.invalidateQueries({ queryKey: ["assignments-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/assignments/${id}`, z.object({ ok: z.boolean() }), {
        method: "DELETE",
      }),
    onSuccess: () => {
      setDeletingId(null);
      void qc.invalidateQueries({ queryKey: ["assignments-list"] });
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormCourse("OS");
    setFormDue("");
    setFormStatus("Open");
    setFormSubmitted(0);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: AssignmentItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCourse(item.course);
    setFormDue(item.due);
    setFormStatus(item.status);
    setFormSubmitted(item.submitted);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDue) return;
    createMutation.mutate({
      title: formTitle,
      course: formCourse,
      due: formDue,
      status: formStatus,
      submitted: Number(formSubmitted) || 0,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formTitle || !formDue) return;
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        title: formTitle,
        course: formCourse,
        due: formDue,
        status: formStatus,
        submitted: Number(formSubmitted) || 0,
      },
    });
  };

  if (isLoading) return <TemplateSkeleton />;
  if (isError) return <LoadError error={error} onRetry={() => void refetch()} />;

  const list = assignments || [];

  const filtered = list.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.course.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Progress Bar color chooser matching screenshots
  const getProgressBarColor = (pct: number, status: string) => {
    if (status === "Draft") return "bg-[#1E293B]"; // Dark navy for drafts
    if (pct >= 80) return "bg-[#0D9488]"; // Teal
    if (pct >= 50) return "bg-[#1E293B]"; // Deep navy/blue
    return "bg-[#B45309]"; // Warm amber/brown for lower percentages
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Open</span>;
      case "Closed":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Closed</span>;
      case "Draft":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">Draft</span>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Fi name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 size-4" />
            <input
              type="text"
              placeholder="Search assignments.."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-9 bg-white`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink font-medium focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            {isFaculty && <option value="Draft">Draft</option>}
          </select>
        </div>

        {isFaculty && (
          <Button onClick={handleOpenCreate} className="bg-[#1D2B6B] hover:bg-[#152052] text-white font-medium px-4 py-2 rounded-xl">
            <Fi name="plus" className="mr-1.5 size-4" /> New assignment
          </Button>
        )}
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden bg-white border border-line shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface/50 text-[11px] font-bold tracking-wider text-ink-3 uppercase">
                <th className="py-3.5 px-6">Assignment</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Due</th>
                <th className="py-3.5 px-4 w-48">Submitted</th>
                <th className="py-3.5 px-4">Status</th>
                {isFaculty && <th className="py-3.5 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isFaculty ? 6 : 5} className="py-12 text-center">
                    <EmptyState
                      title="No assignments found"
                      body={isFaculty ? "Create your first assignment to share with students." : "No active assignments published."}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-ink">{item.title}</td>
                    <td className="py-4 px-4 text-ink-2 font-medium">{item.course}</td>
                    <td className="py-4 px-4 text-ink-2 whitespace-nowrap">{item.due}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-surface-3/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(item.submitted, item.status)}`}
                            style={{ width: `${Math.min(100, Math.max(0, item.submitted))}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-ink-3 min-w-[32px] text-right">{item.submitted}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(item.status)}</td>
                    {isFaculty && (
                      <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-ink-2 hover:text-brand hover:bg-surface-2 transition-colors"
                          title="Edit assignment"
                        >
                          <Fi name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete assignment"
                        >
                          <Fi name="trash" className="size-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-line text-xs text-ink-3">
          Showing {filtered.length} of {list.length} assignments
        </div>
      </Card>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-line max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">New Assignment</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="text-ink-3 hover:text-ink">
                <Fi name="x" className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Process Scheduling Simulation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Course</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OS, ML, DBMS"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Due Date</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nov 02"
                    value={formDue}
                    onChange={(e) => setFormDue(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Open" | "Closed" | "Draft")}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Submitted %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formSubmitted}
                    onChange={(e) => setFormSubmitted(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-[#1D2B6B] hover:bg-[#152052] text-white">
                  {createMutation.isPending ? "Creating..." : "Create Assignment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-line max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Edit Assignment</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-ink-3 hover:text-ink">
                <Fi name="x" className="size-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Course</label>
                  <input
                    type="text"
                    required
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Due Date</label>
                  <input
                    type="text"
                    required
                    value={formDue}
                    onChange={(e) => setFormDue(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Open" | "Closed" | "Draft")}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">Submitted %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formSubmitted}
                    onChange={(e) => setFormSubmitted(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-[#1D2B6B] hover:bg-[#152052] text-white">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-line max-w-sm w-full p-6 space-y-4 text-center animate-in fade-in zoom-in-95">
            <div className="mx-auto size-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Fi name="trash" className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">Delete Assignment?</h3>
            <p className="text-xs text-ink-3">
              This action cannot be undone. Once deleted by staff, it will also be permanently deleted from the student side.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingId)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
