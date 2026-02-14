"use client";

/**
 * ProjectRetry — Client-side fallback when the project detail page
 * cannot load the project from the server-side file store.
 *
 * On Vercel, the file-based store uses /tmp which is ephemeral and
 * per-Lambda-instance. When the server component renders on a different
 * instance than the one that saved the project, getProject() returns null.
 *
 * This component retries via the getProjectAction server action with
 * exponential backoff, hoping to eventually hit an instance that has
 * the data. Shows a loading skeleton while retrying, and a helpful
 * error message (in Spanish) if all retries are exhausted.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderOpen, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getProjectAction } from "@/app/actions";

const MAX_RETRIES = 6;
const INITIAL_DELAY_MS = 400;

export default function ProjectRetry({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);

  const attemptFetch = useCallback(async () => {
    const result = await getProjectAction(projectId);

    if (result.success) {
      // Data is now available on this instance — re-render the server component
      router.refresh();
      return;
    }

    setRetryCount((prev) => {
      const next = prev + 1;
      if (next >= MAX_RETRIES) {
        setFailed(true);
      }
      return next;
    });
  }, [projectId, router]);

  useEffect(() => {
    if (failed) return;

    const delay = INITIAL_DELAY_MS * Math.pow(1.5, retryCount);
    const timer = setTimeout(() => {
      attemptFetch();
    }, delay);

    return () => clearTimeout(timer);
  }, [retryCount, failed, attemptFetch]);

  if (failed) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Proyectos
        </Link>

        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-10 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Proyecto no disponible
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            No se pudo cargar el proyecto. Esto puede ocurrir cuando el
            almacenamiento del servidor aún no ha sincronizado los datos.
            Intente de nuevo en unos segundos.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setFailed(false);
                setRetryCount(0);
              }}
              className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ir al Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton while retrying
  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Proyectos
      </Link>

      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-10">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-brand-blue" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando proyecto…
          </div>
          <div className="w-full max-w-md space-y-3 mt-4">
            <div className="h-6 bg-gray-100 rounded-lg animate-pulse w-3/4 mx-auto" />
            <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-1/2 mx-auto" />
            <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-2/3 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
