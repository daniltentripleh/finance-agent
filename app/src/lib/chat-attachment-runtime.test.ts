import { describe, expect, it } from "vitest";
import {
  buildAttachmentManifest,
  buildRuntimeAttachmentPath,
} from "./chat-attachment-runtime";

describe("buildRuntimeAttachmentPath", () => {
  it("places attachments under the sandbox attachment directory", () => {
    expect(buildRuntimeAttachmentPath("Q1 model.xlsx")).toBe(
      ".attachments/q1-model.xlsx"
    );
  });
});

describe("buildAttachmentManifest", () => {
  it("returns a stable manifest payload for sandbox hydration", () => {
    expect(
      buildAttachmentManifest([
        {
          id: "a1",
          originalName: "budget.xlsx",
          mimeType: "application/vnd.ms-excel",
          byteSize: 2048,
          downloadUrl: "https://example.supabase.co/file.xlsx",
          sandboxPath: ".attachments/budget.xlsx",
        },
      ])
    ).toEqual([
      {
        id: "a1",
        originalName: "budget.xlsx",
        mimeType: "application/vnd.ms-excel",
        byteSize: 2048,
        downloadUrl: "https://example.supabase.co/file.xlsx",
        sandboxPath: ".attachments/budget.xlsx",
      },
    ]);
  });
});
