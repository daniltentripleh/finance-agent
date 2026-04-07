#!/bin/bash
# Run this before docker build to copy your .claude plugins into the project directory
# so the Docker image includes them

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/project"

echo "==> Setting up project directory with .claude plugins..."

mkdir -p "${PROJECT_DIR}/.claude"
mkdir -p "${PROJECT_DIR}/.agents"

# Copy .claude settings
if [ -f "../.claude/settings.json" ]; then
  cp "../.claude/settings.json" "${PROJECT_DIR}/.claude/settings.json"
  echo "  Copied .claude/settings.json"
fi

# Copy agents/plugins/skills
if [ -d "../.agents" ]; then
  cp -r "../.agents/plugins" "${PROJECT_DIR}/.agents/plugins" 2>/dev/null || true
  cp -r "../.agents/skills" "${PROJECT_DIR}/.agents/skills" 2>/dev/null || true
  echo "  Copied .agents/ directory"
fi

echo "==> Done! Project directory ready at ${PROJECT_DIR}"
echo "    Now run: docker build -t finance-agent ."
