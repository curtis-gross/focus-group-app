#!/bin/bash

export NODE_ENV=development

echo "==========================================================="
echo " Starting local development server with Hot Reloading..."
echo " The application will be available at: http://localhost:3000"
echo " (API calls will be automatically proxied to port 8080)"
echo "==========================================================="

# Use npx to run concurrently to avoid needing a global install
# - node --watch automatically restarts the backend on changes
# - npm run dev starts the Vite HMR server on port 3000
npx concurrently --kill-others \
  --names "SERVER,CLIENT" \
  --prefix-colors "blue,green" \
  "node --watch server.js" \
  "npm run dev"
