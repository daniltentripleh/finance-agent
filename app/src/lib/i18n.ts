export type Locale = "en" | "ko";

export const defaultLocale: Locale = "en";

const dictionaries = {
  en: {
    common: {
      run: "Run",
    },
    metadata: {
      title: "Finance Agent",
      description:
        "AI-powered financial analysis agent - DCF, comps, earnings, LBO, and more",
    },
  },
  ko: {
    common: {
      run: "실행",
    },
    metadata: {
      title: "파이낸스 에이전트",
      description:
        "DCF, 비교기업, 실적 분석, LBO 등을 지원하는 AI 금융 분석 에이전트",
    },
  },
} as const;

export function resolveLocale(input?: string | null): Locale {
  return input === "ko" ? "ko" : defaultLocale;
}

export function getLocaleFromCookieValue(value?: string | null): Locale {
  return resolveLocale(value);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
