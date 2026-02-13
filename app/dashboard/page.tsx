import LinkEditorForm from "@/components/LinkEditorForm";
import { sampleLink } from "@/lib/mock-data";
import { Zap, GitBranch, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <>
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

        {/* Analytics Link */}
        <div className="mt-4">
          <Link
            href={`/dashboard/analytics/${sampleLink.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Ver Analíticas →
          </Link>
        </div>
      </div>

      {/* Main Editor Form */}
      <div className="max-w-3xl">
        <LinkEditorForm initialLink={sampleLink} />
      </div>
    </>
  );
}
