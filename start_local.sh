#!/bin/bash

echo "Starting local development server..."

# Build the frontend first
echo "Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful. Starting Node.js server..."
  # Start the server
  # Ensure GEMINI_API_KEY is set in your environment or add it here for testing
  # export GEMINI_API_KEY="your_key_here" 
  node server.js
else
  echo "Frontend build failed. Server not started."
fi
