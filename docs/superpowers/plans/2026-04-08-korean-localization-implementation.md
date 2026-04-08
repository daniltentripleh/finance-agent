# Korean Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Korean version of the finance-agent website with a persistent language switcher that localizes UI chrome, docs chrome, and metadata while leaving discovered command, skill, and plugin content unchanged.

**Architecture:** Introduce a shared typed i18n module in `app/src/lib` with English and Korean dictionaries plus safe locale resolution. Read the locale from a cookie on the server for initial render and metadata, then let client-side components switch languages instantly by updating local state, writing the cookie, and refreshing server-rendered surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Tailwind CSS, browser cookies

---

## File Structure

- Create: `app/src/lib/i18n.ts`
  Responsibility: locale types, default locale, translation dictionary, and safe locale helpers.
- Create: `app/src/lib/i18n.test.ts`
  Responsibility: verify locale resolution and translation fallback behavior.
- Create: `app/src/app/language-switcher.tsx`
  Responsibility: reusable client-side language toggle UI that can persist locale and optionally notify parent state.
- Modify: `app/src/app/layout.tsx`
  Responsibility: read locale server-side, set localized metadata, and set `<html lang>`.
- Modify: `app/src/app/page.tsx`
  Responsibility: pass initial locale into the main client page.
- Modify: `app/src/app/home-client.tsx`
  Responsibility: render localized app chrome and update visible copy instantly on language switch.
- Modify: `app/src/app/docs/page.tsx`
  Responsibility: render localized docs chrome and include the shared language switcher.

### Task 1: Add locale helpers and tests

**Files:**
- Create: `app/src/lib/i18n.ts`
- Test: `app/src/lib/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  getDictionary,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: FAIL because `./i18n` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type Locale = "en" | "ko";

export const defaultLocale: Locale = "en";

export function resolveLocale(input?: string | null): Locale {
  return input === "ko" ? "ko" : "en";
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
```

Add the actual nested dictionaries needed for:
- common button labels
- home page chrome
- settings modal labels
- docs page chrome
- metadata titles and descriptions

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/i18n.ts app/src/lib/i18n.test.ts
git commit -m "feat: add localization helpers"
```

### Task 2: Add server-side locale initialization and metadata

**Files:**
- Modify: `app/src/app/layout.tsx`
- Modify: `app/src/app/page.tsx`
- Modify: `app/src/app/docs/page.tsx`
- Create: `app/src/app/language-switcher.tsx`

- [ ] **Step 1: Write the failing test**

Extend `app/src/lib/i18n.test.ts` with a cookie-facing helper test:

```ts
import { getLocaleFromCookieValue } from "./i18n";

it("uses the cookie value when it matches a supported locale", () => {
  expect(getLocaleFromCookieValue("ko")).toBe("ko");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: FAIL because `getLocaleFromCookieValue` is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

In `app/src/lib/i18n.ts`, add:

```ts
export function getLocaleFromCookieValue(value?: string | null): Locale {
  return resolveLocale(value);
}
```

Then wire the server:
- make `layout.tsx` async
- replace static `metadata` export with `generateMetadata()`
- read the locale from `cookies()`
- set localized title, description, and `<html lang>`
- read the same locale in `page.tsx` and pass `initialLocale` to `HomeClient`
- read the locale in `docs/page.tsx` for translated server-rendered copy

Create `app/src/app/language-switcher.tsx` as a small client component that:
- renders `EN` and `한국어`
- writes `document.cookie = "locale=...; path=/; max-age=31536000; samesite=lax"`
- calls `router.refresh()`
- optionally invokes `onLocaleChange(locale)` when supplied by a client parent

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/i18n.ts app/src/app/layout.tsx app/src/app/page.tsx app/src/app/docs/page.tsx app/src/app/language-switcher.tsx
git commit -m "feat: initialize locale from cookies"
```

### Task 3: Localize the main chat UI

**Files:**
- Modify: `app/src/app/home-client.tsx`
- Modify: `app/src/lib/i18n.ts`
- Modify: `app/src/app/language-switcher.tsx`

- [ ] **Step 1: Write the failing test**

Add one more dictionary assertion in `app/src/lib/i18n.test.ts` that covers a home-page string:

```ts
it("exposes Korean home UI copy", () => {
  expect(getDictionary("ko").home.header.docs).toBe("문서");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: FAIL because the dictionary structure is missing the new key.

- [ ] **Step 3: Write minimal implementation**

In `home-client.tsx`:
- accept `initialLocale` from the server
- derive `dictionary` from locale state
- replace inline English strings with dictionary lookups for:
  - modal labels
  - welcome screen copy
  - workspace helper text
  - status labels
  - loading text
  - errors owned by the UI
  - input placeholder text
  - button labels
  - helper text around model selection
- keep discovered command names, hints, plugin names, skill names, and descriptions untouched
- render the shared `LanguageSwitcher` in the header
- use `onLocaleChange` to update locale state immediately before refresh

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/app/home-client.tsx app/src/lib/i18n.ts app/src/app/language-switcher.tsx
git commit -m "feat: localize chat UI"
```

### Task 4: Localize the docs page chrome

**Files:**
- Modify: `app/src/app/docs/page.tsx`
- Modify: `app/src/lib/i18n.ts`

- [ ] **Step 1: Write the failing test**

Add a docs-specific dictionary assertion:

```ts
it("exposes Korean docs copy", () => {
  expect(getDictionary("ko").docs.backToChat).toBe("채팅으로 돌아가기");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: FAIL because the docs translation key is not defined yet.

- [ ] **Step 3: Write minimal implementation**

In `docs/page.tsx`:
- read the localized dictionary from the server locale
- translate docs chrome including:
  - page heading and description
  - total-capabilities label
  - commands and skills section headings
  - empty states
  - source label
  - back-to-chat label
- keep runtime-discovered names and descriptions untouched
- include the shared language switcher in the docs header

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/app/docs/page.tsx app/src/lib/i18n.ts
git commit -m "feat: localize docs chrome"
```

### Task 5: Verify the full flow

**Files:**
- Test: `app/src/lib/i18n.test.ts`
- Verify: `app/src/app/home-client.tsx`
- Verify: `app/src/app/docs/page.tsx`
- Verify: `app/src/app/layout.tsx`

- [ ] **Step 1: Run the focused tests**

Run: `npm test -- --run app/src/lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Manually verify language switching**

Check:
- home page defaults to English
- switching to Korean updates UI copy immediately
- refresh preserves Korean
- `/docs` renders in Korean after switching
- page title and `<html lang>` match the locale
- discovered command, skill, and plugin content remains unchanged

- [ ] **Step 5: Commit**

```bash
git add app/src/app/layout.tsx app/src/app/page.tsx app/src/app/home-client.tsx app/src/app/docs/page.tsx app/src/app/language-switcher.tsx app/src/lib/i18n.ts app/src/lib/i18n.test.ts
git commit -m "feat: add Korean language switcher"
```
