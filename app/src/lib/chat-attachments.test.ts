import { describe, expect, it } from "vitest";
import {
  buildAttachmentStoragePath,
  sanitizeAttachmentName,
} from "./chat-attachments";

describe("sanitizeAttachmentName", () => {
  it("normalizes attachment names for storage paths", () => {
    expect(sanitizeAttachmentName("Q1 model.xlsx")).toBe("q1-model.xlsx");
  });
});

describe("buildAttachmentStoragePath", () => {
  it("places files under the session and attachment ids", () => {
    expect(
      buildAttachmentStoragePath({
        sessionId: "session-1",
        attachmentId: "attachment-1",
        originalName: "Q1 model.xlsx",
      })
    ).toBe("session/session-1/attachment-1/q1-model.xlsx");
  });
});
