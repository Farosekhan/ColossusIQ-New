"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ModuleData } from "@/lib/api/schemas";
import type { ModuleDef } from "@/config/modules";
import type { Role } from "@/lib/auth/roles";
import { Button, EmptyState } from "@/components/ui/primitives";
import { usePrefs } from "@/components/providers";
import { ModuleHeader } from "./module-header";
import { TemplateSkeleton } from "./shared";
import {
  CalendarTemplate,
  ChatTemplate,
  DashboardTemplate,
  GalleryTemplate,
  GeneratorTemplate,
  ListTemplate,
  ScorecardTemplate,
  SettingsTemplate,
  WorkflowTemplate,
} from "./templates";

export function ModuleView({ mod, role }: { mod: ModuleDef; role: Role }) {
  const { t } = usePrefs();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["module", mod.slug],
    queryFn: () => apiFetch(`/api/v1/modules/${encodeURIComponent(mod.slug)}`, ModuleData),
  });

  return (
    <div>
      <ModuleHeader mod={mod} role={role} />
      {isLoading ? (
        <TemplateSkeleton />
      ) : error ? (
        <EmptyState
          title={error instanceof ApiError && error.status === 403 ? "You don't have access to this module" : t("common.error")}
          body={error instanceof ApiError ? error.message : undefined}
          action={<Button onClick={() => void refetch()}>{t("common.retry")}</Button>}
        />
      ) : data ? (
        <Template data={data} mod={mod} />
      ) : null}
    </div>
  );
}

function Template({ data, mod }: { data: ModuleData; mod: ModuleDef }) {
  switch (data.template) {
    case "dashboard":
      return <DashboardTemplate data={data} />;
    case "list":
      return <ListTemplate data={data} mod={mod} />;
    case "workflow":
      return <WorkflowTemplate data={data} />;
    case "scorecard":
      return <ScorecardTemplate data={data} />;
    case "calendar":
      return <CalendarTemplate data={data} />;
    case "settings":
      return <SettingsTemplate data={data} />;
    case "gallery":
      return <GalleryTemplate data={data} />;
    case "chat":
      return <ChatTemplate data={data} mod={mod} />;
    case "generator":
      return <GeneratorTemplate data={data} mod={mod} />;
  }
}
