import type { ClaudeCommandSummary } from "@/lib/claude-runtime-catalog";

export function getCommandPaletteMatches(
  commands: ClaudeCommandSummary[],
  filter: string
) {
  if (!filter) {
    return commands.slice(0, 10);
  }

  const query = filter.toLowerCase();

  return commands
    .filter(
      (command) =>
        command.name.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query) ||
        command.category.toLowerCase().includes(query)
    )
    .slice(0, 8);
}

export function getCommandCompletionValue(command: ClaudeCommandSummary) {
  return `${command.name} `;
}
