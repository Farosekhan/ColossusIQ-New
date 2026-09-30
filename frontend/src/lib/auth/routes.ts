import { ROLES, type Role } from "./roles";

/** Each role owns exactly one portal prefix. */
export function portalPath(role: Role): string {
  return `/${role}`;
}

/** Returns the role whose portal owns this pathname, or null for non-portal paths. */
export function roleForPath(pathname: string): Role | null {
  const first = pathname.split("/")[1] ?? "";
  return (ROLES as readonly string[]).includes(first) ? (first as Role) : null;
}
