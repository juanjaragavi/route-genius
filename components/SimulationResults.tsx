"use client";

import { useMemo } from "react";
import {
  BarChart3,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { SimulationResult } from "@/lib/types";

interface SimulationResultsProps {
  results: SimulationResult[];
  iterations: number;
  onClose: () => void;
}

export default function SimulationResults({
  results,
  iterations,
  onClose,
}: SimulationResultsProps) {
  const maxHits = useMemo(
    () => Math.max(...results.map((r) => r.actual_hits)),
    [results],
  );

  const isConverging = useMemo(() => {
    return results.every(
      (r) => Math.abs(r.actual_percentage - r.configured_weight) < 5,
    );
  }, [results]);

  return (
    <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-50 to-cyan-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <BarChart3 className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Resultados de Simulación de Rotación
              </h3>
              <p className="text-sm text-gray-500">
                {iterations.toLocaleString()} clics simulados
              </p>
            </div>
          </div>

          {/* Convergence indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConverging
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {isConverging ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {isConverging ? "Convergiendo" : "Variación detectada"}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {results.map((result, idx) => {
            const deviation =
              result.actual_percentage - result.configured_weight;
            const deviationAbs = Math.abs(deviation);

            return (
              <div key={result.url + idx} className="group relative">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/80 transition-colors">
                  {/* Destination info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {result.is_main ? (
                        <Target className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {result.label}
                      </span>
                      {result.is_main && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-blue-100 text-blue-700 rounded">
                          Respaldo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate pl-5.5">
                      {result.url}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* Configured weight */}
                    <div className="text-right w-16">
                      <div className="text-xs text-gray-400">Objetivo</div>
                      <div className="text-sm font-semibold text-gray-600">
                        {result.configured_weight}%
                      </div>
                    </div>

                    {/* Actual percentage */}
                    <div className="text-right w-16">
                      <div className="text-xs text-gray-400">Real</div>
                      <div className="text-sm font-bold text-gray-800">
                        {result.actual_percentage.toFixed(1)}%
                      </div>
                    </div>

                    {/* Hits */}
                    <div className="text-right w-16">
                      <div className="text-xs text-gray-400">Clics</div>
                      <div className="text-sm font-semibold text-gray-600">
                        {result.actual_hits.toLocaleString()}
                      </div>
                    </div>

                    {/* Deviation */}
                    <div className="text-right w-16">
                      <div className="text-xs text-gray-400">Δ</div>
                      <div
                        className={`text-sm font-semibold ${
                          deviationAbs < 2
                            ? "text-green-600"
                            : deviationAbs < 5
                              ? "text-amber-600"
                              : "text-red-500"
                        }`}
                      >
                        {deviation > 0 ? "+" : ""}
                        {deviation.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mx-3 mb-1">
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    {/* Target line */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-400 z-10 opacity-60"
                      style={{
                        left: `${result.configured_weight}%`,
                      }}
                    />
                    {/* Actual bar */}
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        result.is_main
                          ? "bg-linear-to-r from-blue-500 to-blue-400"
                          : "bg-linear-to-r from-cyan-500 to-lime-400"
                      }`}
                      style={{
                        width: `${(result.actual_hits / maxHits) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Cada clic es una selección probabilística independiente (no
          persistente). Los resultados pueden variar entre simulaciones.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg border border-gray-200 transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
