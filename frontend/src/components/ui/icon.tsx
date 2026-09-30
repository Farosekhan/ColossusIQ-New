import type { IconName } from "@/config/modules";
import { cn } from "@/lib/utils";

/**
 * Flaticon UIcons (self-hosted icon font from @flaticon/flaticon-uicons — see footer credit).
 * `name` is the UIcons name without prefix, e.g. "house-chimney". Icons are decorative (aria-hidden);
 * pair them with visible text or an aria-label on the parent control.
 */
export function Fi({ name, className, solid = false }: { name: string; className?: string; solid?: boolean }) {
  return <i className={cn(solid ? `fi fi-sr-${name}` : `fi fi-rr-${name}`, "inline-flex leading-none", className)} aria-hidden />;
}

const MAP: Record<IconName, string> = {
  home: "house-chimney", bot: "robot", calendar: "calendar", book: "book-open-cover", chart: "chart-histogram",
  target: "bullseye-arrow", graph: "chart-network", passport: "id-badge", brain: "brain", test: "test",
  exam: "clipboard-list-check", pen: "pen-nib", mic: "microphone", trophy: "trophy", bank: "bank",
  briefcase: "briefcase", file: "document", compass: "compass-alt", store: "shop", gauge: "dashboard",
  chat: "comments", users: "users", languages: "language", award: "award", lightbulb: "bulb", rocket: "rocket-lunch",
  search: "search", flask: "flask", code: "code-simple", review: "memo-circle-check", party: "party-horn",
  wand: "sparkles", flag: "flag", ball: "football", star: "star", gamepad: "gamepad", heart: "heart",
  school: "graduation-cap", network: "network", clipboard: "clipboard-list", layers: "layers", shield: "shield-check",
  building: "building", bell: "bell", settings: "settings", plug: "plug", cpu: "microchip", eye: "eye",
  scroll: "scroll", credit: "credit-card", toggle: "toggle-on", alert: "triangle-warning", database: "database",
  handshake: "handshake", list: "list", coins: "coins", upload: "upload", admission: "user-add",
  staff: "id-card-clip-alt", userlock: "user-lock", key: "key", diploma: "diploma", stethoscope: "stethoscope", notebook: "notebook", hospital: "hospital", board: "chalkboard-user",
};

export function ModuleIcon({ name, className, solid }: { name: IconName; className?: string; solid?: boolean }) {
  return <Fi name={MAP[name] ?? "apps"} className={className} solid={solid} />;
}
