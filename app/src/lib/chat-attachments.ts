export interface AttachmentStoragePathInput {
  sessionId: string;
  attachmentId: string;
  originalName: string;
}

export function sanitizeAttachmentName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildAttachmentStoragePath({
  sessionId,
  attachmentId,
  originalName,
}: AttachmentStoragePathInput) {
  return `session/${sessionId}/${attachmentId}/${sanitizeAttachmentName(originalName)}`;
}
