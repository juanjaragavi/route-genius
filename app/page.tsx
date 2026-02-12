import Header from "@/components/Header";
import LinkEditorForm from "@/components/LinkEditorForm";
import { sampleLink } from "@/lib/mock-data";
import { Zap, GitBranch, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen page-bg">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Hero / Page title */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Editar Enlace de Rastreo
          </h2>
          <p className="text-sm text-gray-500 max-w-xl">
            Configure su URL de rastreo a continuación. Los clics entrantes se
            distribuirán entre los destinos según los porcentajes de peso que
            defina.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <Zap className="w-3 h-3" />
              Rotación Probabilística
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
              <GitBranch className="w-3 h-3" />
              Distribución No Persistente
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-lime-50 text-lime-700 border border-lime-100">
              <BarChart3 className="w-3 h-3" />
              Simulación en Tiempo Real
            </span>
          </div>
        </div>

        {/* Main Editor Form */}
        <LinkEditorForm initialLink={sampleLink} />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} TopNetworks, Inc. All rights reserved.
          </p>
          <p className="text-xs text-gray-300">RouteGenius v1.0 — Fase 1 MVP</p>
        </div>
      </footer>
    </div>
  );
}
