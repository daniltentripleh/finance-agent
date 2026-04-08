import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSandboxNetworkAllowList,
  discoverClaudeRuntimeCatalog,
} from "./claude-runtime-catalog";

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
  it("builds plugins, commands, skills, sandbox files, and MCP hosts from enabled plugins only", async () => {
    const workspaceRoot = await createTempWorkspace();
    const appRoot = path.join(workspaceRoot, "app");

    await mkdir(path.join(appRoot, "src"), { recursive: true });
    await mkdir(path.join(workspaceRoot, ".claude", "commands"), {
      recursive: true,
    });
    await mkdir(path.join(workspaceRoot, ".claude", "skills", "house-style"), {
      recursive: true,
    });
    await mkdir(
      path.join(
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        "commands"
      ),
      { recursive: true }
    );
    await mkdir(
      path.join(
        workspaceRoot,
        ".agents",
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
        workspaceRoot,
        ".agents",
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
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        ".claude-plugin",
        "marketplace.json"
      ),
      JSON.stringify(
        {
          plugins: [
            {
              name: "financial-analysis",
              source: "./financial-analysis",
            },
            {
              name: "equity-research",
              source: "./equity-research",
            },
          ],
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        "financial-analysis",
        ".claude-plugin",
        "plugin.json"
      ),
      JSON.stringify(
        {
          name: "financial-analysis",
          description: "Core finance workflows",
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(
        workspaceRoot,
        ".agents",
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
        workspaceRoot,
        ".agents",
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
        workspaceRoot,
        ".agents",
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
        workspaceRoot,
        ".agents",
        "plugins",
        "financial-services-plugins",
        "equity-research",
        ".claude-plugin",
        "plugin.json"
      ),
      JSON.stringify(
        {
          name: "equity-research",
          description: "Research workflows",
        },
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
          description: "Run an ad hoc workflow",
          category: "Workspace",
          hint: "[task]",
        }),
        expect.objectContaining({
          name: "/dcf",
          description: "Build a DCF valuation model",
          category: "Financial Analysis",
          hint: "[ticker]",
        }),
      ])
    );
    expect(catalog.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "house-style",
          description: "Apply the local house style.",
          category: "Workspace",
        }),
        expect.objectContaining({
          name: "dcf-model",
          description: "Build a DCF model.",
          category: "Financial Analysis",
        }),
      ])
    );
    expect(catalog.files.map((file) => file.path)).toContain(
      ".agents/plugins/financial-services-plugins/financial-analysis/commands/dcf.md"
    );
    expect(catalog.files.map((file) => file.path)).not.toContain(
      ".agents/plugins/financial-services-plugins/equity-research/.claude-plugin/plugin.json"
    );
    expect(catalog.networkHosts).toEqual(["mcp.daloopa.com"]);
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
