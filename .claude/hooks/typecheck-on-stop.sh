#!/usr/bin/env bash
# Stop hook: block stopping while the project doesn't type-check.
# stop_hook_active guards against loops (second stop in a row always passes).
input="$(cat)"
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
out="$(npx --no-install tsc --noEmit 2>&1)"
if [ $? -ne 0 ]; then
  printf 'Type-check failed (npm run type-check). Fix these before stopping:\n%s\n' "$(printf '%s' "$out" | grep -E 'error TS' | head -30)" >&2
  exit 2
fi
exit 0
