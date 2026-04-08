# Chat Attachments With Supabase Design

## Summary

Add file attachments to the chat composer with a leading `+` button inside the existing terminal-style input bar. Selected files upload immediately to Supabase Storage, attachment metadata is stored in Supabase Postgres, and the current anonymous browser session owns those attachments. On send, the app resolves selected attachment ids, materializes the files inside the Claude sandbox workspace, and includes them in the run context.

## Goals

- Let users attach files from the chat composer with a clear `+` affordance.
- Persist attachments across refreshes for the current anonymous session.
- Store file bytes in Supabase Storage and metadata in Postgres.
- Keep the schema compatible with future authenticated users.
- Make attachments available to the sandbox as real workspace files.

## Non-Goals

- Persist full chat transcripts in this phase.
- Add full Supabase Auth in this phase.
- Support collaborative shared sessions in this phase.

## UX Design

### Composer pattern

- Add a leading `+` button at the far left inside the existing composer.
- Keep the current model select, text input, and `Run` button layout.
- Show attachment chips directly below the composer after selection.

### Attachment states

- `uploading`: chip appears immediately after file selection.
- `ready`: upload completed successfully and file can be included in send.
- `failed`: upload failed; chip offers retry/remove actions.

### Expected interactions

- Clicking `+` opens a hidden file input.
- Files begin uploading immediately after selection.
- Users can remove an uploaded file before send.
- Only `ready` attachments are included in the chat request.

## Session Model

### Ownership

- Use anonymous browser sessions for now.
- Store a `chat_sessions` row for each session.
- Keep `user_id` nullable so the schema can support authenticated users later without a rewrite.

### Session lifecycle

- On first load, the app ensures a session exists through a session bootstrap API route.
- The browser receives an `HttpOnly` cookie containing the session id.
- Session bootstrap also returns any active attachments already associated with that session.

## Data Model

### `chat_sessions`

Suggested columns:

- `id uuid primary key`
- `user_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `last_active_at timestamptz not null default now()`

### `chat_attachments`

Suggested columns:

- `id uuid primary key`
- `session_id uuid not null references chat_sessions(id)`
- `storage_bucket text not null`
- `storage_path text not null unique`
- `original_name text not null`
- `mime_type text null`
- `byte_size bigint null`
- `status text not null`
- `sha256 text null`
- `uploaded_at timestamptz null`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz null`
- `last_used_at timestamptz null`

Suggested status values:

- `pending`
- `uploaded`
- `failed`
- `deleted`

### Storage layout

- Create one private Supabase Storage bucket, e.g. `chat-attachments`.
- Use object paths shaped like `session/<session_id>/<attachment_id>/<sanitized_filename>`.

This keeps cleanup simple and makes future user migration straightforward.

## API Design

### `POST /api/chat/session`

Responsibilities:

- Ensure an anonymous session exists.
- Set the secure session cookie.
- Return active attachments for that session.

### `POST /api/attachments/sign`

Responsibilities:

- Verify the current anonymous session.
- Create a `pending` attachment row.
- Return the attachment id, storage path, and signed upload URL.

### `POST /api/attachments/complete`

Responsibilities:

- Verify the attachment belongs to the current session.
- Confirm the uploaded object exists.
- Persist final metadata such as mime type and byte size.
- Mark the row as `uploaded`.

### `DELETE /api/attachments/:id`

Responsibilities:

- Verify ownership through the session cookie.
- Soft-delete the metadata row.
- Remove the object from Supabase Storage.

### `POST /api/chat`

Add support for:

- `attachmentIds: string[]`

Responsibilities:

- Verify that every attachment id belongs to the current session and is in `uploaded` state.
- Generate short-lived signed download URLs.
- Pass attachment descriptors into the sandbox bootstrap flow.

## Runtime Integration

### Materializing attachments in the sandbox

- Before Claude runs, the server resolves selected attachment ids.
- The sandbox bootstrap downloads the files into a workspace directory such as `/vercel/sandbox/.attachments/`.
- The bootstrap also writes a small manifest describing the local file paths, original filenames, mime types, and sizes.

### Why this approach

- Claude receives real files in the workspace instead of only filenames or raw inline blobs.
- The server keeps access control centralized through short-lived signed URLs.
- Large files do not travel through the prompt body.

## Recommended Implementation Approach

Use direct signed client uploads.

Flow:

1. User picks files in the browser.
2. The browser asks the app for signed upload URLs.
3. The browser uploads file bytes directly to Supabase Storage.
4. The browser confirms completion with the app.
5. The app stores attachment ids in local UI state.
6. On send, the app submits `attachmentIds` with the prompt.

## Alternative Approaches Considered

### Server-proxied uploads

Pros:

- Slightly simpler client code.

Cons:

- Pushes all file transfer load through the Next.js server.
- Less scalable for larger files.

### Upload on send only

Pros:

- Fewer moving parts before submit.

Cons:

- Slower perceived send.
- Worse refresh recovery.
- More likely to fail late in the interaction.

## Supabase Provisioning

Provisioning will be handled during implementation.

Planned actions:

- Create a new Supabase project through browser automation with Playwright.
- Create the private storage bucket.
- Create the required Postgres tables, indexes, and policies.
- Add the Supabase environment variables to the app.

Expected environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ATTACHMENTS_BUCKET`

## Failure Handling

- If a file upload fails, keep the chip visible with retry/remove options.
- If attachment validation fails at send time, reject the request before sandbox execution starts.
- If an attachment is deleted, mark its metadata row as soft-deleted and remove the corresponding object from storage.

## Testing Strategy

### Unit tests

- Session ownership checks.
- Attachment validation and filtering.
- Chat payload shaping with `attachmentIds`.
- Sandbox attachment manifest generation.

### Browser verification

- Select file.
- Upload completes.
- Ready chip appears.
- Send prompt with attachment ids.
- Verify attachment is materialized in the sandbox flow.

## Open Decisions Deferred

- File size limits and allowed MIME types.
- Whether to compute and enforce deduplication via `sha256`.
- Whether to persist chat message history in Supabase later.

## Implementation Notes

- No full Supabase Auth in this phase.
- Keep the current terminal-style visual language.
- Do not store raw file bytes in Postgres rows.
