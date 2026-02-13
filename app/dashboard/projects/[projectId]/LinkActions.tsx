"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { archiveLinkAction, deleteLinkAction } from "@/app/actions";

export default function LinkActions({
  linkId,
  projectId,
}: {
  linkId: string;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    await archiveLinkAction(linkId);
    router.refresh();
  };

  const handleDelete = async () => {
    setOpen(false);
    if (!confirm("¿Está seguro? Este enlace se eliminará permanentemente."))
      return;
    await deleteLinkAction(linkId);
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1">
          <a
            href={`/dashboard/projects/${projectId}/links/${linkId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </a>
          <button
            onClick={handleArchive}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Archive className="w-3.5 h-3.5" />
            Archivar
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
