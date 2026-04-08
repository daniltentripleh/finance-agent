export type Locale = "en" | "ko";

export const defaultLocale: Locale = "en";

const dictionaries = {
  en: {
    common: {
      run: "Run",
    },
  },
  ko: {
    common: {
      run: "실행",
    },
  },
} as const;

export function resolveLocale(input?: string | null): Locale {
  return input === "ko" ? "ko" : defaultLocale;
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
