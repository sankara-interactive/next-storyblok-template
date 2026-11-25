#!/usr/bin/env bash
# Boots `next dev` on a free port, runs smoke.sh against it, and stops only that server.
cd "$(dirname "$0")/.." || exit 1
PORT=$(node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})")
LOG=$(mktemp)
node node_modules/next/dist/bin/next dev -p "$PORT" >"$LOG" 2>&1 &
PID=$!
# next dev hands the port to a child process; kill by port so nothing else is touched.
trap 'kill "$PID" 2>/dev/null; lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null; rm -f "$LOG"' EXIT

for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT/robots.txt" && break
  kill -0 "$PID" 2>/dev/null || { cat "$LOG"; echo "next dev exited before it was ready"; exit 1; }
  sleep 1
done

./scripts/smoke.sh "http://localhost:$PORT"
