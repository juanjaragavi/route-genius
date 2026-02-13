"use client";

/**
 * RouteGenius — Dashboard Error Boundary
 *
 * Catches errors in dashboard pages and displays a user-friendly message.
 */

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteGenius] Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Algo salió mal</h2>
        <p className="text-sm text-gray-500">
          Ocurrió un error inesperado. Por favor, recargue la página o intente
          de nuevo.
        </p>
        {error.message && (
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-3 border border-gray-100">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    </div>
  );
}
