#!/bin/bash
cd "$(dirname "$0")"
PORT=8080
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:$PORT") &
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  (sleep 1; open "http://localhost:$PORT") &
  exec python -m http.server "$PORT"
else
  echo "Python 3 was not found on this Mac. Install Python 3, then run this file again."
  read -p "Press Enter to close..."
fi
