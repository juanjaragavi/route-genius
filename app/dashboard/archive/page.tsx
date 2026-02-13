"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, FolderOpen, Link2, RotateCcw, Trash2 } from "lucide-react";
import {
  getArchivedProjectsAction,
  getArchivedLinksAction,
  unarchiveProjectAction,
  unarchiveLinkAction,
  deleteProjectAction,
  deleteLinkAction,
} from "@/app/actions";
import type { Link as LinkType, Project } from "@/lib/types";

export default function ArchivePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [pRes, lRes] = await Promise.all([
      getArchivedProjectsAction(),
      getArchivedLinksAction(),
    ]);
    startTransition(() => {
      setProjects(pRes.success ? pRes.data : []);
      setLinks(lRes.success ? lRes.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnarchiveProject = async (id: string) => {
    await unarchiveProjectAction(id);
    load();
    router.refresh();
  };

  const handleDeleteProject = async (id: string) => {
    if (
      !confirm("¿Eliminar permanentemente este proyecto y todos sus enlaces?")
    )
      return;
    await deleteProjectAction(id);
    load();
    router.refresh();
  };

  const handleUnarchiveLink = async (id: string) => {
    await unarchiveLinkAction(id);
    load();
    router.refresh();
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("¿Eliminar permanentemente este enlace?")) return;
    await deleteLinkAction(id);
    load();
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        Cargando archivo...
      </div>
    );
  }

  const isEmpty = projects.length === 0 && links.length === 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Archive className="w-7 h-7 text-gray-400" />
          Archivo
        </h2>
        <p className="text-sm text-gray-500">
          Proyectos y enlaces archivados. Puede restaurarlos o eliminarlos
          permanentemente.
        </p>
      </div>

      {isEmpty ? (
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-12 text-center">
          <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            El archivo está vacío
          </h3>
          <p className="text-sm text-gray-400">
            Los proyectos y enlaces archivados aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Archived projects */}
          {projects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Proyectos Archivados ({projects.length})
              </h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 bg-white"
                  >
                    <FolderOpen className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-600 truncate">
                        {project.title || project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-400 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnarchiveProject(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Restaurar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived links */}
          {links.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Enlaces Archivados ({links.length})
              </h3>
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 bg-white"
                  >
                    <Link2 className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-600 truncate">
                        {link.title || link.name || link.nickname}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {link.main_destination_url}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnarchiveLink(link.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Restaurar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
