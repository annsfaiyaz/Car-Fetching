#!/usr/bin/env bash
# One-time setup on a VPS (Ubuntu/Debian). Run as root or with sudo.
#
#   curl -fsSL https://get.docker.com | sh
#   sudo ./scripts/vps-bootstrap.sh
#
# Then:
#   1. Edit /opt/car-fetching/backend/.env
#   2. docker login ghcr.io
#   3. /opt/car-fetching/scripts/deploy.sh
#   4. Enable auto-deploy: GitHub repo → Variables → DEPLOY_ENABLED = true

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/car-fetching}"
REPO_URL="${REPO_URL:-git@github.com:annsfaiyaz/Car-Fetching.git}"
BRANCH="${BRANCH:-main}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install first: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "Updating $INSTALL_DIR ..."
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull origin "$BRANCH"
else
  echo "Cloning into $INSTALL_DIR ..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

chmod +x "$INSTALL_DIR/scripts/deploy.sh"

mkdir -p "$INSTALL_DIR/backend/data"
if [[ ! -f "$INSTALL_DIR/backend/.env" ]]; then
  cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
  echo ""
  echo "Created $INSTALL_DIR/backend/.env — edit it with your API keys before deploy."
fi

echo ""
echo "Bootstrap done."
echo "  cd $INSTALL_DIR"
echo "  nano backend/.env"
echo "  echo \"\$GITHUB_PAT\" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin"
echo "  ./scripts/deploy.sh"
echo ""
echo "For CI auto-deploy after each merge to main, set GitHub Variables:"
echo "  DEPLOY_ENABLED = true"
echo "  DEPLOY_PATH = $INSTALL_DIR"
echo "And Secrets: SSH_HOST, SSH_USER, SSH_KEY"
