#!/bin/bash

export NODE_ENV=production

echo "==========================================================="
echo " Starting local server in PRODUCTION mode..."
echo " Step 1: Building the application (Vite build)"
echo " Step 2: Running the backend server (Node)"
echo " The application will be available at: http://localhost:8080"
echo " (Serving static files from /dist)"
echo "==========================================================="

# Running the 'start' script defined in package.json
# This runs 'npm run build && node server.js'
npm start
