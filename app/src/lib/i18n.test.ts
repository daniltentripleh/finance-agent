import { describe, expect, it } from "vitest";
import { defaultLocale, getDictionary, resolveLocale } from "./i18n";

describe("resolveLocale", () => {
  it("falls back to English for unknown values", () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale);
    expect(resolveLocale("fr")).toBe("en");
  });
});

describe("getDictionary", () => {
  it("returns Korean copy when ko is selected", () => {
    expect(getDictionary("ko").common.run).toBe("실행");
  });
});
