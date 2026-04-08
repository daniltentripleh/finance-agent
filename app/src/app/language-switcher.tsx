"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function LanguageSwitcher({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const router = useRouter();

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;

    onLocaleChange?.(nextLocale);
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    router.refresh();
  }

  return (
    <div className="flex items-center rounded border border-[var(--color-terminal-border)] p-0.5 text-xs text-[var(--color-terminal-muted)]">
      {(["en", "ko"] as const).map((option) => {
        const isActive = option === locale;

        return (
          <button
            key={option}
            type="button"
            onClick={() => switchLocale(option)}
            className={`rounded px-2 py-1 transition-colors ${
              isActive
                ? "bg-[var(--color-terminal-accent)] text-[var(--color-terminal-bg)]"
                : "hover:text-[var(--color-terminal-text)]"
            }`}
          >
            {option === "en" ? "EN" : "한국어"}
          </button>
        );
      })}
    </div>
  );
}
