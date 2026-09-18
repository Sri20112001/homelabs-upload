#!/usr/bin/env bash
#
# Idempotent provisioner for a fresh Ubuntu/Debian deploy server.
# Re-running is always safe — every step checks state first.
#
# Required env:
#   DEPLOY_PUBKEY   full ssh-ed25519 public-key line to authorize
# Optional env:
#   APP_DIR         where the app repo will live (default: $HOME/homelabs-upload)
#
# Usage (as the deploy user, with passwordless or password sudo):
#   DEPLOY_PUBKEY='ssh-ed25519 AAAA... you@host' bash server/provision.sh
#
set -euo pipefail

: "${DEPLOY_PUBKEY:?DEPLOY_PUBKEY is not set — pass the full 'ssh-ed25519 ...' line}"
APP_DIR="${APP_DIR:-$HOME/homelabs-upload}"

echo "==> [1/5] Docker engine"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose-plugin git curl
else
  echo "    docker already installed: $(docker --version)"
fi

echo "==> [2/5] docker group for $USER"
if ! id -nG "$USER" | tr ' ' '\n' | grep -qx docker; then
  sudo usermod -aG docker "$USER"
  echo "    added (log out/in once for it to apply)"
else
  echo "    already a member"
fi

echo "==> [3/5] authorized_keys (exact full-line match, never duplicates)"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if grep -qxF "$DEPLOY_PUBKEY" ~/.ssh/authorized_keys; then
  echo "    key already present"
else
  printf '%s\n' "$DEPLOY_PUBKEY" >> ~/.ssh/authorized_keys
  echo "    key appended"
fi
chmod 755 ~/

echo "==> [4/5] app directory ($APP_DIR)"
mkdir -p "$APP_DIR"

echo "==> [5/5] sanity checks"
docker --version
git --version
echo "    SERVER_USER should be: $(whoami)"
echo "    SERVER_PATH should be: $APP_DIR"
echo "    key fingerprint present: $(grep -c -o 'AAAAC3NzaC1lZDI1NTE5[A-Za-z0-9+/=]*' ~/.ssh/authorized_keys | head -1) key(s) total"
echo
echo "Done. If 'docker' just got installed, re-login once, then verify:"
echo "    ssh -i <private-key> $(whoami)@$(hostname -I | awk '{print $1}') \"docker --version\""
