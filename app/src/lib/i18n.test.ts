import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  getDictionary,
  getLocaleFromCookieValue,
  resolveLocale,
} from "./i18n";

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

describe("getLocaleFromCookieValue", () => {
  it("uses the cookie value when it matches a supported locale", () => {
    expect(getLocaleFromCookieValue("ko")).toBe("ko");
  });
});
