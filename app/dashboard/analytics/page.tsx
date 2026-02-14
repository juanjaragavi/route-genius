"use client";

/**
 * RouteGenius — Analytics Overview Dashboard
 *
 * Shows KPI cards, charts, and a click events table across all links.
 */

import { useState, useEffect, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  MousePointerClick,
  Users,
  PieChart as PieChartIcon,
  Link2,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import {
  getTotalClicks,
  getUniqueVisitors,
  getActiveLinkCount,
  getDistributionRatio,
  getAllClicksByDay,
  getClickEvents,
  exportClicksCSV,
} from "./actions";

// Lazy load charts for performance
const ClicksLineChart = dynamic(
  () => import("@/components/charts/ClicksLineChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-75 flex items-center justify-center">
      <div className="animate-pulse text-gray-300 text-sm">
        Cargando gráfico...
      </div>
    </div>
  );
}

// Date range presets
const DATE_RANGES = [
  { label: "Últimos 7 días", days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
];

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

interface ClickEvent {
  id: string;
  link_id: string;
  resolved_destination_url: string;
  went_to_main: boolean;
  country_code: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AnalyticsOverviewPage() {
  const [selectedRange, setSelectedRange] = useState(30);
  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [activeLinks, setActiveLinks] = useState(0);
  const [distribution, setDistribution] = useState({
    mainPercentage: 0,
    secondaryPercentage: 0,
  });
  const [clicksByDay, setClicksByDay] = useState<
    { click_date: string; total_clicks: number; unique_visitors: number }[]
  >([]);
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback((range: number, page: number = 1) => {
    const { startDate, endDate } = getDateRange(range);

    startTransition(async () => {
      try {
        const [clicks, visitors, links, dist, dailyData, eventsData] =
          await Promise.all([
            getTotalClicks(startDate, endDate),
            getUniqueVisitors(startDate, endDate),
            getActiveLinkCount(),
            getDistributionRatio(startDate, endDate),
            getAllClicksByDay(startDate, endDate),
            getClickEvents(null, startDate, endDate, page, 50),
          ]);

        setTotalClicks(clicks);
        setUniqueVisitors(visitors);
        setActiveLinks(links);
        setDistribution({
          mainPercentage: dist.mainPercentage,
          secondaryPercentage: dist.secondaryPercentage,
        });
        setClicksByDay(dailyData);
        setEvents(eventsData.events as ClickEvent[]);
        setEventsTotal(eventsData.total);
        setEventsPage(page);
      } catch (error) {
        console.error("[RouteGenius] Error loading analytics:", error);
      }
    });
  }, []);

  useEffect(() => {
    loadData(selectedRange);
  }, [selectedRange, loadData]);

  const handleExportCSV = async () => {
    const { startDate, endDate } = getDateRange(selectedRange);
    const csv = await exportClicksCSV(null, startDate, endDate);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `routegenius-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(eventsTotal / 50);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Analíticas de Tráfico
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Resumen de rendimiento de todos los enlaces
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {DATE_RANGES.map((range) => (
              <button
                key={range.days}
                onClick={() => setSelectedRange(range.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedRange === range.days
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={MousePointerClick}
          label="Total de Clics"
          value={totalClicks.toLocaleString("es-ES")}
          color="blue"
          loading={isPending}
        />
        <KPICard
          icon={Users}
          label="Visitantes Únicos"
          value={uniqueVisitors.toLocaleString("es-ES")}
          color="cyan"
          loading={isPending}
        />
        <KPICard
          icon={PieChartIcon}
          label="Tasa de Distribución"
          value={`${distribution.mainPercentage}% / ${distribution.secondaryPercentage}%`}
          subtitle="Principal / Secundario"
          color="lime"
          loading={isPending}
        />
        <KPICard
          icon={Link2}
          label="Enlaces Activos"
          value={activeLinks.toString()}
          color="blue"
          loading={isPending}
        />
      </div>

      {/* Chart: Clicks over Time */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-brand-blue" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            Clics en el Tiempo
          </h3>
        </div>
        {isPending ? (
          <ChartSkeleton />
        ) : (
          <ClicksLineChart data={clicksByDay} showUnique />
        )}
      </div>

      {/* Events Table */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-cyan" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
              Eventos de Clic
            </h3>
            <span className="text-xs text-gray-400 ml-2">
              {eventsTotal.toLocaleString("es-ES")} resultados
            </span>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-brand-blue hover:bg-blue-50 border border-gray-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500">
                  Fecha/Hora
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 hidden sm:table-cell">
                  Enlace
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">
                  Destino
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500 hidden md:table-cell">
                  País
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No hay eventos de clic en el período seleccionado
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap text-xs sm:text-sm">
                      {new Date(event.created_at).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-2.5 px-2 text-gray-700 font-mono text-xs hidden sm:table-cell max-w-24 truncate">
                      {event.link_id.slice(0, 8)}…
                    </td>
                    <td className="py-2.5 px-2 text-gray-600 max-w-32 sm:max-w-50 truncate text-xs sm:text-sm">
                      {event.resolved_destination_url}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600 hidden md:table-cell">
                      {event.country_code || "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          event.went_to_main
                            ? "bg-blue-50 text-blue-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        {event.went_to_main ? "Principal" : "Secundario"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Página {eventsPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(selectedRange, eventsPage - 1)}
                disabled={eventsPage <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                onClick={() => loadData(selectedRange, eventsPage + 1)}
                disabled={eventsPage >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  color: "blue" | "cyan" | "lime";
  loading: boolean;
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-brand-blue",
      icon: "text-brand-blue",
    },
    cyan: {
      bg: "bg-cyan-50",
      text: "text-brand-cyan",
      icon: "text-brand-cyan",
    },
    lime: {
      bg: "bg-lime-50",
      text: "text-lime-700",
      icon: "text-lime-600",
    },
  };

  const c = colorClasses[color];

  return (
    <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      ) : (
        <div>
          <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
