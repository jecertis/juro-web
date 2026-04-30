#!/usr/bin/env bash
set -euo pipefail

RELEASE_BASE="https://github.com/jecertis/juro/releases/latest/download"
INSTALL_DIR="/usr/local/bin"
BIN_NAME="juro-deploy"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS/$ARCH" in
  linux/x86_64)   ASSET="juro-deploy-linux-x64" ;;
  darwin/arm64)   ASSET="juro-deploy-darwin-arm64" ;;
  darwin/x86_64)  ASSET="juro-deploy-darwin-x64" ;;
  *)
    echo "Unsupported platform: $OS/$ARCH" >&2
    echo "Supported: linux/x86_64, darwin/arm64, darwin/x86_64" >&2
    exit 1
    ;;
esac

echo "Downloading $ASSET ..."
curl -fsSL "$RELEASE_BASE/$ASSET" -o "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"

echo "Installed: $($INSTALL_DIR/$BIN_NAME --version)"
echo "Run 'juro-deploy --help' to get started."
