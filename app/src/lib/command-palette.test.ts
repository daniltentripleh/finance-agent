import { describe, expect, it } from "vitest";
import {
  getCommandCompletionValue,
  getCommandPaletteMatches,
} from "./command-palette";
import type { ClaudeCommandSummary } from "./claude-runtime-catalog";

const commands: ClaudeCommandSummary[] = [
  {
    name: "/catalysts",
    description: "View or update the catalyst calendar",
    category: "Equity Research",
    sourcePath: "plugins/equity-research/commands/catalysts.md",
  },
  {
    name: "/dcf",
    description: "Build a DCF valuation model",
    category: "Financial Analysis",
    sourcePath: "plugins/financial-analysis/commands/dcf.md",
  },
  {
    name: "/teaser",
    description: "Draft a teaser",
    category: "Investment Banking",
    sourcePath: "plugins/investment-banking/commands/teaser.md",
  },
];

describe("getCommandPaletteMatches", () => {
  it("returns the leading commands when the slash filter is empty", () => {
    expect(getCommandPaletteMatches(commands, "")).toEqual(commands);
  });

  it("filters commands by name, description, or category", () => {
    expect(getCommandPaletteMatches(commands, "cata")).toEqual([commands[0]]);
    expect(getCommandPaletteMatches(commands, "valuation")).toEqual([
      commands[1],
    ]);
    expect(getCommandPaletteMatches(commands, "banking")).toEqual([
      commands[2],
    ]);
  });
});

describe("getCommandCompletionValue", () => {
  it("formats the completed slash command for the chat input", () => {
    expect(getCommandCompletionValue(commands[0])).toBe("/catalysts ");
  });
});
