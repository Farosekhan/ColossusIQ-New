import "server-only";
import type { LanguageSettings } from "@/lib/api/languages-schemas";

/*
 * Built-in starter phrases, used for lessons when the AI is off or unavailable. Common campus essentials only; the
 * AI writes lessons tailored to a student's mode, level and subjects.
 */

export interface Entry {
  text: string;
  romanized: string;
  meaning: string;
}
type Lang = LanguageSettings["language"];

const e = (text: string, romanized: string, meaning: string): Entry => ({ text, romanized, meaning });

export const PHRASEBOOK: Record<Lang, Entry[]> = {
  English: [
    e("Good morning", "", "A polite greeting used until about noon"),
    e("How are you?", "", "Asking about someone's well-being; reply with \"I'm fine, thank you. And you?\""),
    e("Thank you very much", "", "A warm way to say thanks"),
    e("Excuse me", "", "Used to get attention or to pass politely"),
    e("My name is …", "", "Introducing yourself"),
    e("Could you please repeat that?", "", "Asking someone to say something again"),
    e("I'm sorry, I didn't understand", "", "Telling someone politely that you need help understanding"),
    e("Where is the library?", "", "Asking for directions on campus"),
  ],
  Tamil: [
    e("வணக்கம்", "vanakkam", "Hello"),
    e("காலை வணக்கம்", "kaalai vanakkam", "Good morning"),
    e("நீங்கள் எப்படி இருக்கிறீர்கள்?", "neengal eppadi irukkireergal?", "How are you?"),
    e("நன்றி", "nandri", "Thank you"),
    e("மன்னிக்கவும்", "mannikkavum", "Sorry / excuse me"),
    e("என் பெயர் …", "en peyar …", "My name is …"),
    e("எனக்குப் புரியவில்லை", "enakku puriyavillai", "I don't understand"),
    e("நூலகம் எங்கே உள்ளது?", "noolagam engae ullathu?", "Where is the library?"),
  ],
  Hindi: [
    e("नमस्ते", "namaste", "Hello"),
    e("सुप्रभात", "suprabhaat", "Good morning"),
    e("आप कैसे हैं?", "aap kaise hain?", "How are you?"),
    e("धन्यवाद", "dhanyavaad", "Thank you"),
    e("माफ़ कीजिए", "maaf kijiye", "Sorry / excuse me"),
    e("मेरा नाम … है", "mera naam … hai", "My name is …"),
    e("मुझे समझ नहीं आया", "mujhe samajh nahin aaya", "I didn't understand"),
    e("पुस्तकालय कहाँ है?", "pustakaalay kahaan hai?", "Where is the library?"),
  ],
  Telugu: [
    e("నమస్కారం", "namaskaram", "Hello"),
    e("శుభోదయం", "shubhodayam", "Good morning"),
    e("మీరు ఎలా ఉన్నారు?", "meeru elaa unnaaru?", "How are you?"),
    e("ధన్యవాదాలు", "dhanyavaadaalu", "Thank you"),
    e("క్షమించండి", "kshaminchandi", "Sorry / excuse me"),
    e("నా పేరు …", "naa peru …", "My name is …"),
    e("నాకు అర్థం కాలేదు", "naaku artham kaaledu", "I didn't understand"),
    e("గ్రంథాలయం ఎక్కడ ఉంది?", "granthaalayam ekkada undi?", "Where is the library?"),
  ],
  Kannada: [
    e("ನಮಸ್ಕಾರ", "namaskaara", "Hello"),
    e("ಶುಭೋದಯ", "shubhodaya", "Good morning"),
    e("ನೀವು ಹೇಗಿದ್ದೀರಿ?", "neevu hegiddeeri?", "How are you?"),
    e("ಧನ್ಯವಾದ", "dhanyavaada", "Thank you"),
    e("ಕ್ಷಮಿಸಿ", "kshamisi", "Sorry / excuse me"),
    e("ನನ್ನ ಹೆಸರು …", "nanna hesaru …", "My name is …"),
    e("ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ", "nanage arthavaagalilla", "I didn't understand"),
    e("ಗ್ರಂಥಾಲಯ ಎಲ್ಲಿದೆ?", "granthaalaya ellide?", "Where is the library?"),
  ],
  Malayalam: [
    e("നമസ്കാരം", "namaskaaram", "Hello"),
    e("സുപ്രഭാതം", "suprabhaatham", "Good morning"),
    e("സുഖമാണോ?", "sukhamaano?", "How are you?"),
    e("നന്ദി", "nandi", "Thank you"),
    e("ക്ഷമിക്കണം", "kshamikkanam", "Sorry / excuse me"),
    e("എന്റെ പേര് …", "ente peru …", "My name is …"),
    e("എനിക്ക് മനസ്സിലായില്ല", "enikku manassilaayilla", "I didn't understand"),
    e("ലൈബ്രറി എവിടെയാണ്?", "library evideyaanu?", "Where is the library?"),
  ],
  French: [
    e("Bonjour", "", "Hello / good day"),
    e("Comment allez-vous ?", "", "How are you? (polite)"),
    e("Merci", "", "Thank you"),
    e("S'il vous plaît", "", "Please"),
    e("Excusez-moi", "", "Excuse me"),
    e("Je m'appelle …", "", "My name is …"),
    e("Je ne comprends pas", "", "I don't understand"),
    e("Où est la bibliothèque ?", "", "Where is the library?"),
  ],
  German: [
    e("Hallo", "", "Hello"),
    e("Guten Morgen", "", "Good morning"),
    e("Wie geht es Ihnen?", "", "How are you? (polite)"),
    e("Danke schön", "", "Thank you very much"),
    e("Entschuldigung", "", "Excuse me / sorry"),
    e("Ich heiße …", "", "My name is …"),
    e("Ich verstehe nicht", "", "I don't understand"),
    e("Wo ist die Bibliothek?", "", "Where is the library?"),
  ],
  Japanese: [
    e("こんにちは", "konnichiwa", "Hello / good afternoon"),
    e("おはようございます", "ohayou gozaimasu", "Good morning"),
    e("お元気ですか？", "ogenki desu ka?", "How are you?"),
    e("ありがとうございます", "arigatou gozaimasu", "Thank you (polite)"),
    e("すみません", "sumimasen", "Excuse me / sorry"),
    e("わたしの名前は…です", "watashi no namae wa … desu", "My name is …"),
    e("わかりません", "wakarimasen", "I don't understand"),
    e("図書館はどこですか？", "toshokan wa doko desu ka?", "Where is the library?"),
  ],
};

export const MODE_TIP: Record<LanguageSettings["mode"], { tip: string; practice: string }> = {
  Beginner: { tip: "Learn the sounds first. Say each phrase slowly, then at normal speed.", practice: "Say each phrase aloud three times, then write it from memory." },
  Conversation: { tip: "Reply in full short sentences instead of single words, even if they are simple.", practice: "Greet the coach, ask how it is, and say your name, using these phrases." },
  Workplace: { tip: "Polite forms matter at work. Start with a greeting and finish with thanks.", practice: "Write two lines you could say to a new colleague using these phrases." },
  Travel: { tip: "Short, polite questions work best when asking for help. Point and smile too.", practice: "Imagine asking a stranger for directions and say your lines out loud." },
  Academic: { tip: "Use the formal register with teachers and when speaking in class.", practice: "Introduce yourself to a teacher and ask where the library is." },
};
