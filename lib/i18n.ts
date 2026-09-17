import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import pt from "@/messages/pt.json";

export const SUPPORTED_LOCALES = ["fr", "en", "ar", "pt"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_LABEL: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  pt: "Português",
};

export const LOCALE_FLAG: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇸🇦",
  pt: "🇵🇹",
};

/** BCP-47 utilisé pour Intl/toLocaleDateString — distinct du code de langue applicatif (2 lettres). */
export const LOCALE_TO_BCP47: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-SA",
  pt: "pt-PT",
};

const MESSAGES: Record<Locale, Record<string, unknown>> = { fr, en, ar, pt };

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale) {
  return MESSAGES[locale];
}
