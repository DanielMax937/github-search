#!/bin/bash

# GitHub Search Service Start Script
# Port: 3003

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.service.pid"
LOG_FILE="$SCRIPT_DIR/.service.log"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "GitHub Search service is already running (PID: $PID)"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠ Warning: PostgreSQL is not running"
    echo "Please start PostgreSQL first: brew services start postgresql"
fi

# Start service in background
cd "$SCRIPT_DIR"
echo "Starting GitHub Search service on port 3003..."
npm run dev > "$LOG_FILE" 2>&1 &
PID=$!

# Save PID
echo "$PID" > "$PID_FILE"

# Wait a bit to check if process started successfully
sleep 2

if kill -0 "$PID" 2>/dev/null; then
    echo "✓ GitHub Search service started successfully (PID: $PID)"
    echo "View logs: tail -f $LOG_FILE"
else
    echo "✗ Failed to start GitHub Search service"
    rm -f "$PID_FILE"
    exit 1
fi
