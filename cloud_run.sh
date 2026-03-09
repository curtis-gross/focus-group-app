#!/bin/bash

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
