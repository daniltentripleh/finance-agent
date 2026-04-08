export interface AttachmentStoragePathInput {
  sessionId: string;
  attachmentId: string;
  originalName: string;
}

export interface PendingAttachmentRecordInput extends AttachmentStoragePathInput {
  bucket: string;
  mimeType?: string;
  byteSize?: number;
}

export interface ChatAttachmentRecord {
  id: string;
  session_id: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  byte_size: number | null;
  status: string;
  uploaded_at?: string | null;
  deleted_at?: string | null;
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

export function buildPendingAttachmentRecord({
  sessionId,
  attachmentId,
  bucket,
  originalName,
  mimeType,
  byteSize,
}: PendingAttachmentRecordInput) {
  if (!sessionId.trim()) {
    throw new Error("A valid session id is required to create an attachment.");
  }

  return {
    id: attachmentId,
    session_id: sessionId,
    storage_bucket: bucket,
    storage_path: buildAttachmentStoragePath({
      sessionId,
      attachmentId,
      originalName,
    }),
    original_name: originalName,
    mime_type: mimeType ?? null,
    byte_size: byteSize ?? null,
    status: "pending",
  };
}

export function mapAttachmentRecordToClient(record: ChatAttachmentRecord) {
  return {
    id: record.id,
    originalName: record.original_name,
    mimeType: record.mime_type,
    byteSize: record.byte_size,
    status: record.status,
  };
}

export async function listActiveAttachmentsForSession(
  supabase: any,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      "id, session_id, storage_bucket, storage_path, original_name, mime_type, byte_size, status, uploaded_at, deleted_at"
    )
    .eq("session_id", sessionId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapAttachmentRecordToClient);
}

export async function createSignedUploadForAttachment(
  supabase: any,
  input: PendingAttachmentRecordInput
) {
  const record = buildPendingAttachmentRecord(input);
  const insertResult = await supabase.from("chat_attachments").insert(record);

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  const uploadResult = await supabase
    .storage
    .from(input.bucket)
    .createSignedUploadUrl(record.storage_path);

  if (uploadResult.error || !uploadResult.data) {
    throw new Error(
      uploadResult.error?.message || "Failed to create a signed upload URL."
    );
  }

  return {
    attachment: mapAttachmentRecordToClient(record),
    upload: {
      path: uploadResult.data.path,
      token: uploadResult.data.token,
      signedUrl: uploadResult.data.signedUrl,
    },
  };
}

export async function markAttachmentUploaded(
  supabase: any,
  input: { attachmentId: string; sessionId: string }
) {
  const { data, error } = await supabase
    .from("chat_attachments")
    .update({
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", input.attachmentId)
    .eq("session_id", input.sessionId)
    .select(
      "id, session_id, storage_bucket, storage_path, original_name, mime_type, byte_size, status, uploaded_at, deleted_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Attachment not found.");
  }

  return mapAttachmentRecordToClient(data);
}

export async function deleteAttachmentForSession(
  supabase: any,
  input: { attachmentId: string; sessionId: string }
) {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      "id, session_id, storage_bucket, storage_path, original_name, mime_type, byte_size, status, uploaded_at, deleted_at"
    )
    .eq("id", input.attachmentId)
    .eq("session_id", input.sessionId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Attachment not found.");
  }

  const removeResult = await supabase
    .storage
    .from(data.storage_bucket)
    .remove([data.storage_path]);

  if (removeResult.error) {
    throw new Error(removeResult.error.message);
  }

  const updateResult = await supabase
    .from("chat_attachments")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", input.attachmentId)
    .eq("session_id", input.sessionId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}
