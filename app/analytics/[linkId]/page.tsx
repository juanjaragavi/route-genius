/**
 * RouteGenius — Public Analytics Page
 *
 * Publicly accessible page showing total click count for a tracking link.
 * No authentication required. Mirrors Linkly's .stats feature.
 */

import { createClient } from "@supabase/supabase-js";
import { Zap, MousePointerClick, TrendingUp } from "lucide-react";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Props {
  params: Promise<{ linkId: string }>;
}

export default async function PublicAnalyticsPage({ params }: Props) {
  const { linkId } = await params;

  // Get total clicks
  const { count: totalClicks } = await supabase
    .from("click_events")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId);

  // Get last 7 days clicks for trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentClicks } = await supabase
    .from("click_events")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId)
    .gte("created_at", sevenDaysAgo.toISOString());

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-8 space-y-8">
          {/* Branding */}
          <div className="flex justify-center">
            <Image
              src="https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp"
              alt="TopNetworks Logo"
              width={140}
              height={37}
              className="h-9 w-auto"
            />
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-brand-cyan" />
              <h1 className="text-xl font-bold text-brand-gradient tracking-tight">
                RouteGenius
              </h1>
            </div>
            <p className="text-xs text-gray-400">
              Estadísticas Públicas de Enlace
            </p>
          </div>

          {/* Link ID */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Enlace</p>
            <p className="text-sm font-mono text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              {linkId}
            </p>
          </div>

          {/* Total Clicks */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MousePointerClick className="w-5 h-5 text-brand-blue" />
              <p className="text-sm font-medium text-gray-500">
                Total de Clics
              </p>
            </div>
            <p className="text-5xl font-bold text-brand-blue">
              {(totalClicks ?? 0).toLocaleString("es-ES")}
            </p>
          </div>

          {/* 7-day trend */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 text-lime-600" />
            <span>
              {(recentClicks ?? 0).toLocaleString("es-ES")} clics en los últimos
              7 días
            </span>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-300">
            Datos actualizados en tiempo real
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} TopNetworks, Inc. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  );
}
