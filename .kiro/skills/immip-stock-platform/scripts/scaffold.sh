#!/usr/bin/env bash
# Recreate the IMMIP app (exact copy of the original source) in a target directory.
# Usage: scaffold.sh <target-dir> [--no-install]
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$SKILL_DIR/template"
TARGET="${1:-}"
INSTALL=1
[[ "${2:-}" == "--no-install" ]] && INSTALL=0

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <target-dir> [--no-install]" >&2
  exit 1
fi

if [[ -e "$TARGET" && -n "$(ls -A "$TARGET" 2>/dev/null)" ]]; then
  echo "Refusing to overwrite non-empty directory: $TARGET" >&2
  exit 1
fi

mkdir -p "$TARGET"
cp -a "$TEMPLATE/." "$TARGET/"
[[ -f "$TARGET/.env" ]] || cp "$TARGET/.env.example" "$TARGET/.env"

echo "Copied $(find "$TARGET" -type f | wc -l) files to $TARGET"

if [[ $INSTALL -eq 1 ]]; then
  (cd "$TARGET" && npm install)
fi

echo "Done. Start with: cd \"$TARGET\" && npm run dev   (http://localhost:3000)"
