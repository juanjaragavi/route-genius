/**
 * Firebase configuration for RouteGenius Phase 2.
 * Provides Crashlytics error reporting for client-side monitoring.
 *
 * @module lib/firebase/config
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Singleton Firebase app instance. Returns existing app if already initialized. */
export function getFirebaseApp(): FirebaseApp | null {
  if (
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey === "PENDING_FIREBASE_SETUP"
  ) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp(firebaseConfig);
}
