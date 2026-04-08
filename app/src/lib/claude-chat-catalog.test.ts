import { describe, expect, it } from "vitest";
import {
  buildCatalogCapabilityGroups,
  formatCatalogForChat,
} from "./claude-chat-catalog";
import type { ClaudeUiCatalog } from "./claude-runtime-catalog";

const catalog: ClaudeUiCatalog = {
  plugins: [
    {
      id: "plugin-a",
      displayName: "Plugin A",
      description: "Plugin description",
      commandCount: 1,
      skillCount: 1,
      pluginPath: "plugins/plugin-a",
      marketplaceId: "test-marketplace",
    },
  ],
  commands: [
    {
      name: "/plugin-command",
      description: "Plugin command",
      category: "Plugin A",
      pluginId: "plugin-a",
      sourcePath: "plugins/plugin-a/commands/plugin-command.md",
    },
    {
      name: "/workspace-command",
      description: "Workspace command",
      category: "Workspace",
      sourcePath: ".claude/commands/workspace-command.md",
    },
  ],
  skills: [
    {
      name: "plugin-skill",
      description: "Plugin skill",
      pluginId: "plugin-a",
      sourcePath: "plugins/plugin-a/skills/plugin-skill/SKILL.md",
    },
  ],
};

describe("buildCatalogCapabilityGroups", () => {
  it("returns plugin and workspace groups with descriptions", () => {
    expect(buildCatalogCapabilityGroups(catalog)).toEqual([
      {
        heading: "Plugin A",
        plugin: catalog.plugins[0],
        description: "Plugin description",
        commands: [catalog.commands[0]],
        skills: [catalog.skills[0]],
      },
      {
        heading: "Workspace",
        description: "Local `.claude` commands and skills discovered at runtime.",
        commands: [catalog.commands[1]],
        skills: [],
      },
    ]);
  });
});

describe("formatCatalogForChat", () => {
  it("includes the grouped capability headings in the chat summary", () => {
    const text = formatCatalogForChat(catalog);

    expect(text).toContain("### Plugin A");
    expect(text).toContain("### Workspace");
  });
});
