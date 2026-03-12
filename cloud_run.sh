#!/bin/bash

# Check gcloud authentication
echo "Checking gcloud authentication..."
if ! gcloud auth print-access-token &> /dev/null; then
  echo "Error: You are not authenticated with gcloud."
  echo "Please run 'gcloud auth login' and 'gcloud auth application-default login' to authenticate."
  exit 1
fi
echo "gcloud authentication verified."

# Configuration
# CHANGE THIS TO YOUR APP NAME
SERVICE_NAME="healthco-app"
REGION="us-central1"

echo "Deploying $SERVICE_NAME to Cloud Run..."

# Build and Deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest

echo "Deployment complete."
