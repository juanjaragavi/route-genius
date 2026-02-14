"use client";

import { useState, useCallback } from "react";
import { Search, Link2, FolderOpen, Filter, X } from "lucide-react";
import Link from "next/link";
import { searchLinksAction, searchProjectsAction } from "@/app/actions";
import type { Link as LinkType, Project } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [linkResults, setLinkResults] = useState<LinkType[]>([]);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    const tags = tagFilter
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const [linksRes, projectsRes] = await Promise.all([
      searchLinksAction({
        query: query || undefined,
        tags: tags.length > 0 ? tags : undefined,
        status: statusFilter ? (statusFilter as LinkType["status"]) : undefined,
        includeArchived,
      }),
      searchProjectsAction(
        query || undefined,
        tags.length > 0 ? tags : undefined,
        includeArchived,
      ),
    ]);

    setLinkResults(linksRes.success ? linksRes.data : []);
    setProjectResults(projectsRes.success ? projectsRes.data : []);
    setLoading(false);
  }, [query, statusFilter, tagFilter, includeArchived]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTagFilter("");
    setIncludeArchived(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
          Buscar
        </h2>
        <p className="text-sm text-gray-500">
          Busque enlaces y proyectos en toda la plataforma.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, URL, descripción..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          >
            <option value="">Todos los estados</option>
            <option value="enabled">Habilitado</option>
            <option value="disabled">Deshabilitado</option>
            <option value="expired">Expirado</option>
          </select>

          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Etiquetas (separar con comas)"
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 w-full sm:w-52"
          />

          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Incluir archivados
          </label>

          {(statusFilter || tagFilter || includeArchived) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div className="space-y-8">
          {/* Project results */}
          {projectResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Proyectos ({projectResults.length})
              </h3>
              <div className="space-y-2">
                {projectResults.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <FolderOpen className="w-5 h-5 text-brand-blue shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {project.title || project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-400 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                    {project.archived && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">
                        Archivado
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Link results */}
          {linkResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Enlaces ({linkResults.length})
              </h3>
              <div className="space-y-2">
                {linkResults.map((link) => (
                  <Link
                    key={link.id}
                    href={`/dashboard/projects/${link.project_id}/links/${link.id}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 bg-white hover:border-cyan-200 hover:shadow-sm transition-all"
                  >
                    <Link2 className="w-5 h-5 text-brand-cyan shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {link.title || link.name || link.nickname}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {link.main_destination_url}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        link.status === "enabled"
                          ? "bg-green-50 text-green-700"
                          : link.status === "disabled"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      {link.status === "enabled"
                        ? "Activo"
                        : link.status === "disabled"
                          ? "Deshabilitado"
                          : "Expirado"}
                    </span>
                    {link.archived && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">
                        Archivado
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {projectResults.length === 0 && linkResults.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No se encontraron resultados para su búsqueda.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
