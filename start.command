#!/bin/zsh
# Double-click to start the workshop and open it in your browser.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node is required. Install it from https://nodejs.org and try again."
  read -r "?Press Return to close…"
  exit 1
fi

node server.mjs &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

sleep 0.8
open "http://localhost:4173"
wait $SERVER_PID
