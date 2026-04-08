import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "./plugins/**/*",
      "./plugins/**/.claude-plugin/**/*",
      "./plugins/**/.mcp.json",
    ],
  },
  outputFileTracingExcludes: {
    "/*": ["./plugins/**/.git/**/*"],
  },
};

export default nextConfig;
