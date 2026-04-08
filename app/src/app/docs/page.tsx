import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import LanguageSwitcher from "../language-switcher";
import { buildCatalogCapabilityGroups } from "@/lib/claude-chat-catalog";
import { discoverClaudeRuntimeCatalog } from "@/lib/claude-runtime-catalog";
import { getDictionary, getLocaleFromCookieValue } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function getDocsViewModel() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookieValue(cookieStore.get("locale")?.value);
  const dictionary = getDictionary(locale);

  return { dictionary, locale };
}

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getDocsViewModel();

  return {
    title: dictionary.docs.metadata.title,
    description: dictionary.docs.metadata.description,
  };
}

function SectionList({
  title,
  emptyLabel,
  sourceLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  sourceLabel: string;
  items: Array<{
    key: string;
    name: string;
    description: string;
    hint?: string;
    sourcePath: string;
  }>;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-bg)]/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-terminal-accent)]">
          {title}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-terminal-border)]">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-terminal-muted)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.key}
              className="rounded-md border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-3"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-terminal-green)]">
                  {item.name}
                </span>
                {item.hint ? (
                  <span className="rounded border border-[var(--color-terminal-border)] px-2 py-0.5 text-[10px] text-[var(--color-terminal-muted)]">
                    {item.hint}
                  </span>
                ) : null}
              </div>
              <div className="prose max-w-none text-xs leading-6 text-[var(--color-terminal-text)]">
                <ReactMarkdown>{item.description}</ReactMarkdown>
              </div>
              <p className="mt-2 text-[10px] text-[var(--color-terminal-muted)]">
                {sourceLabel}: {item.sourcePath}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DocsPage() {
  const [{ dictionary, locale }, catalog] = await Promise.all([
    getDocsViewModel(),
    discoverClaudeRuntimeCatalog(),
  ]);
  const groups = buildCatalogCapabilityGroups(catalog);
  const totalCapabilities = catalog.commands.length + catalog.skills.length;

  return (
    <main className="min-h-screen bg-[var(--color-terminal-bg)] text-[var(--color-terminal-text)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-xl border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--color-terminal-border)]">
              {dictionary.docs.eyebrow}
            </p>
            <h1 className="text-3xl font-bold text-[var(--color-terminal-green)]">
              {dictionary.docs.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-terminal-muted)]">
              {dictionary.docs.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="rounded-lg border border-[var(--color-terminal-border)] px-4 py-3 text-right">
              <div className="text-lg font-semibold text-[var(--color-terminal-accent)]">
                {totalCapabilities}
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-terminal-muted)]">
                {dictionary.docs.totalCapabilities}
              </div>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-[var(--color-terminal-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-terminal-accent)] transition-colors hover:bg-[var(--color-terminal-accent)] hover:text-[var(--color-terminal-bg)]"
            >
              {dictionary.docs.backToChat}
            </Link>
          </div>
        </header>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-6 text-sm text-[var(--color-terminal-muted)]">
            {dictionary.docs.emptyState}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section
                key={group.plugin?.id ?? group.heading}
                className="rounded-xl border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-6"
              >
                <div className="mb-5">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-[var(--color-terminal-green)]">
                      {group.heading}
                    </h2>
                    <span className="rounded border border-[var(--color-terminal-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-terminal-muted)]">
                      {dictionary.docs.groupCounts(
                        group.commands.length,
                        group.skills.length
                      )}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--color-terminal-muted)]">
                    {group.description}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionList
                    title={dictionary.docs.commandsTitle}
                    emptyLabel={dictionary.docs.commandsEmpty}
                    sourceLabel={dictionary.docs.sourceLabel}
                    items={group.commands.map((command) => ({
                      key: command.sourcePath,
                      name: command.name,
                      description: command.description,
                      hint: command.hint,
                      sourcePath: command.sourcePath,
                    }))}
                  />
                  <SectionList
                    title={dictionary.docs.skillsTitle}
                    emptyLabel={dictionary.docs.skillsEmpty}
                    sourceLabel={dictionary.docs.sourceLabel}
                    items={group.skills.map((skill) => ({
                      key: skill.sourcePath,
                      name: skill.name,
                      description: skill.description,
                      sourcePath: skill.sourcePath,
                    }))}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
