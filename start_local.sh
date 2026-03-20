#!/bin/bash

export NODE_ENV=production

echo "==========================================================="
echo " Building frontend and starting local production server..."
echo " The application will be available at: http://localhost:8080"
echo "==========================================================="

npm install
npm run build
node server.js
