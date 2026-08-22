#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm workspaces install; this also runs engine's `prepare` script, which
# builds engine/dist — both client and harness resolve @tidalix/engine there.
npm install
