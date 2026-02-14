"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, X, Plus } from "lucide-react";
import Link from "next/link";
import { saveProjectAction } from "@/app/actions";
import { generateRandomSlug } from "@/lib/slug";
import type { Project } from "@/lib/types";

function createNewProject(): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws_topnetworks_default",
    name: `prj-${generateRandomSlug(8)}`,
    title: "",
    description: "",
    tags: [],
    archived: false,
    created_at: now,
    updated_at: now,
  };
}

export default function NewProjectPage() {
  const router = useRouter();
  const [project, setProject] = useState(() => createNewProject());
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !project.tags.includes(tag)) {
      setProject((p) => ({ ...p, tags: [...p.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setProject((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const result = await saveProjectAction(project);
      if (result.success) {
        router.push(`/dashboard/projects/${result.data.id}`);
      } else {
        setError(result.error);
        setSaving(false);
      }
    } catch (err) {
      console.error("[RouteGenius] Error creating project:", err);
      setError("Error inesperado al crear el proyecto. Intente de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Proyectos
      </Link>

      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-brand-blue" />
            Nuevo Proyecto
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Los proyectos agrupan enlaces de rotación por marca o iniciativa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Título <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={project.title}
              onChange={(e) =>
                setProject((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="ej., TopFinanzas — Campañas Q1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
            <p className="mt-1 text-xs text-gray-400">
              Se auto-genera si se deja en blanco.
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre <span className="text-gray-400">(slug)</span>
            </label>
            <input
              type="text"
              value={project.name}
              onChange={(e) =>
                setProject((p) => ({
                  ...p,
                  name: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-"),
                }))
              }
              placeholder="ej., topfinanzas-campanas-q1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={project.description}
              onChange={(e) =>
                setProject((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Escriba una descripción breve del proyecto..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>

          {/* Tags */}
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
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
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

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creando..." : "Crear Proyecto"}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
