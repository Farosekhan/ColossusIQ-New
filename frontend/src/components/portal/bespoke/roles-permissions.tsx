import { ROLE_META, ROLE_PERMISSIONS, ROLES, type Permission } from "@/lib/auth/roles";
import { Fi } from "@/components/ui/icon";
import { Card, CardBody, CardHeader, IconChip, LinkButton } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/notices";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ title: string; icon: string; perms: Array<[Permission, string]> }> = [
  {
    title: "Learning & assessment",
    icon: "graduation-cap",
    perms: [
      ["ai:chat", "Use AI mentor / copilots"],
      ["assessment:attempt", "Attempt tests"],
      ["assessment:create", "Create assessments"],
      ["assessment:override-score", "Approve / override AI marks"],
      ["student:read-own", "View own student record"],
      ["student:read-any", "View student records"],
    ],
  },
  {
    title: "Administration",
    icon: "building",
    perms: [
      ["admissions:manage", "Manage admissions"],
      ["staff:manage", "Manage staff"],
      ["users:manage", "Manage users & roles"],
      ["courses:manage", "Manage courses"],
      ["events:manage", "Manage events"],
      ["department:manage", "Manage departments"],
    ],
  },
  {
    title: "Outcomes",
    icon: "briefcase",
    perms: [
      ["placement:manage", "Manage placements"],
      ["incubation:manage", "Manage incubation"],
      ["talent:search", "Search verified talent"],
      ["institution:analytics", "Institution analytics"],
    ],
  },
  {
    title: "Platform & governance",
    icon: "shield-check",
    perms: [
      ["tenant:manage", "Manage tenants"],
      ["ai:governance", "AI governance"],
      ["audit:read", "Read audit log"],
      ["billing:manage", "Manage billing"],
    ],
  },
];

const SHORT: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  hod: "HOD",
  placement: "Placement",
  incubation: "Incubation",
  institution: "Principal",
  recruiter: "Recruiter",
  admin: "Admin",
};

export function RolesPermissionsModule() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r, i) => (
          <Card key={r} className="card-hover p-5">
            <div className="flex items-center gap-3">
              <IconChip tone={(["brand", "gold", "teal", "sky", "amber", "rose", "neutral", "brand"] as const)[i]}>
                <Fi name={["user-graduate", "chalkboard-user", "users-alt", "briefcase", "rocket-lunch", "school", "handshake", "shield-check"][i] ?? "user"} />
              </IconChip>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{ROLE_META[r].label}</p>
                <p className="text-xs text-ink-3">{ROLE_PERMISSIONS[r].length} permissions</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-2">{ROLE_META[r].description}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Permission matrix" subtitle="Enforced by the API on every request; the interface hides what you can't use." action={<LinkButton href="users" size="sm" variant="secondary"><Fi name="user-lock" /> Manage users</LinkButton>} />
        <CardBody className="p-0 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-[11px] uppercase tracking-wider text-ink-3">
                  <th scope="col" className="px-5 py-3 text-left font-semibold">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} scope="col" className="px-2 py-3 text-center font-semibold">
                      {SHORT[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((g) => (
                <tbody key={g.title}>
                  <tr>
                    <th colSpan={ROLES.length + 1} scope="colgroup" className="bg-brand-soft/50 px-5 py-2 text-left text-xs font-semibold text-brand">
                      <span className="inline-flex items-center gap-2">
                        <Fi name={g.icon} /> {g.title}
                      </span>
                    </th>
                  </tr>
                  {g.perms.map(([perm, label]) => (
                    <tr key={perm} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                      <th scope="row" className="px-5 py-2.5 text-left font-normal">
                        <span className="text-ink">{label}</span>
                        <span className="ml-2 font-mono text-[11px] text-ink-3">{perm}</span>
                      </th>
                      {ROLES.map((r) => {
                        const has = ROLE_PERMISSIONS[r].includes(perm);
                        return (
                          <td key={r} className="px-2 py-2.5 text-center">
                            <span
                              className={cn("inline-flex size-7 items-center justify-center rounded-lg text-xs", has ? "bg-teal-soft text-teal" : "text-line")}
                              aria-label={has ? `${ROLE_META[r].label}: allowed` : `${ROLE_META[r].label}: not allowed`}
                            >
                              <Fi name={has ? "check" : "minus-small"} />
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </CardBody>
      </Card>

      <Notice tone="teal">
        Role changes take effect on the user&apos;s next request and are written to the audit log. Only Platform Admins can grant the Platform Admin role — the API rejects any other attempt.
      </Notice>
    </div>
  );
}
