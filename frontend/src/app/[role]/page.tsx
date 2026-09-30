import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isRole, ROLE_META } from "@/lib/auth/roles";
import { StudentHome } from "@/components/portal/student-home";
import { RoleHomeView } from "@/components/portal/role-home";
import { UniversityHome } from "@/components/portal/university-home";
import { InstitutionHome } from "@/components/portal/institution-home";

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  return { title: isRole(role) ? `${ROLE_META[role].label} home` : "Portal" };
}

export default async function RoleHomePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  if (role === "student") return <StudentHome />;
  if (role === "admin") return <UniversityHome />;
  if (role === "institution") return <InstitutionHome />;
  return <RoleHomeView role={role} />;
}
