#!/bin/bash
# ========================================================
# Script: Automated Setup for JobComm RTAF on Ubuntu Linux
# ========================================================
set -e

echo "=== [1/5] Updating packages and installing prerequisites ==="
sudo apt-get update -y
sudo apt-get install -y curl wget git build-essential

echo "=== [2/5] Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== [3/5] Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== [4/5] Installing Cloudflared (Linux) ==="
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb || sudo apt-get install -f -y
rm -f cloudflared.deb

echo "=== [5/5] Installing JobComm Server dependencies ==="
cd "$(dirname "$0")/server"
npm install --production

echo "=== Starting JobComm with PM2 ==="
pm2 delete jobcomm 2>/dev/null || true
pm2 start index.js --name "jobcomm"
pm2 save

echo ""
echo "========================================================"
echo "  JobComm RTAF is now running 24/7 on this server!"
echo "========================================================"
pm2 status
