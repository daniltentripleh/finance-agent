import type {
  ClaudeCommandSummary,
  ClaudePluginSummary,
  ClaudeSkillSummary,
  ClaudeUiCatalog,
} from "@/lib/claude-runtime-catalog";

export interface CatalogCapabilityGroup {
  heading: string;
  plugin?: ClaudePluginSummary;
  description: string;
  commands: ClaudeCommandSummary[];
  skills: ClaudeSkillSummary[];
}

export function buildCatalogCapabilityGroups(catalog: ClaudeUiCatalog) {
  const groups: CatalogCapabilityGroup[] = catalog.plugins.map((plugin) => ({
    heading: plugin.displayName,
    plugin,
    description: plugin.description,
    commands: catalog.commands.filter((command) => command.pluginId === plugin.id),
    skills: catalog.skills.filter((skill) => skill.pluginId === plugin.id),
  }));

  const workspaceCommands = catalog.commands.filter((command) => !command.pluginId);
  const workspaceSkills = catalog.skills.filter((skill) => !skill.pluginId);

  if (workspaceCommands.length > 0 || workspaceSkills.length > 0) {
    groups.push({
      heading: "Workspace",
      description: "Local `.claude` commands and skills discovered at runtime.",
      commands: workspaceCommands,
      skills: workspaceSkills,
    });
  }

  return groups.filter(
    (group) => group.commands.length > 0 || group.skills.length > 0
  );
}

export function formatCatalogForChat(catalog: ClaudeUiCatalog) {
  const capabilityGroups = buildCatalogCapabilityGroups(catalog);

  if (capabilityGroups.length === 0) {
    return "No runtime plugins, commands, or skills were discovered.";
  }

  const lines = [
    "## Available runtime capabilities",
    "",
    `Discovered ${catalog.plugins.length} enabled plugins, ${catalog.commands.length} commands, and ${catalog.skills.length} skills from the live workspace.`,
    "",
  ];

  for (const group of capabilityGroups) {
    lines.push(`### ${group.heading}`);

    if (group.commands.length > 0) {
      lines.push(
        `- Commands: ${group.commands.map((command) => `\`${command.name}\``).join(", ")}`
      );
    }

    if (group.skills.length > 0) {
      lines.push(
        `- Skills: ${group.skills.map((skill) => `\`${skill.name}\``).join(", ")}`
      );
    }

    lines.push("");
  }

  lines.push("Ask with a slash command or describe the task in plain English.");

  return lines.join("\n");
}
