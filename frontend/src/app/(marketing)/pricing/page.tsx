import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plans" };

const PLANS = [
  {
    name: "Campus Starter",
    who: "Smaller colleges starting their AI journey",
    features: ["Student portal", "Courses & AI tutor", "Mock tests & assessments", "Basic dashboard & analytics", "Email support"],
  },
  {
    name: "Campus Pro",
    who: "Colleges focused on outcomes and placements",
    featured: true,
    features: ["Everything in Starter", "AI agent mesh & AI Mentor", "Career engine, resume & mock interview", "Project hub & faculty copilot", "Advanced analytics"],
  },
  {
    name: "University Enterprise",
    who: "Universities and multi-campus groups",
    features: ["Everything in Pro", "Multi-campus hierarchy", "Institutional RAG knowledge base", "Enterprise SSO, audit & custom AI workflows", "API ecosystem & dedicated AI configuration", "SLA & dedicated support"],
  },
];

const ADDONS = ["AI interview credits", "AI evaluation credits", "OCR processing", "Premium certification content", "Industry skill assessments", "Placement integrations", "Custom AI agents", "Custom integrations"];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Plans"
        title="Priced per institution, with transparent AI metering"
        description="Base subscription per institution, campus, active student and faculty. Optional metering for AI tokens, interview sessions, answer evaluations, OCR pages and voice minutes."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.name} className={cn("flex flex-col p-7", p.featured && "border-brand ring-2 ring-brand/20")}>
            {p.featured ? (
              <Badge tone="gold" className="mb-3 self-start">
                Most chosen
              </Badge>
            ) : null}
            <h2 className="text-2xl font-semibold text-ink">{p.name}</h2>
            <p className="mt-1 text-sm text-ink-2">{p.who}</p>
            <p className="mt-6 font-serif text-3xl font-semibold text-ink">Custom</p>
            <p className="text-xs text-ink-3">Quoted per active seat · annual</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-ink-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <LinkButton href="/contact" variant={p.featured ? "primary" : "secondary"} className="mt-8">
              Talk to us
            </LinkButton>
          </Card>
        ))}
      </div>
      <Card className="mt-10 p-7">
        <h2 className="text-xl font-semibold text-ink">Add-on services</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {ADDONS.map((a) => (
            <Badge key={a} tone="neutral">
              {a}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
