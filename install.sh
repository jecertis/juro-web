#!/usr/bin/env bash
set -euo pipefail

RELEASE_BASE="https://github.com/jecertis/juro-releases/releases/latest/download"
INSTALL_DIR="/usr/local/bin"
BIN_NAME="juro-deploy"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# ── Detect platform ──────────────────────────────────────────────────────────
case "$OS/$ARCH" in
  linux/x86_64)   ASSET="juro-deploy-linux-x64" ;;
  darwin/arm64)   ASSET="juro-deploy-macos-arm64" ;;
  darwin/x86_64)  ASSET="juro-deploy-macos-x64" ;;
  *)
    echo "Unsupported platform: $OS/$ARCH" >&2
    echo "Supported: linux/x86_64 (x64), darwin/arm64, darwin/x86_64" >&2
    exit 1
    ;;
esac

# ── Docker prerequisite check ─────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker is not installed. Install Docker Engine first:" >&2
  echo "  https://docs.docker.com/engine/install/" >&2
  exit 1
fi

# ── Docker Compose v2 — install plugin if missing ────────────────────────────
if ! docker compose version &>/dev/null 2>&1; then
  echo "Docker Compose v2 plugin not found — installing ..."
  if [[ "$OS" == "linux" ]]; then
    COMPOSE_VERSION="v2.29.2"
    COMPOSE_DIR="${HOME}/.docker/cli-plugins"
    mkdir -p "$COMPOSE_DIR"
    curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
      -o "$COMPOSE_DIR/docker-compose"
    chmod +x "$COMPOSE_DIR/docker-compose"
    echo "Docker Compose ${COMPOSE_VERSION} installed."
  else
    echo "ERROR: Docker Compose v2 is required. Install Docker Desktop (macOS) or the Compose plugin." >&2
    exit 1
  fi
fi

# ── Install juro-deploy CLI ───────────────────────────────────────────────────
echo "Downloading $ASSET ..."
curl -fsSL "$RELEASE_BASE/$ASSET" -o "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"

echo "Installed: $($INSTALL_DIR/$BIN_NAME --version)"
echo "Docker Compose: $(docker compose version --short)"
echo ""
echo "Run 'juro-deploy --help' to get started."
