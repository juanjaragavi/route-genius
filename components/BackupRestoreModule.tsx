"use client";

/**
 * RouteGenius — Backup & Restore Module
 *
 * Provides data portability through CSV export/import.
 * Supports local file download/upload and Google Drive cloud backup.
 *
 * UI language: Spanish (Español).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Download,
  Upload,
  HardDrive,
  Cloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  FileUp,
  AlertTriangle,
  X,
  FolderArchive,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import {
  exportBackupAction,
  restoreBackupAction,
  getGoogleDriveStatus,
  getGoogleDriveAuthUrlAction,
  disconnectGoogleDrive,
  backupToGoogleDriveAction,
  listGoogleDriveBackupsAction,
  restoreFromGoogleDriveAction,
} from "@/app/dashboard/settings/backup-actions";
import type { RestoreResult } from "@/app/dashboard/settings/backup-actions";
import { generateBackupFilename } from "@/lib/csv-backup";

// ── Types ───────────────────────────────────────────────────────

type FeedbackState = {
  type: "success" | "error" | "idle";
  message: string;
};

type ModalView =
  | "backup"
  | "restore"
  | "confirm-restore"
  | "drive-backups"
  | null;

interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// ── Component ───────────────────────────────────────────────────

export default function BackupRestoreModule() {
  // UI state
  const [modalView, setModalView] = useState<ModalView>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [isDriveRestoring, setIsDriveRestoring] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    type: "idle",
    message: "",
  });
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(
    null,
  );

  // Google Drive state
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveFileInfo[]>([]);
  const [isLoadingDriveStatus, setIsLoadingDriveStatus] = useState(true);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // File references for restore
  const projectsFileRef = useRef<HTMLInputElement>(null);
  const linksFileRef = useRef<HTMLInputElement>(null);
  const [projectsFile, setProjectsFile] = useState<File | null>(null);
  const [linksFile, setLinksFile] = useState<File | null>(null);

  // ── Load Google Drive status on mount ──
  useEffect(() => {
    async function checkDriveStatus() {
      try {
        const result = await getGoogleDriveStatus();
        if (result.success) {
          setDriveConfigured(result.data.configured);
          setDriveConnected(result.data.connected);
        }
      } catch {
        // Silently fail — Drive features just won't be available
      } finally {
        setIsLoadingDriveStatus(false);
      }
    }

    // Check URL params for gdrive callback status
    let skipServerCheck = false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const gdriveParam = params.get("gdrive");

      // Clean URL regardless of status
      if (gdriveParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete("gdrive");
        window.history.replaceState({}, "", url.toString());
      }

      if (gdriveParam === "connected") {
        // OAuth flow just completed — trust the URL param and skip
        // the async server check to avoid a race condition that
        // would overwrite the state before the cookie is readable.
        setDriveConnected(true);
        setDriveConfigured(true);
        setIsLoadingDriveStatus(false);
        skipServerCheck = true;
      }
    }

    if (!skipServerCheck) {
      checkDriveStatus();
    }
  }, []);

  // Feedback helper
  const showFeedback = useCallback(
    (type: "success" | "error", message: string) => {
      setFeedback({ type, message });
      setTimeout(() => setFeedback({ type: "idle", message: "" }), 6000);
    },
    [],
  );

  // ── Backup: Local Download ──────────────────────────────────

  const handleLocalBackup = async () => {
    setIsExporting(true);
    try {
      const result = await exportBackupAction();
      if (!result.success) {
        showFeedback("error", result.error);
        return;
      }

      const { projectsCSV, linksCSV, projectCount, linkCount } = result.data;

      // Download projects CSV
      if (projectCount > 0) {
        downloadCSV(projectsCSV, generateBackupFilename("projects"));
      }

      // Download links CSV (slight delay to avoid browser blocking)
      if (linkCount > 0) {
        await new Promise((r) => setTimeout(r, 300));
        downloadCSV(linksCSV, generateBackupFilename("links"));
      }

      showFeedback(
        "success",
        `Respaldo completado: ${projectCount} proyecto(s) y ${linkCount} enlace(s) exportados.`,
      );
      setModalView(null);
    } catch {
      showFeedback("error", "Error inesperado al exportar. Intente de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  /** Trigger browser file download */
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Backup: Google Drive ──────────────────────────────────────

  const handleConnectGoogleDrive = async () => {
    try {
      const result = await getGoogleDriveAuthUrlAction();
      if (result.success) {
        window.location.href = result.data;
      } else {
        showFeedback("error", result.error);
      }
    } catch {
      showFeedback(
        "error",
        "Error al conectar con Google Drive. Intente de nuevo.",
      );
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      const result = await disconnectGoogleDrive();
      if (result.success) {
        setDriveConnected(false);
        setDriveBackups([]);
        showFeedback("success", "Google Drive desconectado exitosamente.");
      } else {
        showFeedback("error", result.error);
      }
    } catch {
      showFeedback("error", "Error al desconectar Google Drive.");
    }
  };

  const handleGoogleDriveBackup = async () => {
    if (!driveConnected) {
      await handleConnectGoogleDrive();
      return;
    }

    setIsDriveBackingUp(true);
    try {
      const result = await backupToGoogleDriveAction();
      if (result.success) {
        showFeedback(
          "success",
          `Respaldo subido a Google Drive: ${result.data.projectCount} proyecto(s) y ${result.data.linkCount} enlace(s).`,
        );
        setModalView(null);
      } else {
        showFeedback("error", result.error);
      }
    } catch {
      showFeedback(
        "error",
        "Error inesperado al subir respaldo a Google Drive.",
      );
    } finally {
      setIsDriveBackingUp(false);
    }
  };

  // ── Restore: File Selection ─────────────────────────────────

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "projects" | "links",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      showFeedback("error", "Solo se aceptan archivos CSV (.csv).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showFeedback("error", "El archivo es demasiado grande (máx. 10 MB).");
      return;
    }

    if (type === "projects") {
      setProjectsFile(file);
    } else {
      setLinksFile(file);
    }
  };

  const handleRestoreConfirm = () => {
    if (!projectsFile && !linksFile) {
      showFeedback(
        "error",
        "Seleccione al menos un archivo CSV para restaurar.",
      );
      return;
    }
    setModalView("confirm-restore");
  };

  const handleRestore = async () => {
    setIsImporting(true);
    setRestoreResult(null);

    try {
      let projectsCSV: string | null = null;
      let linksCSV: string | null = null;

      if (projectsFile) {
        projectsCSV = await projectsFile.text();
      }
      if (linksFile) {
        linksCSV = await linksFile.text();
      }

      const result = await restoreBackupAction(projectsCSV, linksCSV);

      if (!result.success) {
        showFeedback("error", result.error);
        return;
      }

      setRestoreResult(result.data);

      const { projectsRestored, linksRestored, errors } = result.data;
      if (errors.length === 0) {
        showFeedback(
          "success",
          `Restauración completada: ${projectsRestored} proyecto(s) y ${linksRestored} enlace(s) importados.`,
        );
      } else {
        showFeedback(
          "error",
          `Restauración parcial: ${projectsRestored} proyectos, ${linksRestored} enlaces. ${errors.length} error(es).`,
        );
      }

      // Reset file state
      setProjectsFile(null);
      setLinksFile(null);
      if (projectsFileRef.current) projectsFileRef.current.value = "";
      if (linksFileRef.current) linksFileRef.current.value = "";
      setModalView(null);
    } catch {
      showFeedback("error", "Error inesperado al restaurar. Intente de nuevo.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── Restore: Google Drive ─────────────────────────────────────

  const handleGoogleDriveRestore = async () => {
    if (!driveConnected) {
      await handleConnectGoogleDrive();
      return;
    }

    setIsLoadingDriveFiles(true);
    setModalView("drive-backups");

    try {
      const result = await listGoogleDriveBackupsAction();
      if (result.success) {
        setDriveBackups(result.data);
      } else {
        showFeedback("error", result.error);
        setModalView("restore");
      }
    } catch {
      showFeedback("error", "Error al listar respaldos de Google Drive.");
      setModalView("restore");
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleRestoreFromDriveFile = async (
    fileId: string,
    fileName: string,
  ) => {
    setIsDriveRestoring(true);
    try {
      // Determine type from filename
      const type: "projects" | "links" = fileName
        .toLowerCase()
        .includes("projects")
        ? "projects"
        : "links";

      const result = await restoreFromGoogleDriveAction(fileId, type);

      if (result.success) {
        const { projectsRestored, linksRestored, errors } = result.data;
        if (errors.length === 0) {
          showFeedback(
            "success",
            `Restauración desde Drive completada: ${projectsRestored} proyecto(s) y ${linksRestored} enlace(s).`,
          );
        } else {
          showFeedback(
            "error",
            `Restauración parcial: ${projectsRestored} proyectos, ${linksRestored} enlaces. ${errors.length} error(es).`,
          );
        }
        setRestoreResult(result.data);
        setModalView(null);
      } else {
        showFeedback("error", result.error);
      }
    } catch {
      showFeedback("error", "Error al restaurar desde Google Drive.");
    } finally {
      setIsDriveRestoring(false);
    }
  };

  // ── Modal Overlay ───────────────────────────────────────────

  const closeModal = () => {
    setModalView(null);
    setProjectsFile(null);
    setLinksFile(null);
    setRestoreResult(null);
    setDriveBackups([]);
    if (projectsFileRef.current) projectsFileRef.current.value = "";
    if (linksFileRef.current) linksFileRef.current.value = "";
  };

  return (
    <>
      {/* Section Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8">
        <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <FolderArchive className="w-4.5 h-4.5 text-brand-blue" />
          Respaldo y Restauración
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Exporte sus proyectos y enlaces como archivos CSV, o restaure una
          copia de seguridad previamente guardada.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Backup Button */}
          <button
            onClick={() => setModalView("backup")}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-11"
          >
            <Download className="w-4 h-4" />
            Crear Respaldo
          </button>

          {/* Restore Button */}
          <button
            onClick={() => setModalView("restore")}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer min-h-11"
          >
            <Upload className="w-4 h-4" />
            Restaurar Respaldo
          </button>
        </div>

        {/* Google Drive Connection Status */}
        {driveConfigured && !isLoadingDriveStatus && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
            <Cloud
              className={`w-4 h-4 ${driveConnected ? "text-green-500" : "text-gray-400"}`}
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700">
                Google Drive:{" "}
                <span
                  className={
                    driveConnected ? "text-green-600" : "text-gray-500"
                  }
                >
                  {driveConnected ? "Conectado" : "No conectado"}
                </span>
              </p>
            </div>
            {driveConnected ? (
              <button
                onClick={handleDisconnectGoogleDrive}
                className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer flex items-center gap-1"
              >
                <CloudOff className="w-3 h-3" />
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConnectGoogleDrive}
                className="text-xs text-brand-blue hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Conectar
              </button>
            )}
          </div>
        )}

        {/* Inline Feedback */}
        {feedback.type !== "idle" && (
          <div
            className={`mt-4 flex items-start gap-2 text-sm font-medium rounded-lg px-4 py-3 ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Restore Result Details */}
        {restoreResult && restoreResult.errors.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-800 mb-2">
              Detalles de errores:
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              {restoreResult.errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {restoreResult.errors.length > 10 && (
                <li>…y {restoreResult.errors.length - 10} error(es) más.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* ── Modal Overlay ─────────────────────────────────────── */}
      {modalView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800">
                {modalView === "backup" && "Crear Respaldo"}
                {modalView === "restore" && "Restaurar Datos"}
                {modalView === "confirm-restore" && "Confirmar Restauración"}
                {modalView === "drive-backups" && "Respaldos en Google Drive"}
              </h4>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {/* ── Backup Modal ── */}
              {modalView === "backup" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Elija dónde guardar la copia de seguridad de sus proyectos y
                    enlaces.
                  </p>

                  {/* Local Download */}
                  <button
                    onClick={handleLocalBackup}
                    disabled={isExporting}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:border-brand-blue hover:bg-blue-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      {isExporting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
                      ) : (
                        <HardDrive className="w-5 h-5 text-brand-blue" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">
                        Descarga Local
                      </p>
                      <p className="text-xs text-gray-500">
                        Descargue archivos CSV a su computadora
                      </p>
                    </div>
                    <FileDown className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>

                  {/* Google Drive */}
                  <button
                    onClick={handleGoogleDriveBackup}
                    disabled={
                      isDriveBackingUp ||
                      (!driveConfigured && !isLoadingDriveStatus)
                    }
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      driveConnected
                        ? "border-gray-200 hover:border-brand-blue hover:bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      {isDriveBackingUp ? (
                        <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
                      ) : (
                        <Cloud className="w-5 h-5 text-brand-blue" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">
                        Google Drive
                      </p>
                      <p className="text-xs text-gray-500">
                        {driveConnected
                          ? "Guardar en su cuenta de Google Drive"
                          : "Conectar con Google Drive primero"}
                      </p>
                    </div>
                    {driveConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                    ) : (
                      <span className="ml-auto text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Conectar
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* ── Restore Modal ── */}
              {modalView === "restore" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Seleccione los archivos CSV que desea restaurar. Puede
                    importar proyectos, enlaces, o ambos.
                  </p>

                  {/* Local Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4 text-brand-blue" />
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        Carga Local
                      </p>
                    </div>

                    {/* Projects File */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Archivo de Proyectos (opcional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={projectsFileRef}
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleFileSelect(e, "projects")}
                          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-blue hover:file:bg-blue-100 file:cursor-pointer"
                        />
                        {projectsFile && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Links File */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Archivo de Enlaces (opcional)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={linksFileRef}
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleFileSelect(e, "links")}
                          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-brand-blue hover:file:bg-blue-100 file:cursor-pointer"
                        />
                        {linksFile && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    {/* Google Drive Restore */}
                    <button
                      onClick={handleGoogleDriveRestore}
                      disabled={!driveConfigured && !isLoadingDriveStatus}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        driveConnected
                          ? "border-gray-200 hover:border-brand-blue hover:bg-blue-50/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Cloud className="w-4 h-4 text-brand-blue" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800">
                          Restaurar desde Google Drive
                        </p>
                      </div>
                      {driveConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                      ) : (
                        <span className="ml-auto text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Conectar
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Restore Button */}
                  <button
                    onClick={handleRestoreConfirm}
                    disabled={!projectsFile && !linksFile}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-11"
                  >
                    <FileUp className="w-4 h-4" />
                    Continuar con Restauración
                  </button>
                </div>
              )}

              {/* ── Confirm Restore Modal ── */}
              {modalView === "confirm-restore" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Advertencia
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Los datos existentes con el mismo ID serán
                        sobreescritos. Los nuevos elementos serán creados. Esta
                        acción no se puede deshacer.
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {projectsFile && (
                      <p>
                        📁 Proyectos:{" "}
                        <span className="font-medium text-gray-800">
                          {projectsFile.name}
                        </span>{" "}
                        <span className="text-gray-400">
                          ({(projectsFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </p>
                    )}
                    {linksFile && (
                      <p>
                        🔗 Enlaces:{" "}
                        <span className="font-medium text-gray-800">
                          {linksFile.name}
                        </span>{" "}
                        <span className="text-gray-400">
                          ({(linksFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalView("restore")}
                      disabled={isImporting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-h-11"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleRestore}
                      disabled={isImporting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-11"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Restaurando…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Confirmar Restauración
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Drive Backups Modal ── */}
              {modalView === "drive-backups" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Seleccione un archivo de respaldo para restaurar desde
                    Google Drive.
                  </p>

                  {isLoadingDriveFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                      <span className="ml-2 text-sm text-gray-500">
                        Cargando archivos…
                      </span>
                    </div>
                  ) : driveBackups.length === 0 ? (
                    <div className="text-center py-8">
                      <CloudOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No se encontraron respaldos en Google Drive.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Cree un respaldo primero usando la opción de Google
                        Drive.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {driveBackups.map((file) => (
                        <button
                          key={file.id}
                          onClick={() =>
                            handleRestoreFromDriveFile(file.id, file.name)
                          }
                          disabled={isDriveRestoring}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-brand-blue hover:bg-blue-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                            {file.name.toLowerCase().includes("projects") ? (
                              <FolderArchive className="w-4 h-4 text-brand-blue" />
                            ) : (
                              <FileDown className="w-4 h-4 text-brand-blue" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(file.modifiedTime).toLocaleString(
                                "es-CO",
                                {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                },
                              )}
                              {file.size &&
                                ` · ${(parseInt(file.size) / 1024).toFixed(1)} KB`}
                            </p>
                          </div>
                          {isDriveRestoring ? (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-blue shrink-0" />
                          ) : (
                            <Download className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setModalView("restore")}
                    disabled={isDriveRestoring}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-h-11"
                  >
                    Volver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
