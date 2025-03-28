# Souvella Firebase Deployment Instructions

This guide will help you deploy your Souvella app to Firebase Hosting from your local machine.

## Prerequisites

1. You need to have Node.js and npm installed on your local machine
2. You need to have the Firebase CLI installed (`npm install -g firebase-tools`)
3. You need to have a Firebase account and a Firebase project set up

## Step 1: Download the build files

First, you need to download the build files from your Replit project. These files are already built and ready to be deployed.

1. In Replit, click on the three dots next to the "Files" panel
2. Navigate to the `dist` directory
3. Download the entire `dist` folder to your local machine 
   - You can download individual files or use the Replit interface to download the entire folder

## Step 2: Set up Firebase locally

1. Open a terminal/command prompt on your local machine
2. Navigate to a new empty directory where you want to set up the Firebase project
3. Run `firebase login` to sign in to your Firebase account
4. Run `firebase init` to initialize a new Firebase project:
   - Select "Hosting" when prompted for features
   - Select your Firebase project (memorybook2-4df48)
   - When asked about the public directory, enter "public"
   - Answer "Yes" when asked if you want to configure as a single-page app
   - Answer "No" when asked about GitHub actions

## Step 3: Prepare the files for deployment

1. Extract the downloaded `dist` folder to your local project
2. Copy all files from `dist/public` to the `public` folder in your Firebase project folder

## Step 4: Deploy to Firebase

1. Run `firebase deploy --only hosting`
2. After deployment completes, you'll see a URL where your app is live, typically:
   - `https://memorybook2-4df48.web.app`
   - `https://memorybook2-4df48.firebaseapp.com`

## Step 5: Update Firebase Authentication settings

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project and go to Authentication > Settings > Authorized domains
3. Add your new Firebase hosting domain(s) to the list of authorized domains

## Additional Notes

- Remember to update the Firebase configuration in your app if you deploy to a different Firebase project
- For future updates, you can repeat steps 1, 3, and 4 to deploy new versions
- To enable backend functionality, you would need to deploy Firebase Functions, which is not covered in this guide

Congratulations! Your Souvella app should now be live and accessible online!