/** Resolve an image reference (uploaded media id or bundled illustration) to a same-origin URL. */
export function mediaUrl(ref: unknown): string | null {
  if (typeof ref !== "string" || !ref) return null;
  if (/^\/campus\/[a-z0-9-]{1,40}\.svg$/.test(ref)) return ref;
  if (/^MED-[a-f0-9]{24}$/.test(ref)) return `/api/v1/public/media/${ref}`;
  return null;
}

/** Bundled campus illustrations available to every college. */
export const CAMPUS_IMAGES = [
  { ref: "/campus/campus.svg", label: "Main building" },
  { ref: "/campus/hospital.svg", label: "Teaching hospital" },
  { ref: "/campus/library.svg", label: "Library" },
  { ref: "/campus/lab.svg", label: "Laboratory" },
  { ref: "/campus/classroom.svg", label: "Classroom" },
  { ref: "/campus/sports.svg", label: "Sports ground" },
  { ref: "/campus/cultural.svg", label: "Cultural festival" },
  { ref: "/campus/graduation.svg", label: "Graduation day" },
] as const;
