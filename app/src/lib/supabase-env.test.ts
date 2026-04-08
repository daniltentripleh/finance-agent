import { describe, expect, it } from "vitest";
import { getSupabaseServerEnv } from "./supabase-env";

describe("getSupabaseServerEnv", () => {
  it("returns the required Supabase values when all env vars are present", () => {
    expect(
      getSupabaseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ATTACHMENTS_BUCKET: "chat-attachments",
      })
    ).toMatchObject({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: "service-role-key",
      attachmentsBucket: "chat-attachments",
    });
  });

  it("throws when a required env var is missing", () => {
    expect(() =>
      getSupabaseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ATTACHMENTS_BUCKET: "chat-attachments",
      })
    ).toThrow("Missing required Supabase env var: NEXT_PUBLIC_SUPABASE_URL");
  });
});
