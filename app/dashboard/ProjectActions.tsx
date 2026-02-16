"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, Trash2, Loader2 } from "lucide-react";
import { archiveProjectAction, deleteProjectAction } from "@/app/actions";

interface ProjectActionsProps {
  projectId: string;
  /** Called immediately when archive/delete is initiated (optimistic removal) */
  onRemove?: (projectId: string) => void;
}

export default function ProjectActions({
  projectId,
  onRemove,
}: ProjectActionsProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"archive" | "delete" | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const router = useRouter();

  // Recalculate menu position when opening
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.right - 192, // 192px = w-48
    });
  }, []);

  // Open handler
  const toggle = useCallback(() => {
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll/resize (position would be stale)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleArchive = async () => {
    setOpen(false);
    setBusy("archive");
    // Optimistic removal
    onRemove?.(projectId);
    try {
      await archiveProjectAction(projectId);
    } catch (err) {
      console.error("[ProjectActions] Archive failed:", err);
    }
    router.refresh();
    setBusy(null);
  };

  const handleDelete = async () => {
    setOpen(false);
    if (
      !confirm(
        "¿Está seguro? Se eliminarán el proyecto y todos sus enlaces permanentemente.",
      )
    )
      return;
    setBusy("delete");
    // Optimistic removal
    onRemove?.(projectId);
    try {
      await deleteProjectAction(projectId);
    } catch (err) {
      console.error("[ProjectActions] Delete failed:", err);
    }
    router.refresh();
    setBusy(null);
  };

  // Portal-based dropdown menu
  const dropdownMenu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed w-48 rounded-xl bg-white border border-gray-200 shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
            }}
          >
            <a
              href={`/dashboard/projects/${projectId}/edit`}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </a>
            <button
              onClick={handleArchive}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              Archivar
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        disabled={busy !== null}
        className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreHorizontal className="w-4 h-4" />
        )}
      </button>
      {dropdownMenu}
    </>
  );
}
