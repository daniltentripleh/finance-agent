import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSandboxNetworkAllowList,
  buildSandboxAgentScript,
  buildSandboxPackageJson,
  collectClaudeDesktopContext,
  sanitizeSandboxErrorMessage,
} from "./claude-agent-sandbox";

const tempDirs: string[] = [];

async function createTempWorkspace() {
  const dir = await mkdtemp(path.join(tmpdir(), "finance-agent-sandbox-"));
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

describe("buildSandboxPackageJson", () => {
  it("installs only the Agent SDK in the workspace package", () => {
    const parsed = JSON.parse(buildSandboxPackageJson()) as {
      dependencies?: Record<string, string>;
    };

    expect(parsed.dependencies).toEqual({
      "@anthropic-ai/claude-agent-sdk": "0.2.92",
    });
  });
});

describe("buildSandboxAgentScript", () => {
  it("uses the globally installed claude CLI instead of a local .bin shim", () => {
    const script = buildSandboxAgentScript();

    expect(script).toContain('pathToClaudeCodeExecutable: "claude"');
    expect(script).not.toContain("./node_modules/.bin/claude");
  });

  it("preserves the inherited environment so the claude binary stays on PATH", () => {
    const script = buildSandboxAgentScript();

    expect(script).toContain("...process.env");
  });
});

describe("sanitizeSandboxErrorMessage", () => {
  it("turns code 127 stderr dumps into a concise runtime message", () => {
    const rawMessage = `file:///vercel/sandbox/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:58
Error: Claude Code process exited with code 127
    at cX.getProcessExitError (file:///vercel/sandbox/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:58:7139)
    at ChildProcess.J (file:///vercel/sandbox/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:58:10059)`;

    expect(sanitizeSandboxErrorMessage(rawMessage)).toBe(
      "Claude Code CLI could not start inside the Vercel sandbox. Redeploy so the latest sandbox bootstrap can reinstall the CLI."
    );
  });

  it("turns native binary lookup failures into the same concise runtime message", () => {
    expect(
      sanitizeSandboxErrorMessage(
        "Claude Code native binary not found at claude. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable."
      )
    ).toBe(
      "Claude Code CLI could not start inside the Vercel sandbox. Redeploy so the latest sandbox bootstrap can reinstall the CLI."
    );
  });

  it("explains snapshot rebuild requirements for code 127 failures", () => {
    expect(
      sanitizeSandboxErrorMessage("Claude Code process exited with code 127", {
        usesSnapshot: true,
      })
    ).toBe(
      "Claude Code CLI could not start inside the Vercel sandbox snapshot. Rebuild the snapshot so it includes a working global Claude Code CLI installation."
    );
  });

  it("strips internal stack traces from generic sandbox errors", () => {
    const rawMessage = `Error: Sandbox dependency install failed
    at run (file:///vercel/sandbox/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:58:7139)
    at ChildProcess.J (node:events:531:35)`;

    expect(sanitizeSandboxErrorMessage(rawMessage)).toBe(
      "Error: Sandbox dependency install failed"
    );
  });
});

describe("collectClaudeDesktopContext", () => {
  it("hydrates sandbox files from the nearest .claude workspace and enabled plugins only", async () => {
    const workspaceRoot = await createTempWorkspace();
    const appRoot = path.join(workspaceRoot, "app");

    await mkdir(path.join(appRoot, "src"), { recursive: true });
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
      {
        recursive: true,
      }
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
      {
        recursive: true,
      }
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
      {
        recursive: true,
      }
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
      {
        recursive: true,
      }
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
      path.join(
        workspaceRoot,
        ".claude",
        "skills",
        "house-style",
        "SKILL.md"
      ),
      "# House Style"
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
      JSON.stringify({ name: "financial-analysis" }, null, 2)
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
      "/dcf"
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
      JSON.stringify({ name: "equity-research" }, null, 2)
    );

    const result = await collectClaudeDesktopContext(appRoot);
    const sandboxPaths = result.files.map((file) => file.path);

    expect(sandboxPaths).toContain(".claude/settings.json");
    expect(sandboxPaths).toContain(".claude/settings.local.json");
    expect(sandboxPaths).toContain(".claude/skills/house-style/SKILL.md");
    expect(sandboxPaths).toContain(
      ".agents/plugins/financial-services-plugins/.claude-plugin/marketplace.json"
    );
    expect(sandboxPaths).toContain(
      ".agents/plugins/financial-services-plugins/financial-analysis/.claude-plugin/plugin.json"
    );
    expect(sandboxPaths).toContain(
      ".agents/plugins/financial-services-plugins/financial-analysis/commands/dcf.md"
    );
    expect(sandboxPaths).not.toContain(
      ".agents/plugins/financial-services-plugins/equity-research/.claude-plugin/plugin.json"
    );
    expect(result.networkHosts).toEqual(["mcp.daloopa.com"]);
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
