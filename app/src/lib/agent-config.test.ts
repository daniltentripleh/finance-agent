import { describe, expect, it } from "vitest";
import {
  buildConversationPrompt,
  getApiKeyMode,
  normalizePrompt,
  resolveRuntimeApiKey,
} from "./agent-config";

describe("resolveRuntimeApiKey", () => {
  it("prefers the server API key when both are available", () => {
    expect(
      resolveRuntimeApiKey({
        serverApiKey: "server-key",
        browserApiKey: "browser-key",
      })
    ).toBe("server-key");
  });

  it("falls back to the browser API key when the server key is missing", () => {
    expect(
      resolveRuntimeApiKey({
        serverApiKey: "",
        browserApiKey: "browser-key",
      })
    ).toBe("browser-key");
  });

  it("returns null when no API key is available", () => {
    expect(
      resolveRuntimeApiKey({
        serverApiKey: undefined,
        browserApiKey: "   ",
      })
    ).toBeNull();
  });
});

describe("getApiKeyMode", () => {
  it("reports server mode when the deployment has a server key", () => {
    expect(
      getApiKeyMode({
        serverApiKey: "server-key",
        browserApiKey: "",
      })
    ).toBe("server");
  });

  it("reports browser mode when only a browser key exists", () => {
    expect(
      getApiKeyMode({
        serverApiKey: "",
        browserApiKey: "browser-key",
      })
    ).toBe("browser");
  });

  it("reports missing mode when neither key exists", () => {
    expect(
      getApiKeyMode({
        serverApiKey: "",
        browserApiKey: "",
      })
    ).toBe("missing");
  });
});

describe("normalizePrompt", () => {
  it("trims prompt input before sending it to the backend", () => {
    expect(normalizePrompt("  /earnings NVDA Q4 2024  ")).toBe(
      "/earnings NVDA Q4 2024"
    );
  });

  it("throws when the prompt is empty after trimming", () => {
    expect(() => normalizePrompt("   ")).toThrow("Prompt is required.");
  });
});

describe("buildConversationPrompt", () => {
  it("serializes prior messages into a transcript for the Agent SDK", () => {
    expect(
      buildConversationPrompt([
        { role: "user", content: "Run /earnings NVDA Q4 2024" },
        { role: "assistant", content: "What format do you want?" },
        { role: "user", content: "Give me a short summary." },
      ])
    ).toContain(
      "User: Run /earnings NVDA Q4 2024\n\nAssistant: What format do you want?\n\nUser: Give me a short summary."
    );
  });

  it("throws when every message is blank", () => {
    expect(() =>
      buildConversationPrompt([
        { role: "user", content: "   " },
        { role: "assistant", content: "" },
      ])
    ).toThrow("Prompt is required.");
  });

  it("prepends attachment context to the conversation prompt", () => {
    expect(
      buildConversationPrompt(
        [{ role: "user", content: "Summarize this file" }],
        [
          {
            id: "a1",
            originalName: "budget.xlsx",
            sandboxPath: ".attachments/budget.xlsx",
          },
        ]
      )
    ).toContain(
      "Attached files:\n- budget.xlsx => .attachments/budget.xlsx"
    );
  });
});
