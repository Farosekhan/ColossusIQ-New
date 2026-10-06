import { z } from "zod";

/** Shared by the browser and the server: Language Learning. */

export const LANGUAGES = [
  { name: "English", native: "English" },
  { name: "Tamil", native: "தமிழ்" },
  { name: "Hindi", native: "हिन्दी" },
  { name: "Telugu", native: "తెలుగు" },
  { name: "Kannada", native: "ಕನ್ನಡ" },
  { name: "Malayalam", native: "മലയാളം" },
  { name: "French", native: "Français" },
  { name: "German", native: "Deutsch" },
  { name: "Japanese", native: "日本語" },
] as const;
export const LANGUAGE_NAMES = LANGUAGES.map((l) => l.name) as [(typeof LANGUAGES)[number]["name"], ...(typeof LANGUAGES)[number]["name"][]];
export const LANGUAGE_MODES = ["Beginner", "Conversation", "Workplace", "Travel", "Academic"] as const;
export const LANGUAGE_LEVELS = ["Beginner", "Elementary", "Intermediate", "Advanced"] as const;

export const LanguageSettings = z
  .object({ language: z.enum(LANGUAGE_NAMES), mode: z.enum(LANGUAGE_MODES), level: z.enum(LANGUAGE_LEVELS) })
  .strict();
export type LanguageSettings = z.infer<typeof LanguageSettings>;

/* ── what is saved for a student ── */
export const StoredPhrase = z.object({ id: z.string().max(20), text: z.string().max(200), romanized: z.string().max(200), meaning: z.string().max(300) });
export type StoredPhrase = z.infer<typeof StoredPhrase>;

export const StoredLesson = z.object({
  date: z.string(),
  language: z.enum(LANGUAGE_NAMES),
  mode: z.enum(LANGUAGE_MODES),
  level: z.enum(LANGUAGE_LEVELS),
  title: z.string().max(160),
  phrases: z.array(StoredPhrase).min(1).max(10),
  tip: z.string().max(600),
  practice: z.string().max(600),
  source: z.enum(["ai", "built-in"]),
});
export type StoredLesson = z.infer<typeof StoredLesson>;

export const VocabItem = z.object({
  key: z.string().max(260),
  language: z.enum(LANGUAGE_NAMES),
  text: z.string().max(200),
  romanized: z.string().max(200),
  meaning: z.string().max(300),
  learnedAt: z.string(),
});
export type VocabItem = z.infer<typeof VocabItem>;

export const MAX_VOCAB = 500;
export const StoredLanguageState = z.object({
  settings: LanguageSettings,
  lesson: StoredLesson.nullable(),
  vocab: z.array(VocabItem).max(MAX_VOCAB),
  /** Days (yyyy-mm-dd, India time) on which the student learned a phrase or practised with the coach. */
  activeDays: z.array(z.string()).max(120),
  chatCount: z.number().int().min(0),
  updatedAt: z.string(),
});
export type StoredLanguageState = z.infer<typeof StoredLanguageState>;

/* ── what the page receives ── */
export const ViewPhrase = StoredPhrase.extend({ key: z.string(), learned: z.boolean() });
export const ViewLesson = StoredLesson.omit({ phrases: true }).extend({ phrases: z.array(ViewPhrase) });
export type ViewLesson = z.infer<typeof ViewLesson>;

export const LanguageOverview = z.object({
  catalog: z.object({
    languages: z.array(z.object({ name: z.string(), native: z.string() })),
    modes: z.array(z.string()),
    levels: z.array(z.string()),
  }),
  settings: LanguageSettings,
  lesson: ViewLesson.nullable(),
  vocab: z.array(VocabItem), // newest first, up to 60
  vocabCount: z.number().int(),
  perLanguage: z.array(z.object({ language: z.string(), count: z.number().int() })),
  streak: z.number().int(),
  activeDays: z.array(z.string()), // the last 14 days that had activity
  today: z.string(),
  chatCount: z.number().int(),
  aiLive: z.boolean(),
});
export type LanguageOverview = z.infer<typeof LanguageOverview>;

export const PhraseToggle = z.object({ key: z.string().min(3).max(260), learned: z.boolean() }).strict();
