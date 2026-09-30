import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CrudDetail } from "@/components/crud/crud-detail";
import { resolveCrud, SAFE_RECORD_ID } from "@/lib/auth/resource-access";

export const metadata: Metadata = { title: "Record details" };

export default async function RecordPage({ params }: { params: Promise<{ role: string; module: string; id: string }> }) {
  const { role, module, id } = await params;
  const { mod, resource, role: r } = await resolveCrud(role, module);
  if (!SAFE_RECORD_ID.test(id)) notFound();
  return <CrudDetail mod={mod} role={r} resource={resource} recordId={id} />;
}
