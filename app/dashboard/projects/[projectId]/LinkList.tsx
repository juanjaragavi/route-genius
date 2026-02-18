"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Link2, Zap, BarChart3, Plus } from "lucide-react";
import type { Link as LinkType } from "@/lib/types";
import LinkActions from "./LinkActions";

interface LinkListProps {
  initialLinks: LinkType[];
  projectId: string;
}

export default function LinkList({ initialLinks, projectId }: LinkListProps) {
  const [links, setLinks] = useState(initialLinks);

  const handleRemove = useCallback((linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }, []);

  if (links.length === 0) {
    return (
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-sm p-12 text-center">
        <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          Sin enlaces en este proyecto
        </h3>
        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
          Cree su primer enlace de rotación dentro de este proyecto.
        </p>
        <Link
          href={`/dashboard/projects/${projectId}/links/new`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.id}
          className="card-bg rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-lg hover:border-cyan-200/80 hover:-translate-y-0.5 transition-all duration-250 ease-out group"
        >
          <div className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-cyan-50 to-lime-50 border border-cyan-100 flex items-center justify-center group-hover:from-cyan-100 group-hover:to-lime-100 group-hover:border-cyan-200 transition-colors duration-250">
              <Link2 className="w-4 h-4 text-brand-cyan" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/projects/${projectId}/links/${link.id}`}
                className="block"
              >
                <h4 className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-cyan transition-colors duration-200">
                  {link.title || link.nickname}
                </h4>
                <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                  {link.main_destination_url || "(sin URL)"}
                </p>
              </Link>

              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    link.status === "enabled"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : link.status === "disabled"
                        ? "bg-gray-100 text-gray-500 border border-gray-200"
                        : "bg-red-50 text-red-600 border border-red-100"
                  }`}
                >
                  {link.status === "enabled"
                    ? "Habilitado"
                    : link.status === "disabled"
                      ? "Deshabilitado"
                      : "Expirado"}
                </span>

                {link.rotation_enabled && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Zap className="w-3 h-3" />
                    {link.rotation_rules.length} regla
                    {link.rotation_rules.length !== 1 ? "s" : ""}
                  </span>
                )}

                <span className="text-xs text-gray-300">
                  {new Date(link.updated_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>

            {/* Analytics + Actions */}
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/analytics/${link.id}`}
                className="p-2.5 min-size-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-all duration-200"
                title="Ver analíticas"
              >
                <BarChart3 className="w-4 h-4" />
              </Link>
              <LinkActions
                linkId={link.id}
                projectId={projectId}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
