# NOTES

## Google Drive API Configuration for RouteGenius - Completed ✅

I have successfully set up the Google Drive API credentials for RouteGenius cloud backup functionality on the TopFinanzas GCP project. Here's what was completed:

### **Step 1: GCP Project Setup**

- Used the existing **TopFinanzas** project (ID: absolute-brook-452020-d5)
- Created and then deleted the temporary RouteGenius project as per updated instructions

### **Step 2: Google Drive API Enabled** [console.cloud.google](https://console.cloud.google.com/apis/api/drive.googleapis.com/metrics?project=absolute-brook-452020-d5)

- Successfully enabled the Google Drive API on the TopFinanzas project
- Status: **Enabled**

### **Step 3: OAuth Consent Screen Configured**

- **App Name:** RouteGenius
- **User Support Email:** <juan.jaramillo@topnetworks.co>
- **App Domains:**
  - Home page: `https://route.topnetworks.co`
  - Privacy policy: `https://route.topnetworks.co/privacy`
  - Terms of service: `https://route.topnetworks.co/terms`
- **Authorized Domains:** topfinanzas.com, route-genius.vercel.app, topnetworks.co

### **Step 4: OAuth Scopes Configured**

- Added **drive.file** scope (`https://www.googleapis.com/auth/drive.file`)
- This scope allows read/write access only to files created by RouteGenius

### **Step 5: OAuth 2.0 Client Configured**

- **Client Name:** RouteGenius Web Client
- **Client ID:** 145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com
- **Type:** Web application
- **Authorized JavaScript Origins:**
  - <http://localhost:3070>
  - <https://route-genius.vercel.app>
  - <https://route.topnetworks.co>
- **Authorized Redirect URIs:**
  - <http://localhost:3070/api/auth/google-drive/callback>
  - <https://route-genius.vercel.app/api/auth/google-drive/callback>
  - <https://route.topnetworks.co/api/auth/google-drive/callback>

### **Next Steps:**

Now you need to:

1. Add the Client ID and Client Secret to your Vercel environment variables for both staging and production
2. Configure local development environment variables in `.env.local`
3. Test the integration with the backup/restore functionality
4. When ready for production, submit the app for verification through the OAuth consent screen (Step 7 of the guide)

The configuration is now ready for the RouteGenius backup integration to authenticate users and access their Google Drive files securely.

## Generated Environment Variables for RouteGenius Google Drive API Configuration

Based on the successful setup of the Google Drive API credentials on the TopFinanzas GCP project, here are the environment variables you need to configure:

## **Client Credentials Information**

- **Client ID:** `145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com`
- **Client Secret:** _Retrieve from GCP Console_ (see instructions below)
- **Project:** TopFinanzas (absolute-brook-452020-d5)

---

## **Local Development (`.env.local`)**

```bash
# Google Drive API Configuration
GOOGLE_DRIVE_CLIENT_ID=145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=<YOUR_CLIENT_SECRET_HERE>
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3070/api/auth/google-drive/callback
```

---

## **Staging (Vercel — `route-genius.vercel.app`)**

```bash
# Google Drive API Configuration
GOOGLE_DRIVE_CLIENT_ID=145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=<YOUR_CLIENT_SECRET_HERE>
GOOGLE_DRIVE_REDIRECT_URI=https://route-genius.vercel.app/api/auth/google-drive/callback
```

---

## **Production (Vercel — `route.topnetworks.co`)**

```bash
# Google Drive API Configuration
GOOGLE_DRIVE_CLIENT_ID=145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=<YOUR_CLIENT_SECRET_HERE>
GOOGLE_DRIVE_REDIRECT_URI=https://route.topnetworks.co/api/auth/google-drive/callback
```

---

## **How to Retrieve the Client Secret**

**⚠️ Important:** The Client Secret is only displayed once when created. If you need it:

1. Go to [Google Cloud Console - Clients](https://console.cloud.google.com/auth/clients?project=absolute-brook-452020-d5)
2. Click on **"RouteGenius Web Client"**
3. Scroll to **"Client secrets"** section
4. Click **"Add secret"** to generate a new one (you'll need to disable/delete the old ones)
5. Copy the new secret immediately

---

## **Vercel Setup Instructions**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the **route-genius** project
3. Navigate to **Settings → Environment Variables**
4. Add three environment variables:
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REDIRECT_URI`
5. Set appropriate scope:
   - **Preview:** Staging environment
   - **Production:** Production environment
6. **Redeploy** for changes to take effect

---

## **Configuration Summary**

| Environment | Client ID                                                                  | Redirect URI                                                     |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Local       | `145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com` | `http://localhost:3070/api/auth/google-drive/callback`           |
| Staging     | `145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com` | `https://route-genius.vercel.app/api/auth/google-drive/callback` |
| Production  | `145904061405-drbbgn8n46ln9q6a1ig5ioac3hkr80mg.apps.googleusercontent.com` | `https://route.topnetworks.co/api/auth/google-drive/callback`    |

---

## **Additional Configuration Details**

- **OAuth Scope:** `https://www.googleapis.com/auth/drive.file` (read/write access to RouteGenius-created files only)
- **App Name:** RouteGenius
- **Project:** TopFinanzas
- **Authorization Status:** Testing mode (add test users via [OAuth Consent Screen](https://console.cloud.google.com/auth/audience?project=absolute-brook-452020-d5))
