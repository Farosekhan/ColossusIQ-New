export const LANGS = ["en", "ta", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = { en: "English", ta: "தமிழ்", hi: "हिन्दी" };

const en = {
  "nav.home": "Home",
  "nav.search": "Search modules, courses…",
  "nav.notifications": "Notifications",
  "nav.signout": "Sign out",
  "nav.theme": "Toggle theme",
  "nav.language": "Language",
  "nav.mentor": "Ask AI Mentor",
  "home.morning": "Good morning",
  "home.afternoon": "Good afternoon",
  "home.evening": "Good evening",
  "home.priorities": "Today you have {n} priorities",
  "home.continue": "Continue learning",
  "home.plan": "Today's plan",
  "common.phase": "Phase",
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.retry": "Try again",
  "session.expiring": "Your session will expire soon due to inactivity.",
  "session.stay": "Stay signed in",
};

type Dict = Record<keyof typeof en, string>;

const ta: Dict = {
  "nav.home": "முகப்பு",
  "nav.search": "தொகுதிகள், பாடங்களைத் தேடுக…",
  "nav.notifications": "அறிவிப்புகள்",
  "nav.signout": "வெளியேறு",
  "nav.theme": "தீம் மாற்று",
  "nav.language": "மொழி",
  "nav.mentor": "AI வழிகாட்டியிடம் கேள்",
  "home.morning": "காலை வணக்கம்",
  "home.afternoon": "மதிய வணக்கம்",
  "home.evening": "மாலை வணக்கம்",
  "home.priorities": "இன்று உங்களுக்கு {n} முன்னுரிமைகள் உள்ளன",
  "home.continue": "கற்றலைத் தொடர்க",
  "home.plan": "இன்றைய திட்டம்",
  "common.phase": "கட்டம்",
  "common.loading": "ஏற்றுகிறது…",
  "common.error": "ஏதோ தவறு நடந்தது.",
  "common.retry": "மீண்டும் முயல்க",
  "session.expiring": "செயலற்ற நிலையால் உங்கள் அமர்வு விரைவில் முடிவடையும்.",
  "session.stay": "உள்நுழைந்தே இரு",
};

const hi: Dict = {
  "nav.home": "होम",
  "nav.search": "मॉड्यूल, कोर्स खोजें…",
  "nav.notifications": "सूचनाएँ",
  "nav.signout": "साइन आउट",
  "nav.theme": "थीम बदलें",
  "nav.language": "भाषा",
  "nav.mentor": "AI मेंटर से पूछें",
  "home.morning": "सुप्रभात",
  "home.afternoon": "नमस्कार",
  "home.evening": "शुभ संध्या",
  "home.priorities": "आज आपकी {n} प्राथमिकताएँ हैं",
  "home.continue": "सीखना जारी रखें",
  "home.plan": "आज की योजना",
  "common.phase": "चरण",
  "common.loading": "लोड हो रहा है…",
  "common.error": "कुछ गलत हो गया।",
  "common.retry": "फिर से प्रयास करें",
  "session.expiring": "निष्क्रियता के कारण आपका सत्र जल्द समाप्त होगा।",
  "session.stay": "साइन इन रहें",
};

export const DICTS: Record<Lang, Dict> = { en, ta, hi };
export type TKey = keyof typeof en;

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}
