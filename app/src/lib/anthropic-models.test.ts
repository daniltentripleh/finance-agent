import { describe, expect, it } from "vitest";
import {
  mergeAnthropicModels,
  pickDefaultModelId,
  type AnthropicModelsPage,
} from "./anthropic-models";

describe("mergeAnthropicModels", () => {
  it("keeps newest models first while deduplicating repeated ids", () => {
    const pages: AnthropicModelsPage[] = [
      {
        data: [
          {
            id: "claude-sonnet-4-20250514",
            display_name: "Claude Sonnet 4",
            created_at: "2025-05-14T00:00:00Z",
            type: "model",
          },
          {
            id: "claude-opus-4-20250514",
            display_name: "Claude Opus 4",
            created_at: "2025-05-14T00:00:00Z",
            type: "model",
          },
        ],
        first_id: "claude-sonnet-4-20250514",
        last_id: "claude-opus-4-20250514",
        has_more: true,
      },
      {
        data: [
          {
            id: "claude-opus-4-20250514",
            display_name: "Claude Opus 4",
            created_at: "2025-05-14T00:00:00Z",
            type: "model",
          },
          {
            id: "claude-haiku-3-5-20241022",
            display_name: "Claude Haiku 3.5",
            created_at: "2024-10-22T00:00:00Z",
            type: "model",
          },
        ],
        first_id: "claude-opus-4-20250514",
        last_id: "claude-haiku-3-5-20241022",
        has_more: false,
      },
    ];

    expect(mergeAnthropicModels(pages)).toEqual([
      {
        id: "claude-opus-4-20250514",
        displayName: "Claude Opus 4",
        createdAt: "2025-05-14T00:00:00Z",
      },
      {
        id: "claude-sonnet-4-20250514",
        displayName: "Claude Sonnet 4",
        createdAt: "2025-05-14T00:00:00Z",
      },
      {
        id: "claude-haiku-3-5-20241022",
        displayName: "Claude Haiku 3.5",
        createdAt: "2024-10-22T00:00:00Z",
      },
    ]);
  });
});

describe("pickDefaultModelId", () => {
  const models = [
    {
      id: "claude-opus-4-20250514",
      displayName: "Claude Opus 4",
      createdAt: "2025-05-14T00:00:00Z",
    },
    {
      id: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      createdAt: "2025-05-14T00:00:00Z",
    },
  ];

  it("uses the preferred model when it exists", () => {
    expect(
      pickDefaultModelId(models, "claude-sonnet-4-20250514")
    ).toBe("claude-sonnet-4-20250514");
  });

  it("falls back to the first available model when the preferred one is missing", () => {
    expect(pickDefaultModelId(models, "claude-haiku-3-5-20241022")).toBe(
      "claude-opus-4-20250514"
    );
  });

  it("returns null when no models are available", () => {
    expect(pickDefaultModelId([], "claude-sonnet-4-20250514")).toBeNull();
  });
});
