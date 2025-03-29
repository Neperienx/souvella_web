# Souvella Firebase Deployment Instructions

This guide will help you deploy your Souvella app to Firebase Hosting from your local machine.

## Prerequisites

1. You need to have Node.js and npm installed on your local machine
2. You need to have the Firebase CLI installed (`npm install -g firebase-tools`)
3. You need to have a Firebase account and a Firebase project set up

## Initial Deployment

### Step 1: Download the build files

First, you need to download the build files from your Replit project. These files are already built and ready to be deployed.

1. In Replit, use the "Deploy" button in the top right corner to build the application
2. After the build completes, Replit will generate a `dist` directory
3. Navigate to the `dist` directory in the file explorer
4. Download the entire `dist` folder to your local machine 
   - You can use the download button in the Replit file explorer or download individual files

### Step 2: Set up Firebase locally (First-time only)

1. Open a terminal/command prompt on your local machine
2. Navigate to a new empty directory where you want to set up the Firebase project
3. Run `firebase login` to sign in to your Firebase account
4. Run `firebase init` to initialize a new Firebase project:
   - Select "Hosting" when prompted for features
   - Select your Firebase project (memorybook2-4df48)
   - When asked about the public directory, enter "public"
   - Answer "Yes" when asked if you want to configure as a single-page app
   - Answer "No" when asked about GitHub actions

### Step 3: Prepare the files for deployment

1. Extract the downloaded `dist` folder to your local project
2. Copy all files from `dist/public` to the `public` folder in your Firebase project folder

### Step 4: Deploy to Firebase

1. Run `firebase deploy --only hosting`
2. After deployment completes, you'll see a URL where your app is live, typically:
   - `https://memorybook2-4df48.web.app`
   - `https://memorybook2-4df48.firebaseapp.com`

### Step 5: Update Firebase Authentication settings (First-time only)

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project and go to Authentication > Settings > Authorized domains
3. Add your new Firebase hosting domain(s) to the list of authorized domains

## Updating an Existing Deployment

If you've already deployed your app and want to update it with new changes, follow these simplified steps:

### Step 1: Build the updated application

1. Make sure all your changes are saved in Replit
2. Click the "Deploy" button in Replit to build the application
3. Wait for the build process to complete

### Step 2: Download the new build files

1. Navigate to the `dist` directory in Replit
2. Download the entire `dist` folder to your local machine

### Step 3: Update your local Firebase project

1. Navigate to your existing Firebase project folder on your local machine
2. Delete all files in the `public` folder to remove the old version
3. Copy all files from the newly downloaded `dist/public` to the `public` folder

### Step 4: Deploy the update

1. Run `firebase deploy --only hosting`
2. Once completed, your updated app will be live at the same URL as before

## Deploying Directly from Replit

You can also deploy directly from Replit without downloading files to your local machine:

### Step 1: Set up Firebase token (one-time setup)

1. On your local machine, install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login:ci` to generate a CI token
3. Copy the token that is displayed
4. In Replit, add a new Secret: 
   - Key: `FIREBASE_TOKEN`
   - Value: Paste the token you copied

### Step 2: Run the deployment script

1. Make sure all your changes are saved
2. In the Replit shell, run `bash deploy.sh`
3. The script will:
   - Build your application
   - Deploy it to Firebase
   - Display the URLs where your app is now live

This approach is recommended for quick updates as it eliminates the need to download files and manage them locally.

## Automated Deployment (Optional)

For more frequent updates, you might want to set up continuous deployment using GitHub:

1. Push your Replit project to GitHub
2. In the Firebase Console, go to Hosting > Connect a GitHub repository
3. Select your repository and configure automatic deployments

## Troubleshooting

- **Cache issues**: If changes aren't visible after deployment, you might need to clear browser cache or use incognito mode
- **Authentication errors**: Ensure all authorized domains are properly configured in Firebase Authentication settings
- **Firebase configuration**: Double-check that your Firebase configuration in the app matches your project

## Additional Notes

- Remember to update the Firebase configuration in your app if you deploy to a different Firebase project
- The Firebase hosting plan includes automatic SSL certificates and global CDN distribution
- To enable backend functionality, you would need to deploy Firebase Functions, which is not covered in this guide
- Keep track of your Firebase usage to stay within the free tier limits or budget accordingly

Congratulations! Your Souvella app should now be live and accessible online!