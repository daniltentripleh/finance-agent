import { describe, expect, it } from "vitest";
import {
  buildSandboxAgentScript,
  buildSandboxPackageJson,
  sanitizeSandboxErrorMessage,
} from "./claude-agent-sandbox";

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
