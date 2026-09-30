/** Monogram for a college name, e.g. "Madurai Medical College & Hospital" → "MMC". */
export function initials(name: string): string {
  return name
    .replace(/[&,]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(of|and|the)$/i.test(w))
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
