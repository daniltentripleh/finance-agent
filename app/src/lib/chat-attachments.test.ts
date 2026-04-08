import { describe, expect, it } from "vitest";
import {
  buildAttachmentStoragePath,
  buildPendingAttachmentRecord,
  mergeAttachmentState,
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

describe("buildPendingAttachmentRecord", () => {
  it("rejects attachment creation without a session id", () => {
    expect(() =>
      buildPendingAttachmentRecord({
        sessionId: "",
        attachmentId: "attachment-1",
        bucket: "chat-attachments",
        originalName: "Q1 model.xlsx",
      })
    ).toThrow("A valid session id is required to create an attachment.");
  });

  it("creates a pending record with a storage path", () => {
    expect(
      buildPendingAttachmentRecord({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        attachmentId: "attachment-1",
        bucket: "chat-attachments",
        originalName: "Q1 model.xlsx",
        mimeType: "application/vnd.ms-excel",
        byteSize: 2048,
      })
    ).toMatchObject({
      id: "attachment-1",
      session_id: "550e8400-e29b-41d4-a716-446655440000",
      storage_bucket: "chat-attachments",
      original_name: "Q1 model.xlsx",
      mime_type: "application/vnd.ms-excel",
      byte_size: 2048,
      status: "pending",
      storage_path:
        "session/550e8400-e29b-41d4-a716-446655440000/attachment-1/q1-model.xlsx",
    });
  });
});

describe("mergeAttachmentState", () => {
  it("replaces a pending attachment with its uploaded state", () => {
    expect(
      mergeAttachmentState(
        [{ id: "a1", status: "uploading", originalName: "budget.xlsx" }],
        { id: "a1", status: "ready", originalName: "budget.xlsx" }
      )
    ).toEqual([{ id: "a1", status: "ready", originalName: "budget.xlsx" }]);
  });
});
