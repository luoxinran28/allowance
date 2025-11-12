#!/bin/bash
set -e

echo "Starting Allowance Server entrypoint..."
echo "Environment:"
env | grep -E '(DATABASE|JWT|SERVER|RUST)' || echo "No matching env vars"

echo "Checking if binary exists..."
if [ -f /app/allowance-server ]; then
    echo "Binary found at /app/allowance-server"
    echo "Binary info:"
    ls -lh /app/allowance-server
else
    echo "ERROR: Binary not found at /app/allowance-server"
    exit 1
fi

echo "Waiting for database..."
timeout 30 bash -c 'until pg_isready -h postgres -p 5432 -U postgres > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 1
done'
echo "Database is ready!"

echo "Running Allowance Server..."
exec /app/allowance-server 2>&1
