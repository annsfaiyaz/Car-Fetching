#!/usr/bin/env bash
# Pull the latest image from GHCR and restart the app container.
# Used locally, on a VPS (scripts/vps-bootstrap.sh), and by GitHub Actions SSH deploy.
#
# One-time login (PAT with read:packages):
#   echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
#
# Usage:
#   ./scripts/deploy.sh
#   IMAGE=ghcr.io/annsfaiyaz/car-fetching:latest PORT=8000 ./scripts/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-ghcr.io/annsfaiyaz/car-fetching:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-wheelwise-pk}"
HOST_PORT="${PORT:-8000}"
ENV_FILE="${ENV_FILE:-$ROOT/backend/.env}"
DATA_DIR="${DATA_DIR:-$ROOT/backend/data}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Copy backend/.env.example to backend/.env and fill in secrets." >&2
  exit 1
fi

mkdir -p "$DATA_DIR"

echo "Pulling $IMAGE ..."
docker pull "$IMAGE"

echo "Stopping old container (if any) ..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Starting $CONTAINER_NAME on http://127.0.0.1:${HOST_PORT} ..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:8000" \
  --env-file "$ENV_FILE" \
  -v "${DATA_DIR}:/app/backend/data" \
  --restart unless-stopped \
  "$IMAGE"

echo "Done. Logs: docker logs -f $CONTAINER_NAME"
