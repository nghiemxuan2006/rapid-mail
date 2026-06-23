#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/rapid-mail"
REPO_URL="https://github.com/nghiemxuan2006/rapid-mail.git"
# Branch comes from the BRANCH env var; falls back to "test" if not set.
BRANCH="${BRANCH:-test}"
COMPOSE_FILE="$REPO_DIR/backend/docker-compose.yml"

# First run: clone the repo. Subsequent runs: just pull.
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "=== Cloning repo (first run) ==="
  git clone -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

echo "=== Pulling latest code ==="
cd "$REPO_DIR"
git pull origin "$BRANCH"

echo "=== Stopping existing containers ==="
docker compose -f "$COMPOSE_FILE" down

echo "=== Building and starting containers ==="
docker compose -f "$COMPOSE_FILE" up --build -d

echo "=== Waiting for services to start ==="
sleep 10

echo "=== Health check ==="
for i in 1 2 3; do
  if curl -k -f https://localhost/api/health; then
    echo "Health check passed"
    exit 0
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "Health check failed after 3 attempts"
exit 1
