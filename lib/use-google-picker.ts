"use client";

/**
 * RouteGenius — Google Picker Hook
 *
 * Custom React hook that manages loading the Google Picker API
 * and provides methods to open file/folder pickers against the
 * user's Google Drive.
 *
 * Requires:
 *   NEXT_PUBLIC_GOOGLE_PICKER_API_KEY   — GCP API key with Picker API enabled
 *   NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID  — OAuth 2.0 Client ID
 *
 * UI language: Spanish (Español).
 * @module lib/use-google-picker
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";

// ── Script URL ──────────────────────────────────────────────────

const GAPI_SCRIPT_URL = "https://apis.google.com/js/api.js";

// ── Public env vars ─────────────────────────────────────────────

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ?? "";
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID ?? "";

// ── Types ───────────────────────────────────────────────────────

export interface PickerFileResult {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export interface PickerFolderResult {
  id: string;
  name: string;
}

interface UseGooglePickerReturn {
  /** Whether the Picker API script has been loaded */
  isLoaded: boolean;
  /** Whether the Picker API is fully available (script + env vars) */
  isAvailable: boolean;
  /** Open picker to select CSV files for restore */
  openFilePicker: (
    accessToken: string,
    onPicked: (file: PickerFileResult) => void,
  ) => void;
  /** Open picker to select a destination folder for backup */
  openFolderPicker: (
    accessToken: string,
    onPicked: (folder: PickerFolderResult) => void,
  ) => void;
}

// ── Hook ────────────────────────────────────────────────────────

export function useGooglePicker(): UseGooglePickerReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const pickerApiLoadedRef = useRef(false);

  // Check if environment is configured
  const isAvailable = !!(API_KEY && CLIENT_ID) && isLoaded;

  // ── Load gapi script ────────────────────────────────────────

  useEffect(() => {
    // Already loaded
    if (window.gapi && pickerApiLoadedRef.current) {
      startTransition(() => setIsLoaded(true));
      return;
    }

    // Check if script tag already exists
    const existing = document.querySelector(`script[src="${GAPI_SCRIPT_URL}"]`);

    function loadPickerApi() {
      if (!window.gapi) return;
      window.gapi.load("picker", () => {
        pickerApiLoadedRef.current = true;
        startTransition(() => setIsLoaded(true));
      });
    }

    if (existing) {
      // Script tag exists — check if gapi is ready
      if (window.gapi) {
        loadPickerApi();
      } else {
        existing.addEventListener("load", loadPickerApi);
      }
      return;
    }

    // Inject script
    const script = document.createElement("script");
    script.src = GAPI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = loadPickerApi;
    script.onerror = () => {
      console.error("[RouteGenius] Failed to load Google Picker API script.");
    };
    document.head.appendChild(script);
  }, []);

  // ── File Picker (for Restore) ───────────────────────────────

  const openFilePicker = useCallback(
    (accessToken: string, onPicked: (file: PickerFileResult) => void) => {
      if (!window.google?.picker || !API_KEY) {
        console.error("[RouteGenius] Google Picker API not available.");
        return;
      }

      const docsView = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS,
      )
        .setIncludeFolders(true)
        .setMimeTypes("text/csv")
        .setOwnedByMe(true)
        .setMode(window.google.picker.DocsViewMode.LIST);

      const callback = (data: google.picker.ResponseObject) => {
        if (data.action === "picked" && data.docs && data.docs.length > 0) {
          const doc = data.docs[0];
          onPicked({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
          });
        }
      };

      const builder = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback(callback)
        .setTitle("Seleccionar archivo de respaldo (.csv)")
        .setLocale("es")
        .setMaxItems(1)
        .setOrigin(window.location.origin);

      if (APP_ID) {
        builder.setAppId(APP_ID);
      }

      const picker = builder.build();
      picker.setVisible(true);
    },
    [],
  );

  // ── Folder Picker (for Backup) ──────────────────────────────

  const openFolderPicker = useCallback(
    (accessToken: string, onPicked: (folder: PickerFolderResult) => void) => {
      if (!window.google?.picker || !API_KEY) {
        console.error("[RouteGenius] Google Picker API not available.");
        return;
      }

      const folderView = new window.google.picker.DocsView(
        window.google.picker.ViewId.FOLDERS,
      )
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setOwnedByMe(true)
        .setMimeTypes("application/vnd.google-apps.folder");

      const callback = (data: google.picker.ResponseObject) => {
        if (data.action === "picked" && data.docs && data.docs.length > 0) {
          const doc = data.docs[0];
          onPicked({
            id: doc.id,
            name: doc.name,
          });
        }
      };

      const builder = new window.google.picker.PickerBuilder()
        .addView(folderView)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback(callback)
        .setTitle("Seleccionar carpeta de destino")
        .setLocale("es")
        .setMaxItems(1)
        .setOrigin(window.location.origin);

      if (APP_ID) {
        builder.setAppId(APP_ID);
      }

      const picker = builder.build();
      picker.setVisible(true);
    },
    [],
  );

  return {
    isLoaded,
    isAvailable,
    openFilePicker,
    openFolderPicker,
  };
}
