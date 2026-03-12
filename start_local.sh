#!/bin/bash

# Check gcloud authentication
echo "Checking gcloud authentication..."
if ! gcloud auth print-access-token &> /dev/null; then
  echo "Error: You are not authenticated with gcloud."
  echo "Please run 'gcloud auth login' and 'gcloud auth application-default login' to authenticate."
  exit 1
fi
echo "gcloud authentication verified."

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
