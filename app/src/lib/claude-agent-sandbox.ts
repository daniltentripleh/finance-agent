import { Sandbox } from "@vercel/sandbox";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SANDBOX_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
const SANDBOX_SNAPSHOT_ID =
  process.env.VERCEL_SANDBOX_SNAPSHOT_ID?.trim() || null;
const CLAUDE_AGENT_SDK_VERSION = "0.2.92";
const CLAUDE_CODE_VERSION = "2.1.92";

const SANDBOX_PACKAGE_JSON = JSON.stringify(
  {
    name: "finance-agent-sandbox-runner",
    private: true,
    type: "module",
    dependencies: {
      "@anthropic-ai/claude-agent-sdk": CLAUDE_AGENT_SDK_VERSION,
      "@anthropic-ai/claude-code": CLAUDE_CODE_VERSION,
    },
  },
  null,
  2
);

const SANDBOX_AGENT_SCRIPT = `import { readFile } from "node:fs/promises";
import { query } from "@anthropic-ai/claude-agent-sdk";

const payload = JSON.parse(await readFile("./request.json", "utf8"));

let sessionId = null;
let finalResult = "";
let finalError = null;

for await (const message of query({
  prompt: payload.prompt,
  options: {
    cwd: process.cwd(),
    model: payload.model,
    maxTurns: payload.maxTurns,
    systemPrompt: payload.systemPrompt,
    tools: [],
    permissionMode: "dontAsk",
    pathToClaudeCodeExecutable: "./node_modules/.bin/claude",
    env: {
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
  console.error(JSON.stringify({ error: finalError, sessionId }));
  process.exit(1);
}

console.log(JSON.stringify({ result: finalResult, sessionId }));
`;

function getInstallNetworkPolicy(useSnapshot: boolean) {
  if (useSnapshot) {
    return { allow: ["api.anthropic.com"] };
  }

  return {
    allow: ["api.anthropic.com", "registry.npmjs.org"],
  };
}

function getReadableSandboxError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown sandbox error.";

  if (
    message.includes("Auth required") ||
    message.includes("VERCEL_OIDC_TOKEN") ||
    message.includes("oidc")
  ) {
    return "Vercel Sandbox authentication is not available. In local development, run `vercel link` and `vercel env pull` before using the agent route.";
  }

  return message;
}

async function installSandboxDependencies(sandbox: Sandbox) {
  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install"],
    cwd: "/vercel/sandbox",
  });

  if (install.exitCode !== 0) {
    throw new Error(
      `Sandbox dependency install failed:\n${await install.stderr()}`
    );
  }
}

async function writeSandboxFiles(
  sandbox: Sandbox,
  payload: { prompt: string; model: string; maxTurns: number; systemPrompt: string }
) {
  await sandbox.writeFiles([
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

export async function runClaudeAgentInSandbox(prompt: string, apiKey: string) {
  let sandbox: Sandbox | null = null;

  try {
    if (SANDBOX_SNAPSHOT_ID) {
      sandbox = await Sandbox.create({
        source: {
          type: "snapshot",
          snapshotId: SANDBOX_SNAPSHOT_ID,
        },
        timeout: SANDBOX_TIMEOUT_MS,
        env: {
          ANTHROPIC_API_KEY: apiKey,
        },
        resources: { vcpus: 1 },
        networkPolicy: getInstallNetworkPolicy(true),
      });
    } else {
      sandbox = await Sandbox.create({
        runtime: "node22",
        timeout: SANDBOX_TIMEOUT_MS,
        env: {
          ANTHROPIC_API_KEY: apiKey,
        },
        resources: { vcpus: 1 },
        networkPolicy: getInstallNetworkPolicy(false),
      });
    }

    await writeSandboxFiles(sandbox, {
      prompt,
      model: SANDBOX_MODEL,
      maxTurns: 4,
      systemPrompt: SYSTEM_PROMPT,
    });

    if (!SANDBOX_SNAPSHOT_ID) {
      await installSandboxDependencies(sandbox);
    }

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
    };
  } catch (error) {
    throw new Error(getReadableSandboxError(error));
  } finally {
    if (sandbox) {
      await sandbox.stop({ blocking: true }).catch(() => undefined);
    }
  }
}
