import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface SandboxWorkspaceFile {
  path: string;
  content: string;
}

export interface ClaudeCommandSummary {
  name: string;
  description: string;
  category: string;
  hint?: string;
  pluginId?: string;
  sourcePath: string;
}

export interface ClaudeSkillSummary {
  name: string;
  description: string;
  category: string;
  pluginId?: string;
  sourcePath: string;
}

export interface ClaudePluginSummary {
  id: string;
  marketplace: string;
  name: string;
  displayName: string;
  description: string;
  commandCount: number;
  skillCount: number;
}

export interface ClaudeRuntimeCatalog {
  plugins: ClaudePluginSummary[];
  commands: ClaudeCommandSummary[];
  skills: ClaudeSkillSummary[];
  files: SandboxWorkspaceFile[];
  networkHosts: string[];
}

export type ClaudeUiCatalog = Pick<
  ClaudeRuntimeCatalog,
  "plugins" | "commands" | "skills"
>;

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
    description?: string;
  }>;
}

interface ClaudePluginManifest {
  name?: string;
  description?: string;
}

interface ClaudeMcpConfig {
  mcpServers?: Record<
    string,
    {
      url?: string;
    }
  >;
}

interface FrontmatterValues {
  name?: string;
  description?: string;
  ["argument-hint"]?: string;
}

function toSandboxPath(relativePath: string) {
  return relativePath.split(path.sep).join("/");
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
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

async function readFrontmatter(filePath: string): Promise<FrontmatterValues> {
  const raw = await readFile(filePath, "utf8");

  if (!raw.startsWith("---")) {
    return {};
  }

  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) {
    return {};
  }

  const frontmatter = raw
    .slice(3, endIndex)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const values: FrontmatterValues = {};

  for (const line of frontmatter) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim() as keyof FrontmatterValues;
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function extractHostname(rawUrl?: string) {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

function humanizeName(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  return Array.from(allow).sort();
}

export async function discoverClaudeRuntimeCatalog(
  startDirectory = process.cwd()
): Promise<ClaudeRuntimeCatalog> {
  const workspaceRoot = await findClaudeWorkspaceRoot(startDirectory);

  if (!workspaceRoot) {
    return {
      plugins: [],
      commands: [],
      skills: [],
      files: [],
      networkHosts: [],
    };
  }

  const collectedFiles = new Map<string, string>();
  const networkHosts = new Set<string>();
  const commands: ClaudeCommandSummary[] = [];
  const skills: ClaudeSkillSummary[] = [];
  const plugins: ClaudePluginSummary[] = [];

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

  const collectCommands = async (
    commandsDirectory: string,
    category: string,
    pluginId?: string
  ) => {
    if (!(await pathExists(commandsDirectory))) return 0;

    const files = (await collectFilesRecursively(commandsDirectory)).filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".md"
    );

    for (const filePath of files) {
      const frontmatter = await readFrontmatter(filePath);
      const fileName = path.basename(filePath, ".md");

      commands.push({
        name: `/${fileName}`,
        description: frontmatter.description || humanizeName(fileName),
        category,
        hint: frontmatter["argument-hint"],
        pluginId,
        sourcePath: toSandboxPath(path.relative(workspaceRoot, filePath)),
      });
    }

    return files.length;
  };

  const collectSkills = async (
    skillsDirectory: string,
    category: string,
    pluginId?: string
  ) => {
    if (!(await pathExists(skillsDirectory))) return 0;

    const files = (await collectFilesRecursively(skillsDirectory)).filter(
      (filePath) => path.basename(filePath) === "SKILL.md"
    );

    for (const filePath of files) {
      const frontmatter = await readFrontmatter(filePath);
      const skillDirectoryName = path.basename(path.dirname(filePath));

      skills.push({
        name: frontmatter.name || skillDirectoryName,
        description:
          frontmatter.description || humanizeName(skillDirectoryName),
        category,
        pluginId,
        sourcePath: toSandboxPath(path.relative(workspaceRoot, filePath)),
      });
    }

    return files.length;
  };

  const settingsPath = path.join(workspaceRoot, ".claude", "settings.json");
  if (!(await pathExists(settingsPath))) {
    return {
      plugins: [],
      commands: [],
      skills: [],
      files: [],
      networkHosts: [],
    };
  }

  await addFile(settingsPath);
  await addFile(path.join(workspaceRoot, ".claude", "settings.local.json"));
  await addDirectory(path.join(workspaceRoot, ".claude", "commands"));
  await addDirectory(path.join(workspaceRoot, ".claude", "skills"));

  await collectCommands(
    path.join(workspaceRoot, ".claude", "commands"),
    "Workspace"
  );
  await collectSkills(path.join(workspaceRoot, ".claude", "skills"), "Workspace");

  const settings = await readJsonFile<ClaudeSettings>(settingsPath);
  const enabledPlugins = Object.entries(settings.enabledPlugins ?? {})
    .filter(([, enabled]) => enabled)
    .sort(([left], [right]) => left.localeCompare(right));

  const copiedMarketplaces = new Set<string>();

  for (const [pluginKey] of enabledPlugins) {
    const separatorIndex = pluginKey.lastIndexOf("@");
    if (separatorIndex <= 0 || separatorIndex === pluginKey.length - 1) {
      continue;
    }

    const pluginName = pluginKey.slice(0, separatorIndex);
    const marketplaceName = pluginKey.slice(separatorIndex + 1);
    const marketplaceConfig =
      settings.extraKnownMarketplaces?.[marketplaceName]?.source;

    if (
      !marketplaceConfig?.path ||
      marketplaceConfig.source !== "directory"
    ) {
      continue;
    }

    const marketplaceRoot = path.resolve(workspaceRoot, marketplaceConfig.path);
    const marketplaceManifestPath = path.join(
      marketplaceRoot,
      ".claude-plugin",
      "marketplace.json"
    );

    if (!(await pathExists(marketplaceManifestPath))) {
      continue;
    }

    if (!copiedMarketplaces.has(marketplaceManifestPath)) {
      await addFile(marketplaceManifestPath);
      copiedMarketplaces.add(marketplaceManifestPath);
    }

    const marketplaceManifest =
      await readJsonFile<ClaudeMarketplaceManifest>(marketplaceManifestPath);
    const marketplacePlugin = marketplaceManifest.plugins?.find(
      (plugin) => plugin.name === pluginName
    );

    if (!marketplacePlugin?.source) {
      continue;
    }

    const pluginRoot = path.resolve(marketplaceRoot, marketplacePlugin.source);
    if (!(await pathExists(pluginRoot))) {
      continue;
    }

    await addDirectory(pluginRoot);

    const pluginManifestPath = path.join(
      pluginRoot,
      ".claude-plugin",
      "plugin.json"
    );
    const pluginManifest = (await pathExists(pluginManifestPath))
      ? await readJsonFile<ClaudePluginManifest>(pluginManifestPath)
      : null;

    const displayName = humanizeName(pluginManifest?.name || pluginName);
    const pluginId = `${pluginName}@${marketplaceName}`;
    const commandCount = await collectCommands(
      path.join(pluginRoot, "commands"),
      displayName,
      pluginId
    );
    const skillCount = await collectSkills(
      path.join(pluginRoot, "skills"),
      displayName,
      pluginId
    );

    plugins.push({
      id: pluginId,
      marketplace: marketplaceName,
      name: pluginName,
      displayName,
      description:
        pluginManifest?.description ||
        marketplacePlugin.description ||
        `${displayName} plugin`,
      commandCount,
      skillCount,
    });

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
    plugins,
    commands: commands.sort((left, right) => left.name.localeCompare(right.name)),
    skills: skills.sort((left, right) => left.name.localeCompare(right.name)),
    files: Array.from(collectedFiles, ([sandboxPath, content]) => ({
      path: sandboxPath,
      content,
    })).sort((left, right) => left.path.localeCompare(right.path)),
    networkHosts: Array.from(networkHosts).sort(),
  };
}
