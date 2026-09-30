import type { Metadata } from "next";
import { Eye, FileLock2, Fingerprint, KeyRound, Scale, ScrollText, ServerCog, ShieldCheck, UserCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Security & AI governance" };

const CONTROLS = [
  { icon: ServerCog, title: "Multi-tenant isolation", body: "Every record carries tenant, university, college and department scope. Authorisation is enforced at the API and database layers — never only in the browser." },
  { icon: Fingerprint, title: "Identity & access", body: "MFA, enterprise SSO (SAML/OIDC), role-based and attribute-based access control, idle-session timeout and cross-tab sign-out." },
  { icon: KeyRound, title: "Session security", body: "HttpOnly, Secure, SameSite=Strict session cookies; CSRF tokens on every change; strict Content-Security-Policy with per-request nonces." },
  { icon: FileLock2, title: "Encryption & data", body: "Encryption in transit and at rest, secrets management, retention controls, backups and disaster recovery." },
  { icon: ShieldCheck, title: "AI-specific protection", body: "Prompt-injection filtering, document access filtering, sensitive-data masking before model calls, and tool authorisation per agent." },
  { icon: Eye, title: "AI observability", body: "Every AI request logs tenant, agent, model, prompt version, sources, tokens, latency, cost and confidence." },
  { icon: UserCheck, title: "Human in the loop", body: "AI marks are provisional until faculty approve or override. Early-warning signals are support recommendations, never labels." },
  { icon: ScrollText, title: "Audit trail", body: "Score overrides, role changes, policy updates and exports are recorded with actor, time and target." },
  { icon: Scale, title: "Governance & fairness", body: "Model, prompt and agent registries; evaluation for groundedness and safety; bias testing across languages; explainable insights." },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Trust"
        title="Security and responsible AI by design"
        description="Student data is handled according to applicable Indian privacy and education-data requirements, including the Digital Personal Data Protection Act. High-impact decisions always remain with people."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CONTROLS.map((c) => (
          <Card key={c.title} className="p-6">
            <c.icon className="size-6 text-teal" aria-hidden />
            <h2 className="mt-3 font-sans text-base font-semibold text-ink">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
