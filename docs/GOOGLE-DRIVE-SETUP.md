# Google Drive API — Configuration Guide for RouteGenius

Control the browser and implement the following guidelines to set up Google Drive API credentials for RouteGenius cloud backup functionality. Do not create GCP projects. Instead, delete the recently created project and work on TopFinanzas.

> **Status:** Pending — Google Drive integration logic is halted until these credentials are configured.

This guide walks through the complete setup of GCP Project, Drive API, and OAuth Consent Screen required for RouteGenius cloud backup functionality.

---

## Prerequisites

- A Google Cloud Platform (GCP) account with billing enabled
- Access to the [Google Cloud Console](https://console.cloud.google.com/)
- Admin access to the RouteGenius deployment (Vercel environment variables)

---

## Step 1: Create or Select a GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project selector dropdown in the top navigation bar
3. Click **"New Project"** (or select the existing RouteGenius project if one exists)
4. Enter:
   - **Project name:** `RouteGenius`
   - **Organization:** (select your organization or leave as "No organization")
5. Click **Create**
6. Wait for the project to be created and select it

---

## Step 2: Enable the Google Drive API

1. Navigate to **APIs & Services → Library**
   - Direct URL: `https://console.cloud.google.com/apis/library`
2. Search for **"Google Drive API"**
3. Click on **Google Drive API** in the results
4. Click **Enable**
5. Wait for activation (usually instant)

---

## Step 3: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**
   - Direct URL: `https://console.cloud.google.com/apis/credentials/consent`
2. Select **User Type:**
   - Choose **External** (unless all users are within your Google Workspace org)
3. Click **Create**
4. Fill in the required fields:

   | Field                       | Value                                  |
   | --------------------------- | -------------------------------------- |
   | **App name**                | `RouteGenius`                          |
   | **User support email**      | Your admin email                       |
   | **App logo** (optional)     | RouteGenius logo                       |
   | **App domain — Home page**  | `https://route.topnetworks.co`         |
   | **App domain — Privacy**    | `https://route.topnetworks.co/privacy` |
   | **App domain — Terms**      | `https://route.topnetworks.co/terms`   |
   | **Developer contact email** | Your admin email                       |

5. Click **Save and Continue**

### 3a: Add Scopes

1. Click **Add or Remove Scopes**
2. In the filter, search for `drive.file`
3. Select: `https://www.googleapis.com/auth/drive.file`
   - This scope allows read/write access **only** to files created by RouteGenius (not all Drive files)
4. Click **Update** → **Save and Continue**

### 3b: Add Test Users (while in Testing mode)

1. Click **Add Users**
2. Enter the email addresses of your test users
3. Click **Save and Continue**

> **Note:** While the app is in "Testing" mode, only registered test users can authenticate. Submit for verification when ready for production.

---

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**
   - Direct URL: `https://console.cloud.google.com/apis/credentials`
2. Click **Create Credentials → OAuth client ID**
3. Fill in:

   | Field                | Value                |
   | -------------------- | -------------------- |
   | **Application type** | `Web application`    |
   | **Name**             | `RouteGenius Backup` |

4. Under **Authorized JavaScript origins**, add:

   ```
   http://localhost:3070
   https://route-genius.vercel.app
   https://route.topnetworks.co
   ```

5. Under **Authorized redirect URIs**, add:

   ```
   http://localhost:3070/api/auth/google-drive/callback
   https://route-genius.vercel.app/api/auth/google-drive/callback
   https://route.topnetworks.co/api/auth/google-drive/callback
   ```

6. Click **Create**
7. **Copy the Client ID and Client Secret** — you will need these in the next step

---

## Step 5: Configure Environment Variables

Add the following environment variables to your deployment:

### Local Development (`.env.local`)

```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3070/api/auth/google-drive/callback
```

### Staging (Vercel — `route-genius.vercel.app`)

```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=https://route-genius.vercel.app/api/auth/google-drive/callback
```

### Production (Vercel — `route.topnetworks.co`)

```bash
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REDIRECT_URI=https://route.topnetworks.co/api/auth/google-drive/callback
```

### Setting Variables in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the **route-genius** project
3. Navigate to **Settings → Environment Variables**
4. Add each variable with the appropriate scope (Preview, Production)
5. **Redeploy** for changes to take effect

---

## Step 6: Verify Configuration

After setting environment variables, verify the integration:

```bash
# Check if the module detects credentials
node -e "
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'test';
  process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'test';
  const { isGoogleDriveConfigured } = require('./lib/google-drive');
  console.log('Configured:', isGoogleDriveConfigured());
"
```

---

## Step 7: Submit for Verification (Production)

When ready to go live beyond test users:

1. Navigate to **OAuth consent screen**
2. Click **Publish App**
3. If using sensitive scopes, complete Google's verification process
4. Required documentation:
   - Privacy Policy URL
   - App homepage
   - Demonstration video (if requested)

> **Timeline:** Google's review can take 2–6 weeks for sensitive scopes. The `drive.file` scope is typically classified as **restricted** and requires verification.

---

## File Structure Reference

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `lib/google-drive.ts`                      | OAuth flow + Drive API operations (stub) |
| `lib/csv-backup.ts`                        | CSV serialization/parsing utilities      |
| `app/dashboard/settings/backup-actions.ts` | Server actions for backup/restore        |
| `components/BackupRestoreModule.tsx`       | UI for backup & restore operations       |

---

## Security Considerations

1. **Scope minimization:** Only `drive.file` is requested (not `drive` full access)
2. **Token storage:** Access/refresh tokens will be stored server-side, never exposed to the client
3. **User isolation:** Each user authenticates independently; tokens are scoped to individual Google accounts
4. **HTTPS only:** Redirect URIs use HTTPS in staging/production environments

---

## Next Steps (After Credentials Are Provided)

1. Implement `exchangeGoogleDriveCode()` in `lib/google-drive.ts`
2. Create API route: `app/api/auth/google-drive/callback/route.ts`
3. Implement `uploadToGoogleDrive()` with multipart upload
4. Implement `listDriveBackups()` with folder-scoped queries
5. Implement `downloadFromDrive()` with file export
6. Wire up the "Google Drive" buttons in `BackupRestoreModule.tsx`
7. Add token refresh logic for long-lived sessions
