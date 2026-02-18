"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Link2,
  FolderOpen,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchLinksAction, searchProjectsAction } from "@/app/actions";
import type { Link as LinkType, Project } from "@/lib/types";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [linkResults, setLinkResults] = useState<LinkType[]>([]);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      setLoading(true);
      setSearched(true);
      setShowSuggestions(true);
      setSelectedIndex(-1); // Reset selection on new search

      const tags = tagFilter
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const [linksRes, projectsRes] = await Promise.all([
        searchLinksAction({
          query: searchQuery || undefined,
          tags: tags.length > 0 ? tags : undefined,
          status: statusFilter
            ? (statusFilter as LinkType["status"])
            : undefined,
          includeArchived,
        }),
        searchProjectsAction(
          searchQuery || undefined,
          tags.length > 0 ? tags : undefined,
          includeArchived,
        ),
      ]);

      setLinkResults(linksRes.success ? linksRes.data : []);
      setProjectResults(projectsRes.success ? projectsRes.data : []);
      setLoading(false);
    },
    [statusFilter, tagFilter, includeArchived],
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== query) {
        setQuery(inputValue);
        if (inputValue.trim().length > 0) {
          runSearch(inputValue);
        } else {
          // Clear results if input is empty
          setLinkResults([]);
          setProjectResults([]);
          setSearched(false);
          setShowSuggestions(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, query, runSearch]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If an item is selected in dropdown, navigate to it
    if (selectedIndex >= 0) {
      const allItems = [
        ...projectResults.map((p) => ({ type: "project" as const, data: p })),
        ...linkResults.map((l) => ({ type: "link" as const, data: l })),
      ];
      if (allItems[selectedIndex]) {
        navigateToItem(allItems[selectedIndex]);
        return;
      }
    }

    // Otherwise just ensure query matches input and close suggestions (show full results)
    setQuery(inputValue);
    runSearch(inputValue);
    setShowSuggestions(false);
  };

  const navigateToItem = (
    item: { type: "project"; data: Project } | { type: "link"; data: LinkType },
  ) => {
    if (item.type === "project") {
      router.push(`/dashboard/projects/${item.data.id}`);
    } else {
      router.push(
        `/dashboard/projects/${item.data.project_id}/links/${item.data.id}`,
      );
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = projectResults.length + linkResults.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev)); // -1 means focus on input
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTagFilter("");
    setIncludeArchived(false);
  };

  // Helper to render dropdown items
  const renderDropdown = () => {
    if (
      !showSuggestions ||
      (projectResults.length === 0 && linkResults.length === 0)
    ) {
      return null;
    }

    let globalIndex = 0;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
        {projectResults.length > 0 && (
          <div className="py-2">
            <h3 className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Proyectos
            </h3>
            {projectResults.map((project) => {
              const isSelected = globalIndex === selectedIndex;
              globalIndex++;
              return (
                <div
                  key={project.id}
                  onClick={() =>
                    navigateToItem({ type: "project", data: project })
                  }
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-brand-blue/5" : "hover:bg-gray-50"
                  }`}
                >
                  <FolderOpen
                    className={`w-4 h-4 ${isSelected ? "text-brand-blue" : "text-gray-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${isSelected ? "text-brand-blue" : "text-gray-700"}`}
                    >
                      {project.title || project.name}
                    </p>
                    {project.description && (
                      <p className="text-xs text-gray-400 truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <ChevronRight className="w-4 h-4 text-brand-blue/50" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {projectResults.length > 0 && linkResults.length > 0 && (
          <div className="h-px bg-gray-100 mx-4" />
        )}

        {linkResults.length > 0 && (
          <div className="py-2">
            <h3 className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Enlaces
            </h3>
            {linkResults.map((link) => {
              const isSelected = globalIndex === selectedIndex;
              globalIndex++;
              return (
                <div
                  key={link.id}
                  onClick={() => navigateToItem({ type: "link", data: link })}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-brand-blue/5" : "hover:bg-gray-50"
                  }`}
                >
                  <Link2
                    className={`w-4 h-4 ${isSelected ? "text-brand-cyan" : "text-gray-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${isSelected ? "text-brand-blue" : "text-gray-700"}`}
                    >
                      {link.title || link.nickname}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      {link.main_destination_url}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      link.status === "enabled"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {link.status === "enabled" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
          <div ref={wrapperRef} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (
                  inputValue.trim().length > 0 &&
                  (projectResults.length > 0 || linkResults.length > 0)
                ) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Buscar por nombre, URL, descripción..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
            {renderDropdown()}
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
                        {link.title || link.nickname}
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
