"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { archiveProjectAction, deleteProjectAction } from "@/app/actions";

export default function ProjectActions({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleArchive = async () => {
    setOpen(false);
    await archiveProjectAction(projectId);
    router.refresh();
  };

  const handleDelete = async () => {
    setOpen(false);
    if (
      !confirm(
        "¿Está seguro? Se eliminarán el proyecto y todos sus enlaces permanentemente.",
      )
    )
      return;
    await deleteProjectAction(projectId);
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 active:scale-95 transition-all duration-150"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-xl bg-white border border-gray-200 shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
          <a
            href={`/dashboard/projects/${projectId}/edit`}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </a>
          <button
            onClick={handleArchive}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          >
            <Archive className="w-3.5 h-3.5" />
            Archivar
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
