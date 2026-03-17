#!/bin/bash

# GitHub Search Service Stop Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.service.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "GitHub Search service is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! kill -0 "$PID" 2>/dev/null; then
    echo "GitHub Search service is not running (stale PID file)"
    rm -f "$PID_FILE"
    exit 0
fi

# Stop the process
echo "Stopping GitHub Search service (PID: $PID)..."
kill "$PID"

# Wait for process to stop (max 10 seconds)
for i in {1..10}; do
    if ! kill -0 "$PID" 2>/dev/null; then
        rm -f "$PID_FILE"
        echo "✓ GitHub Search service stopped successfully"
        exit 0
    fi
    sleep 1
done

# Force kill if still running
if kill -0 "$PID" 2>/dev/null; then
    echo "Process still running, force killing..."
    kill -9 "$PID"
    sleep 1
fi

rm -f "$PID_FILE"
echo "✓ GitHub Search service stopped"
