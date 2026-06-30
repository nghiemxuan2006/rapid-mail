#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/rapid-mail"
REPO_URL="https://github.com/nghiemxuan2006/rapid-mail.git"
# Branch comes from the BRANCH env var; falls back to "test" if not set.
BRANCH="${BRANCH:-test}"
# Which stack to (re)deploy: backend | frontend | all
TARGET="${TARGET:-all}"
BACKEND_COMPOSE="$REPO_DIR/backend/docker-compose.yml"
FRONTEND_COMPOSE="$REPO_DIR/frontend/docker-compose.yml"

# First run: clone the repo. Subsequent runs: just pull.
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "=== Cloning repo (first run) ==="
  git clone -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

echo "=== Pulling latest code ($BRANCH) ==="
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard origin/"$BRANCH"

# No manual network creation — compose auto-creates the fixed-name
# `rapid-mail-network` (see docker-compose.yml) and reuses it across stacks.

deploy_nginx() {
  echo "=== Ensuring nginx is running ==="
  docker compose -f "$FRONTEND_COMPOSE" up --build -d nginx
}

deploy_backend() {
  echo "=== Deploying backend stack ==="
  docker compose -f "$BACKEND_COMPOSE" up --build -d --remove-orphans
  deploy_nginx
}

deploy_frontend() {
  echo "=== Deploying frontend stack ==="
  cp "$REPO_DIR/frontend/.env.${BRANCH}" "$REPO_DIR/frontend/.env"
  docker compose -f "$FRONTEND_COMPOSE" up --build -d frontend
  deploy_nginx
}

case "$TARGET" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  all)      deploy_backend; deploy_frontend ;;
  *) echo "Unknown TARGET: $TARGET (use backend|frontend|all)"; exit 1 ;;
esac

echo "=== Waiting for services to start ==="
sleep 10

# Health check: backend/all → API health; frontend → web root.
if [ "$TARGET" = "frontend" ]; then
  HEALTH_URL="https://localhost/"
else
  HEALTH_URL="https://localhost/api/health"
fi

echo "=== Health check ($HEALTH_URL) ==="
for i in 1 2 3; do
  if curl -k -f "$HEALTH_URL"; then
    echo "Health check passed"
    exit 0
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "Health check failed after 3 attempts"
exit 1
