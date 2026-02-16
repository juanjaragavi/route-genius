import { Plus } from "lucide-react";
import Link from "next/link";
import { getAllProjects, countLinksByProject } from "@/lib/mock-data";
import ProjectList from "./ProjectList";

export default async function DashboardPage() {
  const projects = await getAllProjects();

  // Pre-fetch link counts for all projects (async)
  const linkCounts: Record<string, number> = {};
  await Promise.all(
    projects.map(async (p) => {
      linkCounts[p.id] = await countLinksByProject(p.id);
    }),
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
            Proyectos
          </h2>
          <p className="text-sm text-gray-500 mt-1 truncate">
            Organice sus enlaces de rotación por marca o iniciativa.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-brand-blue via-brand-cyan to-brand-lime text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all duration-200 shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </Link>
      </div>

      {/* Projects grid — client component for optimistic removal */}
      <ProjectList projects={projects} linkCounts={linkCounts} />
    </div>
  );
}
