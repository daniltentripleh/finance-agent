import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSandboxNetworkAllowList,
  discoverClaudeRuntimeCatalog,
} from "./claude-runtime-catalog";
import { formatCatalogForChat } from "./claude-chat-catalog";

const tempDirs: string[] = [];

async function createTempWorkspace() {
  const dir = await mkdtemp(path.join(tmpdir(), "finance-agent-catalog-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("discoverClaudeRuntimeCatalog", () => {
  it("builds plugins from app/plugins and rewrites sandbox settings to that location", async () => {
    const workspaceRoot = await createTempWorkspace();
    const appRoot = path.join(workspaceRoot, "app");

    await mkdir(path.join(appRoot, "src"), { recursive: true });
    await mkdir(path.join(workspaceRoot, ".git"), { recursive: true });
    await writeFile(
      path.join(appRoot, "package.json"),
      JSON.stringify({ name: "finance-agent-test" }, null, 2)
    );
    await mkdir(path.join(workspaceRoot, ".claude", "commands"), {
      recursive: true,
    });
    await mkdir(path.join(workspaceRoot, ".claude", "skills", "house-style"), {
      recursive: true,
    });
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "commands"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "skills",
        "dcf-model"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "equity-research",
        ".claude-plugin"
      ),
      { recursive: true }
    );

    await writeFile(
      path.join(workspaceRoot, ".claude", "settings.json"),
      JSON.stringify(
        {
          enabledPlugins: {
            "financial-analysis@financial-services-plugins": true,
            "equity-research@financial-services-plugins": false,
          },
          extraKnownMarketplaces: {
            "financial-services-plugins": {
              source: {
                source: "directory",
                path: ".agents/plugins/financial-services-plugins",
              },
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(workspaceRoot, ".claude", "settings.local.json"),
      JSON.stringify({ permissions: { allow: ["Bash(git:*)"] } }, null, 2)
    );
    await writeFile(
      path.join(workspaceRoot, ".claude", "commands", "ad-hoc.md"),
      `---
description: Run an ad hoc workflow
argument-hint: "[task]"
---
`
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".claude",
        "skills",
        "house-style",
        "SKILL.md"
      ),
      `---
name: house-style
description: Apply the local house style.
---
`
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        ".claude-plugin",
        "marketplace.json"
      ),
      JSON.stringify(
        {
          plugins: [
            { name: "financial-analysis", source: "./financial-analysis" },
            { name: "equity-research", source: "./equity-research" },
          ],
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin",
        "plugin.json"
      ),
      JSON.stringify(
        { name: "financial-analysis", description: "Core finance workflows" },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".mcp.json"
      ),
      JSON.stringify(
        {
          mcpServers: {
            daloopa: {
              type: "http",
              url: "https://mcp.daloopa.com/server/mcp",
            },
          },
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "commands",
        "dcf.md"
      ),
      `---
description: Build a DCF valuation model
argument-hint: "[ticker]"
---
`
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "skills",
        "dcf-model",
        "SKILL.md"
      ),
      `---
name: dcf-model
description: Build a DCF model.
---
`
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "equity-research",
        ".claude-plugin",
        "plugin.json"
      ),
      JSON.stringify(
        { name: "equity-research", description: "Research workflows" },
        null,
        2
      )
    );

    const catalog = await discoverClaudeRuntimeCatalog(appRoot);

    expect(catalog.plugins).toEqual([
      expect.objectContaining({
        id: "financial-analysis@financial-services-plugins",
        name: "financial-analysis",
        displayName: "Financial Analysis",
      }),
    ]);
    expect(catalog.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "/ad-hoc",
          category: "Workspace",
          hint: "[task]",
        }),
        expect.objectContaining({
          name: "/dcf",
          category: "Financial Analysis",
          hint: "[ticker]",
        }),
      ])
    );
    expect(catalog.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "house-style",
          category: "Workspace",
        }),
        expect.objectContaining({
          name: "dcf-model",
          category: "Financial Analysis",
        }),
      ])
    );
    expect(catalog.files.map((file) => file.path)).toContain(
      "plugins/financial-services-plugins/financial-analysis/commands/dcf.md"
    );
    expect(catalog.files.map((file) => file.path)).not.toContain(
      "plugins/financial-services-plugins/equity-research/.claude-plugin/plugin.json"
    );
    expect(catalog.networkHosts).toEqual(["mcp.daloopa.com"]);
    expect(
      catalog.files.find((file) => file.path === ".claude/settings.json")?.content
    ).toContain('"path": "plugins/financial-services-plugins"');
  });

  it("falls back to app/plugins when no .claude settings exist", async () => {
    const workspaceRoot = await createTempWorkspace();
    const appRoot = path.join(workspaceRoot, "app");

    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "commands"
      ),
      { recursive: true }
    );

    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        ".claude-plugin",
        "marketplace.json"
      ),
      JSON.stringify(
        {
          plugins: [{ name: "financial-analysis", source: "./financial-analysis" }],
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin",
        "plugin.json"
      ),
      JSON.stringify({ name: "financial-analysis" }, null, 2)
    );
    await writeFile(
      path.join(
        appRoot,
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "commands",
        "dcf.md"
      ),
      `---
description: Build a DCF valuation model
---
`
    );

    const catalog = await discoverClaudeRuntimeCatalog(appRoot);

    expect(catalog.plugins).toEqual([
      expect.objectContaining({
        id: "financial-analysis@financial-services-plugins",
      }),
    ]);
    expect(catalog.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "/dcf",
          category: "Financial Analysis",
        }),
      ])
    );
    expect(
      catalog.files.find((file) => file.path === ".claude/settings.json")?.content
    ).toContain('"financial-analysis@financial-services-plugins": true');
  });
});

describe("buildSandboxNetworkAllowList", () => {
  it("adds plugin MCP hosts to the sandbox policy and keeps the list stable", () => {
    expect(
      buildSandboxNetworkAllowList(false, [
        "mcp.daloopa.com",
        "api.anthropic.com",
        "mcp.daloopa.com",
      ])
    ).toEqual([
      "api.anthropic.com",
      "mcp.daloopa.com",
      "registry.npmjs.org",
    ]);
  });

  it("skips npm when the sandbox starts from a snapshot", () => {
    expect(buildSandboxNetworkAllowList(true, ["mcp.daloopa.com"])).toEqual([
      "api.anthropic.com",
      "mcp.daloopa.com",
    ]);
  });
});

describe("formatCatalogForChat", () => {
  it("renders the discovered plugin, command, and skill structure as markdown", () => {
    const message = formatCatalogForChat({
      plugins: [
        {
          id: "financial-analysis@financial-services-plugins",
          marketplace: "financial-services-plugins",
          name: "financial-analysis",
          displayName: "Financial Analysis",
          description: "Core finance workflows",
          commandCount: 2,
          skillCount: 2,
        },
      ],
      commands: [
        {
          name: "/dcf",
          description: "Build a DCF model",
          category: "Financial Analysis",
          pluginId: "financial-analysis@financial-services-plugins",
          sourcePath: "plugins/financial-services-plugins/financial-analysis/commands/dcf.md",
        },
        {
          name: "/ad-hoc",
          description: "Run an ad hoc workflow",
          category: "Workspace",
          sourcePath: ".claude/commands/ad-hoc.md",
        },
      ],
      skills: [
        {
          name: "dcf-model",
          description: "Build a DCF model.",
          category: "Financial Analysis",
          pluginId: "financial-analysis@financial-services-plugins",
          sourcePath: "plugins/financial-services-plugins/financial-analysis/skills/dcf-model/SKILL.md",
        },
        {
          name: "house-style",
          description: "Apply the local house style.",
          category: "Workspace",
          sourcePath: ".claude/skills/house-style/SKILL.md",
        },
      ],
    });

    expect(message).toContain("## Available runtime capabilities");
    expect(message).toContain("### Financial Analysis");
    expect(message).toContain("- Commands: `/dcf`");
    expect(message).toContain("- Skills: `dcf-model`");
    expect(message).toContain("### Workspace");
    expect(message).toContain("- Commands: `/ad-hoc`");
    expect(message).toContain("- Skills: `house-style`");
  });

  it("returns an empty-state message when the catalog has no capabilities", () => {
    expect(
      formatCatalogForChat({ plugins: [], commands: [], skills: [] })
    ).toBe("No runtime plugins, commands, or skills were discovered.");
  });
});
