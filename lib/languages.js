// Dil kataloğu — hem sohbet çevirisi (Google Translate ISO-639-1 kodları) hem de
// UI dili (uiPack: o dile UI çeviri paketi var mı) için tek kaynak.
//
// `native`: dilin kendi yazımındaki adı · `en`: İngilizce adı · `flag` · `rtl`: sağdan-sola
// `uiPack`: true ise arayüz o dile tam çevrilidir; değilse arayüz İngilizce'ye düşer (temiz fallback).
//
// Dünya çapında kullanım için WhatsApp ölçeğinde geniş katalog. Yeni dil = bir satır.

export const LANGUAGES = [
  { code: 'en', native: 'English', en: 'English', flag: '🇬🇧', rtl: false, uiPack: true },
  { code: 'tr', native: 'Türkçe', en: 'Turkish', flag: '🇹🇷', rtl: false, uiPack: true },
  { code: 'es', native: 'Español', en: 'Spanish', flag: '🇪🇸', rtl: false, uiPack: true },
  { code: 'pt', native: 'Português', en: 'Portuguese', flag: '🇧🇷', rtl: false, uiPack: true },
  { code: 'ru', native: 'Русский', en: 'Russian', flag: '🇷🇺', rtl: false, uiPack: true },
  { code: 'fr', native: 'Français', en: 'French', flag: '🇫🇷', rtl: false, uiPack: true },
  { code: 'de', native: 'Deutsch', en: 'German', flag: '🇩🇪', rtl: false, uiPack: true },
  { code: 'ar', native: 'العربية', en: 'Arabic', flag: '🇸🇦', rtl: true, uiPack: true },
  { code: 'hi', native: 'हिन्दी', en: 'Hindi', flag: '🇮🇳', rtl: false, uiPack: true },
  { code: 'id', native: 'Bahasa Indonesia', en: 'Indonesian', flag: '🇮🇩', rtl: false, uiPack: true },
  { code: 'zh', native: '中文 (简体)', en: 'Chinese (Simplified)', flag: '🇨🇳', rtl: false, uiPack: false },
  { code: 'zh-TW', native: '中文 (繁體)', en: 'Chinese (Traditional)', flag: '🇹🇼', rtl: false, uiPack: false },
  { code: 'ja', native: '日本語', en: 'Japanese', flag: '🇯🇵', rtl: false, uiPack: false },
  { code: 'ko', native: '한국어', en: 'Korean', flag: '🇰🇷', rtl: false, uiPack: false },
  { code: 'it', native: 'Italiano', en: 'Italian', flag: '🇮🇹', rtl: false, uiPack: false },
  { code: 'nl', native: 'Nederlands', en: 'Dutch', flag: '🇳🇱', rtl: false, uiPack: false },
  { code: 'pl', native: 'Polski', en: 'Polish', flag: '🇵🇱', rtl: false, uiPack: false },
  { code: 'uk', native: 'Українська', en: 'Ukrainian', flag: '🇺🇦', rtl: false, uiPack: false },
  { code: 'fa', native: 'فارسی', en: 'Persian', flag: '🇮🇷', rtl: true, uiPack: false },
  { code: 'ur', native: 'اردو', en: 'Urdu', flag: '🇵🇰', rtl: true, uiPack: false },
  { code: 'bn', native: 'বাংলা', en: 'Bengali', flag: '🇧🇩', rtl: false, uiPack: false },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi', flag: '🇮🇳', rtl: false, uiPack: false },
  { code: 'ta', native: 'தமிழ்', en: 'Tamil', flag: '🇮🇳', rtl: false, uiPack: false },
  { code: 'te', native: 'తెలుగు', en: 'Telugu', flag: '🇮🇳', rtl: false, uiPack: false },
  { code: 'mr', native: 'मराठी', en: 'Marathi', flag: '🇮🇳', rtl: false, uiPack: false },
  { code: 'gu', native: 'ગુજરાતી', en: 'Gujarati', flag: '🇮🇳', rtl: false, uiPack: false },
  { code: 'th', native: 'ไทย', en: 'Thai', flag: '🇹🇭', rtl: false, uiPack: false },
  { code: 'vi', native: 'Tiếng Việt', en: 'Vietnamese', flag: '🇻🇳', rtl: false, uiPack: false },
  { code: 'ms', native: 'Bahasa Melayu', en: 'Malay', flag: '🇲🇾', rtl: false, uiPack: false },
  { code: 'fil', native: 'Filipino', en: 'Filipino', flag: '🇵🇭', rtl: false, uiPack: false },
  { code: 'az', native: 'Azərbaycanca', en: 'Azerbaijani', flag: '🇦🇿', rtl: false, uiPack: false },
  { code: 'kk', native: 'Қазақша', en: 'Kazakh', flag: '🇰🇿', rtl: false, uiPack: false },
  { code: 'uz', native: 'Oʻzbekcha', en: 'Uzbek', flag: '🇺🇿', rtl: false, uiPack: false },
  { code: 'ro', native: 'Română', en: 'Romanian', flag: '🇷🇴', rtl: false, uiPack: false },
  { code: 'el', native: 'Ελληνικά', en: 'Greek', flag: '🇬🇷', rtl: false, uiPack: false },
  { code: 'cs', native: 'Čeština', en: 'Czech', flag: '🇨🇿', rtl: false, uiPack: false },
  { code: 'hu', native: 'Magyar', en: 'Hungarian', flag: '🇭🇺', rtl: false, uiPack: false },
  { code: 'sv', native: 'Svenska', en: 'Swedish', flag: '🇸🇪', rtl: false, uiPack: false },
  { code: 'da', native: 'Dansk', en: 'Danish', flag: '🇩🇰', rtl: false, uiPack: false },
  { code: 'fi', native: 'Suomi', en: 'Finnish', flag: '🇫🇮', rtl: false, uiPack: false },
  { code: 'no', native: 'Norsk', en: 'Norwegian', flag: '🇳🇴', rtl: false, uiPack: false },
  { code: 'he', native: 'עברית', en: 'Hebrew', flag: '🇮🇱', rtl: true, uiPack: false },
  { code: 'sw', native: 'Kiswahili', en: 'Swahili', flag: '🇰🇪', rtl: false, uiPack: false },
  { code: 'am', native: 'አማርኛ', en: 'Amharic', flag: '🇪🇹', rtl: false, uiPack: false },
  { code: 'ha', native: 'Hausa', en: 'Hausa', flag: '🇳🇬', rtl: false, uiPack: false },
  { code: 'yo', native: 'Yorùbá', en: 'Yoruba', flag: '🇳🇬', rtl: false, uiPack: false },
  { code: 'ig', native: 'Igbo', en: 'Igbo', flag: '🇳🇬', rtl: false, uiPack: false },
  { code: 'zu', native: 'isiZulu', en: 'Zulu', flag: '🇿🇦', rtl: false, uiPack: false },
  { code: 'af', native: 'Afrikaans', en: 'Afrikaans', flag: '🇿🇦', rtl: false, uiPack: false },
  { code: 'sr', native: 'Српски', en: 'Serbian', flag: '🇷🇸', rtl: false, uiPack: false },
  { code: 'hr', native: 'Hrvatski', en: 'Croatian', flag: '🇭🇷', rtl: false, uiPack: false },
  { code: 'bg', native: 'Български', en: 'Bulgarian', flag: '🇧🇬', rtl: false, uiPack: false },
  { code: 'sk', native: 'Slovenčina', en: 'Slovak', flag: '🇸🇰', rtl: false, uiPack: false },
  { code: 'sl', native: 'Slovenščina', en: 'Slovenian', flag: '🇸🇮', rtl: false, uiPack: false },
  { code: 'lt', native: 'Lietuvių', en: 'Lithuanian', flag: '🇱🇹', rtl: false, uiPack: false },
  { code: 'lv', native: 'Latviešu', en: 'Latvian', flag: '🇱🇻', rtl: false, uiPack: false },
  { code: 'et', native: 'Eesti', en: 'Estonian', flag: '🇪🇪', rtl: false, uiPack: false },
  { code: 'ka', native: 'ქართული', en: 'Georgian', flag: '🇬🇪', rtl: false, uiPack: false },
  { code: 'hy', native: 'Հայերեն', en: 'Armenian', flag: '🇦🇲', rtl: false, uiPack: false },
  { code: 'ne', native: 'नेपाली', en: 'Nepali', flag: '🇳🇵', rtl: false, uiPack: false },
  { code: 'si', native: 'සිංහල', en: 'Sinhala', flag: '🇱🇰', rtl: false, uiPack: false },
  { code: 'km', native: 'ខ្មែរ', en: 'Khmer', flag: '🇰🇭', rtl: false, uiPack: false },
  { code: 'my', native: 'မြန်မာ', en: 'Burmese', flag: '🇲🇲', rtl: false, uiPack: false },
];

const BY_CODE = LANGUAGES.reduce((m, l) => { m[l.code] = l; return m; }, {});

export function getLanguage(code) {
  return BY_CODE[code] || null;
}

// Sohbet çeviri etiketi (yerel ad — simge/bayrak yok). UI dilinden bağımsız.
export function languageLabel(code) {
  const l = BY_CODE[code];
  return l ? l.native : code;
}

export function isRTL(code) {
  return !!(BY_CODE[code] && BY_CODE[code].rtl);
}
