import {
  ArrowLeft,
  FolderOpen,
  Plus,
  Tag,
  BarChart3,
  Zap,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProject, getLinksByProject } from "@/lib/mock-data";
import { getServerSession } from "@/lib/auth-session";
import LinkList from "./LinkList";

/** Prevent Next.js from caching this page — data comes from an ephemeral store */
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { projectId } = await params;
  const project = await getProject(projectId, userId);

  if (!project) {
    // With Supabase-backed storage, if the project isn't found it
    // genuinely doesn't exist — no retry needed.
    notFound();
  }

  const links = await getLinksByProject(projectId, userId);

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
      <LinkList initialLinks={links} projectId={projectId} />
    </div>
  );
}
