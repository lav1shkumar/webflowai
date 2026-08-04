#!/bin/sh
set -e

PORT="${PORT:-5173}"

fuser -k "${PORT}/tcp" 2>/dev/null || true

cd /home/user/project
exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
