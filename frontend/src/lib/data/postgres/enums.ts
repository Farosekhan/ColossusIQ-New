import "server-only";
import { Prisma } from "@prisma/client";

/*
 * PostgreSQL enum labels are exactly the UI labels ("Documents verified", "Theory + Lab");
 * Prisma exposes them under identifier names ("Documents_verified"). These helpers translate,
 * using the @map information in the generated client.
 */

type EnumMaps = { toLabel: Map<string, string>; toValue: Map<string, string> };
let maps: Map<string, EnumMaps> | undefined;

function load(): Map<string, EnumMaps> {
  if (maps) return maps;
  maps = new Map();
  for (const e of Prisma.dmmf.datamodel.enums) {
    const m: EnumMaps = { toLabel: new Map(), toValue: new Map() };
    for (const v of e.values) {
      const label = v.dbName ?? v.name;
      m.toLabel.set(v.name, label);
      m.toValue.set(label, v.name);
    }
    maps.set(e.name, m);
  }
  return maps;
}

/** Prisma enum value → UI label. */
export function label(enumName: string, value: string): string {
  return load().get(enumName)?.toLabel.get(value) ?? value;
}

/** UI label → Prisma enum value; throws for labels the database does not accept. */
export function enumValue<T extends string = string>(enumName: string, lbl: string): T {
  const v = load().get(enumName)?.toValue.get(lbl);
  if (!v) throw new EnumLabelError(enumName, lbl);
  return v as T;
}

/** Like enumValue, but undefined for unknown labels (filters, optional fields). */
export function maybeEnum<T extends string = string>(enumName: string, lbl: unknown): T | undefined {
  return typeof lbl === "string" ? (load().get(enumName)?.toValue.get(lbl) as T | undefined) : undefined;
}

export class EnumLabelError extends Error {
  constructor(enumName: string, lbl: string) {
    super(`"${lbl}" is not a valid ${enumName}`);
  }
}
