interface SupabaseServerEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  attachmentsBucket: string;
}

function requireValue(value: string | undefined, name: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`Missing required Supabase env var: ${name}`);
  }

  return trimmed;
}

export function getSupabaseServerEnv(
  env: Record<string, string | undefined>
): SupabaseServerEnv {
  return {
    url: requireValue(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireValue(
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    ),
    serviceRoleKey: requireValue(
      env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY"
    ),
    attachmentsBucket: requireValue(
      env.SUPABASE_ATTACHMENTS_BUCKET,
      "SUPABASE_ATTACHMENTS_BUCKET"
    ),
  };
}

export function getSupabaseServerEnvFromProcess() {
  return getSupabaseServerEnv(process.env);
}
