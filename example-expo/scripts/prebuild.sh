#!/usr/bin/env bash
# Regenerates ios/ and android/ from app.config.js + the config plugin, then
# installs pods. Both native folders are gitignored — they are build output of
# the plugin, and re-running this is how the plugin is verified.
set -euo pipefail

# --no-pods generates the native projects only. CI's Linux prebuild job needs
# it no more than the `uname` guard below does, but the macOS job that only
# wants the Android half does.
PODS=1
for argument in "$@"; do
  case "$argument" in
    --no-pods) PODS=0 ;;
    *) echo "usage: prebuild.sh [--no-pods]" >&2; exit 2 ;;
  esac
done

EXAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$EXAMPLE_DIR"

echo "==> expo prebuild --clean --no-install"
npx expo prebuild --clean --no-install

if [[ $PODS -eq 0 ]]; then
  echo "skip: pod install (--no-pods)"
elif [[ "$(uname -s)" == "Darwin" ]]; then
  echo "==> pod install"
  # CocoaPods reads podspecs as UTF-8; without these it fails on any non-ASCII
  # byte under the default POSIX locale.
  (cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install)
else
  echo "skip: pod install (not macOS)"
fi

echo "OK: prebuild complete."
