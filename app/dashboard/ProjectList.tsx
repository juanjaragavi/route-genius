"use client";

/**
 * RouteGenius — Project List (Client Component)
 *
 * Renders the project grid with optimistic removal support.
 * When a user archives or deletes a project, the card is
 * immediately removed from the DOM via local state, before
 * the server round-trip completes.
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { FolderOpen, Plus, Tag, Link2, Clock, ArrowRight } from "lucide-react";
import ProjectActions from "./ProjectActions";
import type { Project } from "@/lib/types";

interface ProjectListProps {
  /** Initial project list fetched on the server */
  projects: Project[];
  /** Pre-computed link counts keyed by project ID */
  linkCounts: Record<string, number>;
}

export default function ProjectList({
  projects: initialProjects,
  linkCounts,
}: ProjectListProps) {
  const [projects, setProjects] = useState(initialProjects);

  /** Optimistic removal — instantly hides the card */
  const handleRemove = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  if (projects.length === 0) {
    return (
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center mx-auto mb-5">
          <FolderOpen className="w-7 h-7 text-brand-blue" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Sin proyectos aún
        </h3>
        <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
          Cree su primer proyecto para organizar sus enlaces de rotación.
        </p>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Crear Proyecto
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => {
        const linkCount = linkCounts[project.id] ?? 0;
        return (
          <div
            key={project.id}
            className="card-bg rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:border-blue-200/80 hover:-translate-y-0.5 transition-all duration-250 ease-out group"
          >
            <div className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4">
              {/* Icon */}
              <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center group-hover:from-blue-100 group-hover:to-cyan-100 group-hover:border-blue-200 transition-colors duration-250">
                <FolderOpen className="w-5 h-5 text-brand-blue" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate group-hover:text-brand-blue transition-colors duration-200">
                      {project.title || project.name}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-250 shrink-0 hidden sm:block" />
                  </div>
                  {project.description && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                </Link>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 mt-2 sm:mt-3">
                  {/* Link count badge */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <Link2 className="w-3.5 h-3.5 text-brand-cyan" />
                    {linkCount} {linkCount === 1 ? "enlace" : "enlaces"}
                  </span>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="w-3 h-3 text-gray-300" />
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Updated date */}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-300">
                    <Clock className="w-3 h-3" />
                    {new Date(project.updated_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <ProjectActions projectId={project.id} onRemove={handleRemove} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
