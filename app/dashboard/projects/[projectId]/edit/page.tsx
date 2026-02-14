"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FolderOpen, X, Plus } from "lucide-react";
import Link from "next/link";
import { saveProjectAction, getProjectAction } from "@/app/actions";
import type { Project } from "@/lib/types";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [project, setProject] = useState<Project | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getProjectAction(projectId);
      if (result.success) {
        setProject(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-gray-400">
        Cargando...
      </div>
    );
  }
  if (!project) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-red-500">
        {error || "Proyecto no encontrado."}
      </div>
    );
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !project.tags.includes(tag)) {
      setProject((p) => (p ? { ...p, tags: [...p.tags, tag] } : p));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setProject((p) =>
      p ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSaving(true);
    setError("");

    try {
      const result = await saveProjectAction(project);
      if (result.success) {
        router.push(`/dashboard/projects/${projectId}`);
        router.refresh();
      } else {
        setError(result.error);
        setSaving(false);
      }
    } catch (err) {
      console.error("[RouteGenius] Error updating project:", err);
      setError("Error inesperado al guardar el proyecto. Intente de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Proyecto
      </Link>

      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-brand-blue" />
            Editar Proyecto
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={project.title}
              onChange={(e) =>
                setProject((p) => (p ? { ...p, title: e.target.value } : p))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre (slug)
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) =>
                setProject((p) =>
                  p
                    ? {
                        ...p,
                        name: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-"),
                      }
                    : p,
                )
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={project.description}
              onChange={(e) =>
                setProject((p) =>
                  p ? { ...p, description: e.target.value } : p,
                )
              }
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Etiquetas
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Escriba y presione Enter"
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-xs text-blue-700 border border-blue-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
