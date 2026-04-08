import HomeClient from "./home-client";
import { cookies } from "next/headers";
import { discoverClaudeRuntimeCatalog } from "@/lib/claude-runtime-catalog";
import { getLocaleFromCookieValue } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await discoverClaudeRuntimeCatalog();
  const cookieStore = await cookies();
  const initialLocale = getLocaleFromCookieValue(
    cookieStore.get("locale")?.value
  );

  return (
    <HomeClient
      catalog={{
        commands: catalog.commands,
        plugins: catalog.plugins,
        skills: catalog.skills,
      }}
      initialLocale={initialLocale}
      serverHasApiKey={Boolean(process.env.ANTHROPIC_API_KEY?.trim())}
    />
  );
}
