/**
 * RouteGenius — Google Picker API Type Declarations
 *
 * Ambient types for the Google Picker API (gapi.picker).
 * @see https://developers.google.com/picker/docs/reference
 */

declare namespace google.picker {
  // ── Enums ───────────────────────────────────────────────────

  enum ViewId {
    DOCS = "all",
    DOCS_IMAGES = "docs-images",
    DOCS_IMAGES_AND_VIDEOS = "docs-images-and-videos",
    DOCS_VIDEOS = "docs-videos",
    DOCUMENTS = "documents",
    DRAWINGS = "drawings",
    FOLDERS = "folders",
    FORMS = "forms",
    PDFS = "pdfs",
    PRESENTATIONS = "presentations",
    SPREADSHEETS = "spreadsheets",
  }

  enum Action {
    CANCEL = "cancel",
    PICKED = "picked",
    LOADED = "loaded",
  }

  enum Feature {
    MINE_ONLY = "mine",
    MULTISELECT_ENABLED = "multiselectEnabled",
    NAV_HIDDEN = "navHidden",
    SIMPLE_UPLOAD_ENABLED = "simpleUpload",
    SUPPORT_DRIVES = "supportDrives",
  }

  enum DocsViewMode {
    GRID = "grid",
    LIST = "list",
  }

  // ── Interfaces ──────────────────────────────────────────────

  interface Document {
    [key: string]: unknown;
    id: string;
    name: string;
    mimeType: string;
    url: string;
    sizeBytes?: number;
    lastEditedUtc?: number;
    parentId?: string;
  }

  interface ResponseObject {
    action: string;
    docs?: Document[];
  }

  // ── Callback ────────────────────────────────────────────────

  type PickerCallback = (data: ResponseObject) => void;

  // ── Classes ─────────────────────────────────────────────────

  class View {
    constructor(viewId: ViewId);
    setMimeTypes(mimeTypes: string): this;
    setQuery(query: string): this;
  }

  class DocsView extends View {
    constructor(viewId?: ViewId);
    setIncludeFolders(include: boolean): this;
    setSelectFolderEnabled(enabled: boolean): this;
    setMimeTypes(mimeTypes: string): this;
    setOwnedByMe(ownedByMe: boolean): this;
    setParent(parentId: string): this;
    setMode(mode: DocsViewMode): this;
  }

  class DocsUploadView {
    constructor();
    setParent(folderId: string): this;
    setIncludeFolders(include: boolean): this;
  }

  class PickerBuilder {
    constructor();
    addView(view: View | DocsView | DocsUploadView | ViewId): this;
    setOAuthToken(token: string): this;
    setDeveloperKey(key: string): this;
    setCallback(callback: PickerCallback): this;
    setTitle(title: string): this;
    setLocale(locale: string): this;
    setAppId(appId: string): this;
    enableFeature(feature: Feature): this;
    disableFeature(feature: Feature): this;
    setSize(width: number, height: number): this;
    setOrigin(origin: string): this;
    setSelectableMimeTypes(mimeTypes: string): this;
    setMaxItems(max: number): this;
    hideTitleBar(): this;
    build(): Picker;
  }

  class Picker {
    setVisible(visible: boolean): void;
    isVisible(): boolean;
    dispose(): void;
  }
}

// ── Window globals injected by Google's script loader ─────────

interface Window {
  gapi?: {
    load: (api: string, callback: () => void) => void;
    client?: {
      init: (config: Record<string, unknown>) => Promise<void>;
    };
  };
  google?: {
    picker: typeof google.picker;
  };
}
