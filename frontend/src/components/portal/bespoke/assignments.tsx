"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { AssignmentList } from "@/lib/api/assignments-schemas";
import type { Role } from "@/lib/auth/roles";
import { TemplateSkeleton } from "@/components/modules/shared";
import { LoadError } from "@/components/ui/load-error";
import { FacultyAssignments } from "./assignments-faculty";
import { LIST_KEY } from "./assignments-shared";
import { StudentAssignments } from "./assignments-student";

/*
 * Assignments. Faculty publish an assignment and mark what comes back; students see what was published for them,
 * hand in their work and read their marks and feedback. Same page, two views, one API (/api/v1/assignments).
 */
export function AssignmentsModule({ role }: { role: Role }) {
  const q = useQuery({ queryKey: LIST_KEY, queryFn: () => apiFetch("/api/v1/assignments", AssignmentList), refetchInterval: 60_000 });
  if (q.isPending) return <TemplateSkeleton />;
  if (q.isError) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  return role === "student" ? <StudentAssignments items={q.data} /> : <FacultyAssignments items={q.data} />;
}
