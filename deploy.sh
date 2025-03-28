#!/bin/bash

# Build the application
npm run build

# Deploy to Firebase hosting
npx firebase deploy --only hosting --project=memorybook2-4df48 --token="$FIREBASE_TOKEN"