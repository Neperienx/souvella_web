#!/bin/bash

echo "🔥 Souvella Deployment Script 🔥"
echo "================================="
echo "This script will build and deploy your Souvella app to Firebase."
echo ""

# Check if FIREBASE_TOKEN is set
if [ -z "$FIREBASE_TOKEN" ]; then
  echo "⚠️  WARNING: FIREBASE_TOKEN environment variable is not set."
  echo "You may need to run 'firebase login:ci' locally to get a token"
  echo "and set it as a secret in your Replit environment."
  echo ""
  echo "Continuing without token (this will work if you've logged in previously)..."
  echo ""
fi

echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed! The dist directory was not created."
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""

echo "🚀 Deploying to Firebase hosting..."
if [ -z "$FIREBASE_TOKEN" ]; then
  # Deploy without token
  npx firebase deploy --only hosting --project=memorybook2-4df48
else
  # Deploy with token
  npx firebase deploy --only hosting --project=memorybook2-4df48 --token="$FIREBASE_TOKEN"
fi

# Check deployment status
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment completed successfully!"
  echo ""
  echo "🌎 Your app is now live at:"
  echo "   https://memorybook2-4df48.web.app"
  echo "   https://memorybook2-4df48.firebaseapp.com"
  echo ""
  echo "Remember to clear your browser cache if you don't see your changes immediately."
else
  echo ""
  echo "❌ Deployment failed. Please check the error messages above."
  echo "For more details on deploying, see DEPLOYMENT_INSTRUCTIONS.md"
fi