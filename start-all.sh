#!/bin/bash
echo "Starting Notemind Local Environment..."

# Ensure dependencies are installed
echo "Installing concurrently..."
npm install -g concurrently > /dev/null 2>&1 || true

# Start API, Worker, and Frontend concurrently
npx concurrently -k -n "API,WRK,WEB" -c "bgBlue.bold,bgMagenta.bold,bgGreen.bold" \
  "cd backend && go run cmd/api/main.go" \
  "cd backend && go run cmd/worker/main.go" \
  "cd frontend && npm run dev"
