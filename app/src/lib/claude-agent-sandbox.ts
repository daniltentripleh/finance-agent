import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { SYSTEM_PROMPT } from "./system-prompt";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SANDBOX_SNAPSHOT_ID =
  process.env.VERCEL_SANDBOX_SNAPSHOT_ID?.trim() || null;
const CLAUDE_AGENT_SDK_VERSION = "0.2.92";
const CLAUDE_CODE_VERSION = "2.1.92";
const DEFAULT_SANDBOX_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

interface SandboxWorkspaceFile {
  path: string;
  content: string;
}

interface ClaudeDesktopContext {
  files: SandboxWorkspaceFile[];
  networkHosts: string[];
}

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<
    string,
    {
      source?: {
        source?: string;
        path?: string;
      };
    }
  >;
}

interface ClaudeMarketplaceManifest {
  plugins?: Array<{
    name?: string;
    source?: string;
  }>;
}

interface ClaudeMcpConfig {
  mcpServers?: Record<
    string,
    {
      url?: string;
    }
  >;
}

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
  return `import { readFile } from "node:fs/promises";
import { query } from "@anthropic-ai/claude-agent-sdk";

const payload = JSON.parse(await readFile("./request.json", "utf8"));

let sessionId = null;
let finalResult = "";
let finalError = null;

try {
  for await (const message of query({
    prompt: payload.prompt,
    options: {
      cwd: process.cwd(),
      model: payload.model,
      maxTurns: payload.maxTurns,
      systemPrompt: payload.systemPrompt,
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

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function toSandboxPath(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}

async function readJsonFile<T>(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function collectFilesRecursively(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursively(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function findClaudeWorkspaceRoot(startDirectory = process.cwd()) {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (
      await pathExists(path.join(currentDirectory, ".claude", "settings.json"))
    ) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function extractHostname(rawUrl?: string) {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

export function buildSandboxNetworkAllowList(
  useSnapshot: boolean,
  pluginHosts: string[] = []
) {
  const allow = new Set<string>(["api.anthropic.com"]);

  for (const host of pluginHosts) {
    const normalizedHost = host.trim();
    if (!normalizedHost) continue;
    allow.add(normalizedHost);
  }

  if (!useSnapshot) {
    allow.add("registry.npmjs.org");
  }

  return Array.from(allow);
}

function getInstallNetworkPolicy(useSnapshot: boolean, pluginHosts: string[]) {
  return {
    allow: buildSandboxNetworkAllowList(useSnapshot, pluginHosts),
  };
}

export async function collectClaudeDesktopContext(
  startDirectory = process.cwd()
): Promise<ClaudeDesktopContext> {
  const workspaceRoot = await findClaudeWorkspaceRoot(startDirectory);
  if (!workspaceRoot) {
    return { files: [], networkHosts: [] };
  }

  const collectedFiles = new Map<string, string>();
  const networkHosts = new Set<string>();

  const addFile = async (absolutePath: string) => {
    if (!(await pathExists(absolutePath))) return;

    const relativePath = path.relative(workspaceRoot, absolutePath);
    collectedFiles.set(
      toSandboxPath(relativePath),
      await readFile(absolutePath, "utf8")
    );
  };

  const addDirectory = async (absolutePath: string) => {
    if (!(await pathExists(absolutePath))) return;

    for (const filePath of await collectFilesRecursively(absolutePath)) {
      await addFile(filePath);
    }
  };

  const settingsPath = path.join(workspaceRoot, ".claude", "settings.json");
  if (!(await pathExists(settingsPath))) {
    return { files: [], networkHosts: [] };
  }

  await addFile(settingsPath);
  await addFile(path.join(workspaceRoot, ".claude", "settings.local.json"));
  await addDirectory(path.join(workspaceRoot, ".claude", "skills"));
  await addDirectory(path.join(workspaceRoot, ".claude", "commands"));

  const settings = await readJsonFile<ClaudeSettings>(settingsPath);
  const enabledPlugins = Object.entries(settings.enabledPlugins ?? {}).filter(
    ([, isEnabled]) => isEnabled
  );

  for (const [pluginKey] of enabledPlugins) {
    const separatorIndex = pluginKey.lastIndexOf("@");
    if (separatorIndex <= 0 || separatorIndex === pluginKey.length - 1) {
      continue;
    }

    const pluginName = pluginKey.slice(0, separatorIndex);
    const marketplaceName = pluginKey.slice(separatorIndex + 1);
    const marketplacePath =
      settings.extraKnownMarketplaces?.[marketplaceName]?.source?.path;
    const marketplaceSourceType =
      settings.extraKnownMarketplaces?.[marketplaceName]?.source?.source;

    if (!marketplacePath || marketplaceSourceType !== "directory") {
      continue;
    }

    const marketplaceRoot = path.resolve(workspaceRoot, marketplacePath);
    const marketplaceManifestPath = path.join(
      marketplaceRoot,
      ".claude-plugin",
      "marketplace.json"
    );

    if (!(await pathExists(marketplaceManifestPath))) {
      continue;
    }

    await addFile(marketplaceManifestPath);

    const marketplaceManifest =
      await readJsonFile<ClaudeMarketplaceManifest>(marketplaceManifestPath);
    const pluginSource = marketplaceManifest.plugins?.find(
      (plugin) => plugin.name === pluginName
    )?.source;

    if (!pluginSource) {
      continue;
    }

    const pluginRoot = path.resolve(marketplaceRoot, pluginSource);
    if (!(await pathExists(pluginRoot))) {
      continue;
    }

    await addDirectory(pluginRoot);

    const mcpConfigPath = path.join(pluginRoot, ".mcp.json");
    if (!(await pathExists(mcpConfigPath))) {
      continue;
    }

    const mcpConfig = await readJsonFile<ClaudeMcpConfig>(mcpConfigPath);
    for (const server of Object.values(mcpConfig.mcpServers ?? {})) {
      const hostname = extractHostname(server.url);
      if (hostname) {
        networkHosts.add(hostname);
      }
    }
  }

  return {
    files: Array.from(collectedFiles, ([sandboxPath, content]) => ({
      path: sandboxPath,
      content,
    })),
    networkHosts: Array.from(networkHosts),
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
  payload: { prompt: string; model: string; maxTurns: number; systemPrompt: string },
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
  model = DEFAULT_SANDBOX_MODEL
) {
  let sandbox: Sandbox | null = null;
  const usesSnapshot = Boolean(SANDBOX_SNAPSHOT_ID);
  const claudeDesktopContext = await collectClaudeDesktopContext();

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
          claudeDesktopContext.networkHosts
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
          claudeDesktopContext.networkHosts
        ),
      });
    }

    await writeSandboxFiles(sandbox, {
      prompt,
      model,
      maxTurns: 4,
      systemPrompt: SYSTEM_PROMPT,
    }, claudeDesktopContext.files);

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
