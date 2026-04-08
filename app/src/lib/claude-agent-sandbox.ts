import { Sandbox } from "@vercel/sandbox";
import {
  buildSandboxNetworkAllowList,
  discoverClaudeRuntimeCatalog,
  type SandboxWorkspaceFile,
} from "./claude-runtime-catalog";
import type { RuntimeAttachment } from "./chat-attachment-runtime";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SANDBOX_SNAPSHOT_ID =
  process.env.VERCEL_SANDBOX_SNAPSHOT_ID?.trim() || null;
const CLAUDE_AGENT_SDK_VERSION = "0.2.92";
const CLAUDE_CODE_VERSION = "2.1.92";
const DEFAULT_SANDBOX_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

export function buildSandboxPackageJson() {
  return JSON.stringify(
    {
      name: "finance-agent-sandbox-runner",
      private: true,
      type: "module",
      dependencies: {
        "@anthropic-ai/claude-agent-sdk": CLAUDE_AGENT_SDK_VERSION,
      },
    },
    null,
    2
  );
}

export function buildSandboxAgentScript() {
  return `import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const payload = JSON.parse(await readFile("./request.json", "utf8"));

let sessionId = null;
let finalResult = "";
let finalError = null;

async function hydrateAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const hydrated = [];

  await mkdir(".attachments", { recursive: true });

  for (const attachment of attachments) {
    const response = await fetch(attachment.downloadUrl);

    if (!response.ok) {
      throw new Error(\`Failed to download attachment: \${attachment.originalName}\`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const targetPath = path.resolve(process.cwd(), attachment.sandboxPath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);

    hydrated.push({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType ?? null,
      byteSize: attachment.byteSize ?? null,
      sandboxPath: attachment.sandboxPath,
    });
  }

  await writeFile("./attachment-manifest.json", JSON.stringify(hydrated, null, 2));
  return hydrated;
}

try {
  await hydrateAttachments(payload.attachments ?? []);

  for await (const message of query({
    prompt: payload.prompt,
    options: {
      cwd: process.cwd(),
      model: payload.model,
      maxTurns: payload.maxTurns,
      tools: [],
      permissionMode: "dontAsk",
      pathToClaudeCodeExecutable: "claude",
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_AGENT_SDK_CLIENT_APP: "finance-agent-vercel-sandbox"
      }
    }
  })) {
    if (message.type !== "result") continue;

    sessionId = message.session_id;

    if (message.subtype === "success") {
      finalResult = message.result;
      continue;
    }

    finalError = message.errors?.join("\\n") || "Claude Agent SDK failed.";
  }

  if (finalError) {
    console.error(finalError);
    process.exit(1);
  }

  console.log(JSON.stringify({ result: finalResult, sessionId }));
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Claude Agent SDK failed.";

  console.error(message);
  process.exit(1);
}
`;
}

const SANDBOX_PACKAGE_JSON = buildSandboxPackageJson();
const SANDBOX_AGENT_SCRIPT = buildSandboxAgentScript();

function extractHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

function getAttachmentNetworkHosts(attachments: RuntimeAttachment[]) {
  const hosts = new Set<string>();

  for (const attachment of attachments) {
    const host = extractHost(attachment.downloadUrl);

    if (host) {
      hosts.add(host);
    }
  }

  return Array.from(hosts);
}

function getInstallNetworkPolicy(
  useSnapshot: boolean,
  pluginHosts: string[],
  attachmentHosts: string[] = []
) {
  return {
    allow: buildSandboxNetworkAllowList(useSnapshot, [
      ...pluginHosts,
      ...attachmentHosts,
    ]),
  };
}

export function sanitizeSandboxErrorMessage(
  message: string,
  options?: { usesSnapshot?: boolean }
) {
  const trimmed = message.trim();

  if (
    trimmed.includes("Auth required") ||
    trimmed.includes("VERCEL_OIDC_TOKEN") ||
    trimmed.toLowerCase().includes("oidc")
  ) {
    return "Vercel Sandbox authentication is not available. In local development, run `vercel link` and `vercel env pull` before using the agent route.";
  }

  if (trimmed.includes("Claude Code process exited with code 127")) {
    if (options?.usesSnapshot) {
      return "Claude Code CLI could not start inside the Vercel sandbox snapshot. Rebuild the snapshot so it includes a working global Claude Code CLI installation.";
    }

    return "Claude Code CLI could not start inside the Vercel sandbox. Redeploy so the latest sandbox bootstrap can reinstall the CLI.";
  }

  if (trimmed.includes("Claude Code native binary not found at claude")) {
    if (options?.usesSnapshot) {
      return "Claude Code CLI could not start inside the Vercel sandbox snapshot. Rebuild the snapshot so it includes a working global Claude Code CLI installation.";
    }

    return "Claude Code CLI could not start inside the Vercel sandbox. Redeploy so the latest sandbox bootstrap can reinstall the CLI.";
  }

  return trimmed.split(/\r?\n/).find((line) => line.trim()) || "Unknown sandbox error.";
}

function getReadableSandboxError(
  error: unknown,
  options?: { usesSnapshot?: boolean }
) {
  const message =
    error instanceof Error ? error.message : "Unknown sandbox error.";

  return sanitizeSandboxErrorMessage(message, options);
}

async function installSandboxDependencies(sandbox: Sandbox) {
  const installClaudeCode = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", `@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}`],
    sudo: true,
  });

  if (installClaudeCode.exitCode !== 0) {
    throw new Error(
      `Claude Code CLI install failed\n${await installClaudeCode.stderr()}`
    );
  }

  const installSdk = await sandbox.runCommand({
    cmd: "npm",
    args: ["install"],
    cwd: "/vercel/sandbox",
  });

  if (installSdk.exitCode !== 0) {
    throw new Error(
      `Sandbox dependency install failed\n${await installSdk.stderr()}`
    );
  }
}

async function verifyClaudeCodeCli(sandbox: Sandbox, useSnapshot: boolean) {
  const verify = await sandbox.runCommand({
    cmd: "claude",
    args: ["--version"],
    cwd: "/vercel/sandbox",
  });

  if (verify.exitCode !== 0) {
    const stderr = (await verify.stderr()).trim();

    throw new Error(
      stderr ||
        (useSnapshot
          ? "Claude Code process exited with code 127"
          : "Claude Code process exited with code 127")
    );
  }
}

async function writeSandboxFiles(
  sandbox: Sandbox,
  payload: {
    prompt: string;
    model: string;
    maxTurns: number;
    attachments: RuntimeAttachment[];
  },
  supportFiles: SandboxWorkspaceFile[]
) {
  await sandbox.writeFiles([
    ...supportFiles,
    {
      path: "package.json",
      content: SANDBOX_PACKAGE_JSON,
    },
    {
      path: "agent.mjs",
      content: SANDBOX_AGENT_SCRIPT,
    },
    {
      path: "request.json",
      content: JSON.stringify(payload, null, 2),
    },
  ]);
}

export async function runClaudeAgentInSandbox(
  prompt: string,
  apiKey: string,
  model = DEFAULT_SANDBOX_MODEL,
  attachments: RuntimeAttachment[] = []
) {
  let sandbox: Sandbox | null = null;
  const usesSnapshot = Boolean(SANDBOX_SNAPSHOT_ID);
  const claudeRuntimeCatalog = await discoverClaudeRuntimeCatalog();
  const attachmentHosts = getAttachmentNetworkHosts(attachments);

  try {
    if (usesSnapshot) {
      sandbox = await Sandbox.create({
        source: {
          type: "snapshot",
          snapshotId: SANDBOX_SNAPSHOT_ID!,
        },
        timeout: SANDBOX_TIMEOUT_MS,
        env: {
          ANTHROPIC_API_KEY: apiKey,
        },
        resources: { vcpus: 1 },
        networkPolicy: getInstallNetworkPolicy(
          true,
          claudeRuntimeCatalog.networkHosts,
          attachmentHosts
        ),
      });
    } else {
      sandbox = await Sandbox.create({
        runtime: "node22",
        timeout: SANDBOX_TIMEOUT_MS,
        env: {
          ANTHROPIC_API_KEY: apiKey,
        },
        resources: { vcpus: 1 },
        networkPolicy: getInstallNetworkPolicy(
          false,
          claudeRuntimeCatalog.networkHosts,
          attachmentHosts
        ),
      });
    }

    await writeSandboxFiles(sandbox, {
      prompt,
      model,
      maxTurns: 4,
      attachments,
    }, claudeRuntimeCatalog.files);

    if (!usesSnapshot) {
      await installSandboxDependencies(sandbox);
    }

    await verifyClaudeCodeCli(sandbox, usesSnapshot);

    const run = await sandbox.runCommand({
      cmd: "node",
      args: ["agent.mjs"],
      cwd: "/vercel/sandbox",
    });

    if (run.exitCode !== 0) {
      const stderr = (await run.stderr()).trim();
      throw new Error(stderr || "Claude Agent SDK execution failed.");
    }

    const stdout = (await run.stdout()).trim();
    const parsed = JSON.parse(stdout) as {
      result: string;
      sessionId?: string;
    };

    return {
      result: parsed.result,
      sessionId: parsed.sessionId ?? null,
      model,
    };
  } catch (error) {
    throw new Error(getReadableSandboxError(error, { usesSnapshot }));
  } finally {
    if (sandbox) {
      await sandbox.stop({ blocking: true }).catch(() => undefined);
    }
  }
}
