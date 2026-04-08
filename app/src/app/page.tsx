import HomeClient from "./home-client";
import { discoverClaudeRuntimeCatalog } from "@/lib/claude-runtime-catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await discoverClaudeRuntimeCatalog();

  return (
    <HomeClient
      catalog={{
        commands: catalog.commands,
        plugins: catalog.plugins,
        skills: catalog.skills,
      }}
      serverHasApiKey={Boolean(process.env.ANTHROPIC_API_KEY?.trim())}
    />
  );
}
