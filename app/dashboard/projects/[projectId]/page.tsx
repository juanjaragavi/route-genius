import {
  ArrowLeft,
  FolderOpen,
  Plus,
  Link2,
  Tag,
  BarChart3,
  Zap,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getLinksByProject } from "@/lib/mock-data";
import LinkActions from "./LinkActions";

/** Prevent Next.js from caching this page — data comes from an ephemeral store */
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    // With Supabase-backed storage, if the project isn't found it
    // genuinely doesn't exist — no retry needed.
    notFound();
  }

  const links = await getLinksByProject(projectId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Proyectos
      </Link>

      {/* Project header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-brand-blue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {project.title || project.name}
            </h2>
            {project.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                {project.description}
              </p>
            )}
            {project.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Tag className="w-3 h-3 text-gray-300" />
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-3">
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
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href={`/dashboard/projects/${projectId}/edit`}
            className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-blue transition-colors min-h-11 flex items-center justify-center"
          >
            Editar
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/links/new`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap min-h-11"
          >
            <Plus className="w-4 h-4" />
            Nuevo Enlace
          </Link>
        </div>
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-12 text-center">
          <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Sin enlaces en este proyecto
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Cree su primer enlace de rotación dentro de este proyecto.
          </p>
          <Link
            href={`/dashboard/projects/${projectId}/links/new`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Enlace
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="card-bg rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:border-cyan-200/80 hover:-translate-y-0.5 transition-all duration-250 ease-out group"
            >
              <div className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-cyan-50 to-lime-50 border border-cyan-100 flex items-center justify-center group-hover:from-cyan-100 group-hover:to-lime-100 group-hover:border-cyan-200 transition-colors duration-250">
                  <Link2 className="w-4 h-4 text-brand-cyan" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/projects/${projectId}/links/${link.id}`}
                    className="block"
                  >
                    <h4 className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-cyan transition-colors duration-200">
                      {link.title || link.name || link.nickname}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      {link.main_destination_url || "(sin URL)"}
                    </p>
                  </Link>

                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        link.status === "enabled"
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : link.status === "disabled"
                            ? "bg-gray-100 text-gray-500 border border-gray-200"
                            : "bg-red-50 text-red-600 border border-red-100"
                      }`}
                    >
                      {link.status === "enabled"
                        ? "Habilitado"
                        : link.status === "disabled"
                          ? "Deshabilitado"
                          : "Expirado"}
                    </span>

                    {link.rotation_enabled && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Zap className="w-3 h-3" />
                        {link.rotation_rules.length} regla
                        {link.rotation_rules.length !== 1 ? "s" : ""}
                      </span>
                    )}

                    <span className="text-xs text-gray-300">
                      {new Date(link.updated_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>

                {/* Analytics + Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/analytics/${link.id}`}
                    className="p-2.5 min-size-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-all duration-200"
                    title="Ver analíticas"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                  <LinkActions linkId={link.id} projectId={projectId} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
