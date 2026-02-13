# Browser Agent Task: Configure GCP Services for RouteGenius Phase 2

## Context

You are configuring external Google Cloud services for a Next.js application called **RouteGenius** (a probabilistic traffic distribution SaaS by TopNetworks, Inc.). The application runs locally at `http://localhost:3070` and will eventually deploy to production.

The codebase already has:

- Supabase credentials configured (done)
- Better Auth secret generated (done)
- npm packages installed: `@next/third-parties`, `firebase`, `@google-cloud/storage` (done)
- Code modules created for Firebase and GCS (done)
- `.env.local` file with placeholder values marked `PENDING_*` that need real values (your job)

**Your mission:** Complete 4 sequential tasks in Google Cloud consoles and report back the exact environment variable values to populate.

---

## TASK 1: Google OAuth 2.0 Credentials (GCP Console)

**Goal:** Create OAuth 2.0 Client ID for Google sign-in, restricted to `@topnetworks.co` email domain.

### Steps

1. Navigate to `https://console.cloud.google.com/apis/credentials`
2. Make sure you are in the correct GCP project (should be the one associated with TopNetworks/RouteGenius). If no project exists, create one named "RouteGenius".
3. Click **"+ CREATE CREDENTIALS"** → select **"OAuth client ID"**
4. If prompted to configure the OAuth consent screen first:
   a. Go to **OAuth consent screen** (left sidebar or prompt link)
   b. Select **"Internal"** user type if the Google Workspace org allows it. If not, select **"External"** and add `topnetworks.co` as an authorized domain.
   c. App name: `RouteGenius`
   d. User support email: `info@topnetworks.co` (or the logged-in user's email)
   e. Authorized domains: add `topnetworks.co`
   f. Developer contact email: `info@topnetworks.co` (or the logged-in user's email)
   g. Save and continue through scopes (default is fine) and test users
   h. Return to Credentials page
5. Back on Create OAuth client ID:
   a. Application type: **Web application**
   b. Name: `RouteGenius Web Client`
   c. Authorized JavaScript origins: add `http://localhost:3070`
   d. Authorized redirect URIs: add both:
   - `http://localhost:3070/api/auth/callback/google`
   - `http://localhost:3070/auth/callback/google`
     e. Click **"Create"**
6. A dialog will show the **Client ID** and **Client Secret**. Copy both.

### Output needed

```
GOOGLE_CLIENT_ID=<the Client ID value, looks like: 123456789-xxxxxxxxxx.apps.googleusercontent.com>
GOOGLE_CLIENT_SECRET=<the Client Secret value, looks like: GOCSPX-xxxxxxxxxx>
```

---

## TASK 2: Google Analytics 4 Property

**Goal:** Create a GA4 property and get the Measurement ID.

### Steps

1. Navigate to `https://analytics.google.com/`
2. If no GA4 account exists:
   a. Click **"Start measuring"** or **"Admin"** (gear icon)
   b. Account name: `TopNetworks`
   c. Accept default data sharing settings
   d. Click **"Next"**
3. Create a property:
   a. Property name: `RouteGenius`
   b. Reporting time zone: select the appropriate one (America/Bogota if Colombia-based, or user's local timezone)
   c. Currency: USD
   d. Click **"Next"**
   e. Business details: select "Technology" industry, "Small" business size
   f. Click **"Next"** / **"Create"**
4. Set up a data stream:
   a. Select **"Web"** platform
   b. Website URL: `localhost:3070` (will update to production domain later, or use the eventual production domain if known)
   c. Stream name: `RouteGenius Web`
   d. Enhanced measurement: leave enabled (default)
   e. Click **"Create stream"**
5. The stream details page will show the **Measurement ID** (format: `G-XXXXXXXXXX`). Copy it.

### Output needed

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=<the Measurement ID, format: G-XXXXXXXXXX>
```

---

## TASK 3: Firebase Project with Crashlytics/Analytics

**Goal:** Create or link a Firebase project and get the web app configuration values.

### Steps

1. Navigate to `https://console.firebase.google.com/`
2. Click **"Add project"** (or **"Create a project"**)
3. **IMPORTANT:** If the GCP project from Task 1 already exists, Firebase should offer to link to it. Select the existing GCP project (e.g., "RouteGenius") instead of creating a new one. This links Firebase to the same GCP project.
4. If prompted about Google Analytics: **Enable** Google Analytics for this project and select the GA4 property created in Task 2 (or the existing TopNetworks GA account).
5. Click **"Create project"** / **"Continue"**
6. Once the project is ready, go to **Project Settings** (gear icon next to "Project Overview" in left sidebar)
7. Scroll down to **"Your apps"** section. Click the **Web** icon (`</>`) to add a web app:
   a. App nickname: `RouteGenius Web`
   b. Do NOT check "Also set up Firebase Hosting" (not needed)
   c. Click **"Register app"**
8. Firebase will display the SDK configuration snippet. Copy these 6 values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
9. Click **"Continue to console"**
10. In the left sidebar, go to **Analytics** → verify it shows as enabled.
11. Optionally, go to **Crashlytics** in the left sidebar → click **"Enable Crashlytics"** if available (note: web Crashlytics uses Analytics events under the hood, so enabling Analytics is the key step).

### Output needed

```
NEXT_PUBLIC_FIREBASE_API_KEY=<apiKey value>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain value, format: project-id.firebaseapp.com>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<projectId value>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket value, format: project-id.firebasestorage.app>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId value, a number>
NEXT_PUBLIC_FIREBASE_APP_ID=<appId value, format: 1:number:web:hexstring>
```

---

## TASK 4: Google Cloud Storage Bucket + Service Account

**Goal:** Create a GCS bucket for media storage and a service account with credentials.

### Part A: Create the bucket

1. Navigate to `https://console.cloud.google.com/storage/browser`
2. Make sure you're in the correct GCP project (same as Task 1).
3. Click **"+ CREATE"** (or "Create bucket")
4. Configuration:
   a. Bucket name: `routegenius-media-development`
   b. Location type: **Multi-region** → select **us** (United States)
   c. Default storage class: **Standard**
   d. Access control: **Uniform** (not Fine-grained)
   e. Protection tools: leave defaults
5. Click **"Create"**
6. If prompted about "public access prevention", keep it enforced (default).

### Part B: Create a service account

1. Navigate to `https://console.cloud.google.com/iam-admin/serviceaccounts`
2. Make sure you're in the correct GCP project.
3. Click **"+ CREATE SERVICE ACCOUNT"**
4. Configuration:
   a. Service account name: `routegenius-storage`
   b. Service account ID: `routegenius-storage` (auto-filled)
   c. Description: `RouteGenius media storage access`
5. Click **"Create and continue"**
6. Grant role: search for and select **"Storage Object Admin"** (`roles/storage.objectAdmin`)
7. Click **"Continue"** → **"Done"**

### Part C: Generate a JSON key

1. In the service accounts list, find the `routegenius-storage` account you just created.
2. Click on it to open details.
3. Go to the **"Keys"** tab.
4. Click **"Add key"** → **"Create new key"**
5. Key type: **JSON**
6. Click **"Create"** — a JSON file will download.
7. Open the downloaded JSON file and extract these 3 values:
   - `project_id`
   - `client_email`
   - `private_key` (the entire string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### Output needed:

```
GCS_BUCKET_NAME=routegenius-media-development
GCS_PROJECT_ID=<project_id from JSON>
GCS_CLIENT_EMAIL=<client_email from JSON, format: routegenius-storage@project-id.iam.gserviceaccount.com>
GCS_PRIVATE_KEY=<private_key from JSON, the entire PEM string>
```

---

## Summary of ALL values needed

After completing all 4 tasks, report back ALL of these values in a single code block:

```
# TASK 1: OAuth
GOOGLE_CLIENT_ID=<value>
GOOGLE_CLIENT_SECRET=<value>

# TASK 2: GA4
NEXT_PUBLIC_GA_MEASUREMENT_ID=<value>

# TASK 3: Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=<value>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<value>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<value>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<value>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<value>
NEXT_PUBLIC_FIREBASE_APP_ID=<value>

# TASK 4: GCS
GCS_BUCKET_NAME=routegenius-media-development
GCS_PROJECT_ID=<value>
GCS_CLIENT_EMAIL=<value>
GCS_PRIVATE_KEY=<value>
```

That is **13 values** total. Report every single one.

---

## Important Notes

- All tasks should use the **same GCP project**. If a project already exists for TopNetworks or RouteGenius, use that one. If not, create one and reuse it across all tasks.
- The OAuth consent screen domain restriction to `topnetworks.co` is a hard requirement.
- For redirect URIs in Task 1, include both `/api/auth/callback/google` and `/auth/callback/google` paths to cover both Better Auth convention and potential NextAuth convention.
- The GCS private key will be a long multi-line string. Include the full value.
- Do NOT skip any task. All 4 are required.
- If any step fails or a service is unavailable, report the error clearly so it can be resolved.
