#!/usr/bin/env bash
# juro-verify installer
# Usage: curl -fsSL https://jurocompliant.com/install-verify.sh | sudo bash
set -euo pipefail

RELEASE_BASE="https://github.com/jecertis/juro-releases/releases/latest/download"
INSTALL_DIR="/usr/local/bin"
BIN_NAME="juro-verify"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# ── Detect platform ──────────────────────────────────────────────────────────
case "$OS/$ARCH" in
  linux/x86_64)   ASSET="juro-verify-linux-x64" ;;
  darwin/arm64)   ASSET="juro-verify-macos-arm64" ;;
  darwin/x86_64)  ASSET="juro-verify-macos-x64" ;;
  *)
    echo "Unsupported platform: $OS/$ARCH" >&2
    echo "Supported: linux/x86_64, darwin/arm64, darwin/x86_64" >&2
    exit 1
    ;;
esac

# ── Download and install ─────────────────────────────────────────────────────
echo "Downloading $ASSET ..."
curl -fsSL "$RELEASE_BASE/$ASSET" -o "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"

echo "Installed: $($INSTALL_DIR/$BIN_NAME --version)"
echo ""
echo "Usage: juro-verify <path-to-artifact.json>"
echo "       juro-verify --help"
