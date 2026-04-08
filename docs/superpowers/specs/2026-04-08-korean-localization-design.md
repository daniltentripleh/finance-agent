# Korean Localization Design

## Summary

Add a Korean version of the website with a user-controlled language switcher, while leaving command names, skill names, plugin names, command hints, and discovered capability descriptions unchanged. The interface should support instant switching between English and Korean across the main chat UI, the `/docs` page, and page metadata.

## Goals

- Let users switch between English and Korean at any time.
- Persist the selected language across refreshes.
- Localize app chrome, labels, metadata, helper text, and empty states.
- Keep runtime-discovered capability content in its original language.
- Minimize refactor scope and preserve the app's current single-route shape.

## Non-Goals

- No locale-prefixed routing such as `/en` or `/ko`.
- No automatic translation of generated chat responses.
- No translation of command names, skill names, plugin names, command hints, or discovered plugin descriptions.
- No SEO-focused internationalized routing overhaul.

## Scope

### Included

- Main chat page UI in `app/src/app/home-client.tsx`
- Docs page chrome in `app/src/app/docs/page.tsx`
- Root metadata and document language in `app/src/app/layout.tsx`
- Shared localization utilities in `app/src/lib`

### Excluded

- Runtime-discovered capability payloads
- Model IDs and provider identifiers
- Any backend chat response transformation

## Recommended Approach

Use a hybrid localization design:

1. Store all translatable UI strings in a shared typed dictionary with English and Korean entries.
2. Use a persisted `locale` cookie as the server-readable source of truth.
3. Pass the initial locale into server-rendered pages so the first render already matches the user's preference.
4. Add lightweight client-side locale state so language switching updates visible UI immediately.
5. Update the cookie and trigger a client refresh after switching so server-rendered surfaces such as `/docs`, metadata, and `<html lang>` stay aligned.

This approach preserves the existing app structure and avoids turning a contained localization request into a route-level i18n refactor.

## Architecture

### Shared localization module

Create `app/src/lib/i18n.ts` with:

- `Locale` type: `"en" | "ko"`
- `defaultLocale`
- `translations` dictionary for UI strings
- `resolveLocale(input)` helper with safe fallback to English
- `getLocaleFromCookie(cookieStore)` helper for server components
- `getDictionary(locale)` helper that returns the localized copy set

The dictionary should be shaped around UI surfaces rather than flat ad hoc strings so usage stays readable and maintainable.

### Server-side locale initialization

The server should read the locale cookie in:

- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`
- `app/src/app/docs/page.tsx`

This allows:

- localized metadata
- correct initial `<html lang>`
- correct initial copy on `/docs`
- initial locale passed into `HomeClient`

### Client-side locale state

The main page should own a small locale state initialized from the server-provided locale.

On language switch:

1. Update client state immediately for instant UI feedback.
2. Write the selected locale into `document.cookie`.
3. Update `document.documentElement.lang`.
4. Update `document.title` if the page owns localized title text client-side.
5. Trigger `router.refresh()` so server-rendered content remains in sync.

This keeps the experience responsive while ensuring server and client surfaces converge on the same locale.

## UI Behavior

### Language switcher

Add a compact `EN / 한국어` toggle in the header on:

- the main app page
- the `/docs` page

Behavior:

- English is the default when no preference exists.
- The active language should be visually distinct.
- Switching languages should not clear chat history or input state unnecessarily.

### Main chat page

Translate surrounding UI copy including:

- modal headings and helper text
- buttons such as save, cancel, remove, run
- empty states
- status labels
- placeholders
- workspace helper text
- welcome-page headings and supporting copy
- loading and error messages owned by the UI

Do not translate:

- command names
- skill names
- plugin names
- command hints
- discovered descriptions coming from runtime catalog data
- user messages
- assistant responses

### Docs page

Translate surrounding docs chrome including:

- page heading
- subheading
- count labels
- section headings like commands and skills
- navigation labels
- empty states
- static helper text
- source label

Do not translate:

- group headings if they come from runtime-discovered plugin or workspace names
- command names
- skill names
- command hints
- discovered descriptions

## Metadata

Localize at minimum:

- page title
- page description
- `<html lang>`

Metadata should reflect the active locale for both the home page and `/docs`.

## Fallback Rules

- Unknown locale values fall back to English.
- Missing translation keys fall back to English rather than rendering blank text.
- If cookie persistence fails, the in-memory language switch should still update the current page immediately.

## Testing Strategy

Add a focused unit test file for the localization helpers, for example `app/src/lib/i18n.test.ts`, to verify:

- English is returned by default.
- Korean dictionary values are resolved correctly.
- Invalid locale values fall back to English.
- Cookie-derived locale resolution is safe and deterministic.

Existing runtime catalog and command palette tests should remain unchanged because the discovered capability data is intentionally not translated.

## Manual Verification

After implementation, verify:

1. Home page loads in English by default.
2. Switching to Korean updates all surrounding UI copy.
3. Refresh preserves the selected language.
4. `/docs` also renders in the selected language.
5. Page metadata and `<html lang>` reflect the selected language.
6. Command names, skill names, plugin names, command hints, and discovered descriptions remain unchanged.

## Risks

- Mixing server-rendered and client-rendered locale state can cause mismatch if initialization is inconsistent.
- Future UI copy additions may miss localization unless they flow through the shared dictionary.
- If discovered content is accidentally piped through localization helpers, capability labels may be translated against scope.

## Implementation Notes

- Favor a single shared dictionary over scattering inline conditionals across components.
- Keep the switcher logic small and reusable so the home page and docs page present consistent behavior.
- Avoid introducing route-level internationalization or middleware unless a later requirement explicitly needs SEO-oriented locale paths.
