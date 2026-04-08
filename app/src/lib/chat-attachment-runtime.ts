import { sanitizeAttachmentName } from "./chat-attachments";

export interface PromptAttachmentContext {
  id: string;
  originalName: string;
  sandboxPath: string;
}

export interface RuntimeAttachment extends PromptAttachmentContext {
  mimeType?: string | null;
  byteSize?: number | null;
  downloadUrl: string;
}

interface StoredAttachmentRecord {
  id: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  byte_size: number | null;
  status: string;
}

function buildAttachmentContextBlock(attachments: PromptAttachmentContext[]) {
  if (attachments.length === 0) {
    return "";
  }

  const items = attachments
    .map((attachment) => `- ${attachment.originalName} => ${attachment.sandboxPath}`)
    .join("\n");

  return `Attached files:\n${items}\n\n`;
}

export function prependAttachmentContext(
  prompt: string,
  attachments: PromptAttachmentContext[]
) {
  return `${buildAttachmentContextBlock(attachments)}${prompt}`;
}

export function buildRuntimeAttachmentPath(originalName: string) {
  const normalizedName = sanitizeAttachmentName(originalName) || "attachment";
  return `.attachments/${normalizedName}`;
}

export function buildAttachmentManifest(attachments: RuntimeAttachment[]) {
  return attachments.map((attachment) => ({
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType ?? null,
    byteSize: attachment.byteSize ?? null,
    downloadUrl: attachment.downloadUrl,
    sandboxPath: attachment.sandboxPath,
  }));
}

export async function resolveRuntimeAttachments(
  supabase: any,
  input: {
    sessionId: string;
    attachmentIds: string[];
    signedUrlExpiresIn?: number;
  }
): Promise<RuntimeAttachment[]> {
  if (input.attachmentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      "id, session_id, storage_bucket, storage_path, original_name, mime_type, byte_size, status, deleted_at"
    )
    .eq("session_id", input.sessionId)
    .in("id", input.attachmentIds)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as StoredAttachmentRecord[];
  const recordMap = new Map(records.map((record) => [record.id, record]));

  return Promise.all(
    input.attachmentIds.map(async (attachmentId) => {
      const record = recordMap.get(attachmentId);

      if (!record) {
        throw new Error(`Attachment ${attachmentId} was not found for this session.`);
      }

      if (record.status !== "uploaded") {
        throw new Error(
          `Attachment ${record.original_name} is not ready to use yet.`
        );
      }

      const signedUrlResult = await supabase
        .storage
        .from(record.storage_bucket)
        .createSignedUrl(
          record.storage_path,
          input.signedUrlExpiresIn ?? 60 * 10
        );

      if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
        throw new Error(
          signedUrlResult.error?.message ||
            `Failed to sign ${record.original_name} for sandbox access.`
        );
      }

      return {
        id: record.id,
        originalName: record.original_name,
        mimeType: record.mime_type,
        byteSize: record.byte_size,
        downloadUrl: signedUrlResult.data.signedUrl,
        sandboxPath: buildRuntimeAttachmentPath(record.original_name),
      };
    })
  );
}
