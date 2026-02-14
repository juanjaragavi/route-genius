"use client";

/**
 * RouteGenius — Per-Link Analytics Dashboard
 *
 * Shows detailed analytics for a specific tracking link,
 * including charts, destination distribution, and a comparison
 * of configured weights vs actual traffic distribution.
 */

import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MousePointerClick,
  Users,
  ArrowLeft,
  Calendar,
  Globe,
  Clock,
  Target,
  Download,
} from "lucide-react";
import {
  getClicksByDay,
  getClicksByDestination,
  getClicksByCountry,
  getClicksByHour,
  getClickEvents,
  exportClicksCSV,
} from "../actions";
import RealtimeClickCounter from "@/components/RealtimeClickCounter";

// Lazy load charts
const ClicksLineChart = dynamic(
  () => import("@/components/charts/ClicksLineChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const DestinationPieChart = dynamic(
  () => import("@/components/charts/DestinationPieChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const CountryBarChart = dynamic(
  () => import("@/components/charts/CountryBarChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const HourlyBarChart = dynamic(
  () => import("@/components/charts/HourlyBarChart"),
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

interface ClicksByDayRow {
  click_date: string;
  total_clicks: number;
  unique_visitors: number;
  main_clicks: number;
  secondary_clicks: number;
}

interface DestinationRow {
  destination_url: string;
  went_to_main: boolean;
  total_clicks: number;
  percentage: number;
}

interface CountryRow {
  country_code: string;
  total_clicks: number;
  percentage: number;
}

interface HourlyRow {
  hour_of_day: number;
  total_clicks: number;
}

interface ClickEventRow {
  id: string;
  link_id: string;
  resolved_destination_url: string;
  went_to_main: boolean;
  country_code: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function LinkAnalyticsPage() {
  const params = useParams();
  const linkId = params.linkId as string;

  const [selectedRange, setSelectedRange] = useState(30);
  const [isPending, startTransition] = useTransition();

  const [dailyData, setDailyData] = useState<ClicksByDayRow[]>([]);
  const [destinationData, setDestinationData] = useState<DestinationRow[]>([]);
  const [countryData, setCountryData] = useState<CountryRow[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyRow[]>([]);
  const [events, setEvents] = useState<ClickEventRow[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);

  const totalClicks = dailyData.reduce(
    (sum, d) => sum + Number(d.total_clicks),
    0,
  );
  const totalUnique = dailyData.reduce(
    (sum, d) => sum + Number(d.unique_visitors),
    0,
  );

  const loadData = useCallback(
    (range: number, page: number = 1) => {
      const { startDate, endDate } = getDateRange(range);
      const today = new Date().toISOString().split("T")[0];

      startTransition(async () => {
        try {
          const [daily, destinations, countries, hourly, eventsData] =
            await Promise.all([
              getClicksByDay(linkId, startDate, endDate),
              getClicksByDestination(linkId, startDate, endDate),
              getClicksByCountry(linkId, startDate, endDate),
              getClicksByHour(linkId, today),
              getClickEvents(linkId, startDate, endDate, page, 50),
            ]);

          setDailyData(daily as ClicksByDayRow[]);
          setDestinationData(destinations as DestinationRow[]);
          setCountryData(countries as CountryRow[]);
          setHourlyData(hourly as HourlyRow[]);
          setEvents(eventsData.events as ClickEventRow[]);
          setEventsTotal(eventsData.total);
          setEventsPage(page);
        } catch (error) {
          console.error("[RouteGenius] Error loading link analytics:", error);
        }
      });
    },
    [linkId],
  );

  useEffect(() => {
    loadData(selectedRange);
  }, [selectedRange, loadData]);

  const handleExportCSV = async () => {
    const { startDate, endDate } = getDateRange(selectedRange);
    const csv = await exportClicksCSV(linkId, startDate, endDate);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `routegenius-${linkId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(eventsTotal / 50);
  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/redirect/${linkId}`
      : `/api/redirect/${linkId}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Analíticas
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Analíticas del Enlace
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500 font-mono">{linkId}</p>
            <RealtimeClickCounter linkId={linkId} />
          </div>
          <p className="text-xs text-gray-400 mt-1 break-all">
            URL de rastreo: {trackingUrl}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-brand-blue hover:bg-blue-50 border border-gray-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <MousePointerClick className="w-5 h-5 text-brand-blue" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Total de Clics
            </span>
          </div>
          {isPending ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-brand-blue">
              {totalClicks.toLocaleString("es-ES")}
            </p>
          )}
        </div>
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-cyan-50">
              <Users className="w-5 h-5 text-brand-cyan" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Visitantes Únicos
            </span>
          </div>
          {isPending ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-brand-cyan">
              {totalUnique.toLocaleString("es-ES")}
            </p>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clicks over Time */}
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand-blue" />
            <h3 className="text-lg font-semibold text-gray-800">
              Clics en el Tiempo
            </h3>
          </div>
          {isPending ? (
            <ChartSkeleton />
          ) : (
            <ClicksLineChart data={dailyData} showUnique />
          )}
        </div>

        {/* Destination Distribution */}
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-cyan" />
            <h3 className="text-lg font-semibold text-gray-800">
              Distribución por Destino
            </h3>
          </div>
          {isPending ? (
            <ChartSkeleton />
          ) : (
            <DestinationPieChart data={destinationData} />
          )}
        </div>

        {/* Country Distribution */}
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-brand-cyan" />
            <h3 className="text-lg font-semibold text-gray-800">
              Distribución por País
            </h3>
          </div>
          {isPending ? (
            <ChartSkeleton />
          ) : (
            <CountryBarChart data={countryData} />
          )}
        </div>

        {/* Hourly Activity */}
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-lime-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Actividad por Hora (Hoy)
            </h3>
          </div>
          {isPending ? <ChartSkeleton /> : <HourlyBarChart data={hourlyData} />}
        </div>
      </div>

      {/* Configured vs Actual Comparison */}
      {destinationData.length > 0 && (
        <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-blue" />
            <h3 className="text-lg font-semibold text-gray-800">
              Comparación: Configurado vs. Real
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    Destino
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    Tipo
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Clics Reales
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    % Real
                  </th>
                </tr>
              </thead>
              <tbody>
                {destinationData.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="py-2.5 px-2 text-gray-600 max-w-62.5 truncate">
                      {d.destination_url}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.went_to_main
                            ? "bg-blue-50 text-blue-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        {d.went_to_main ? "Principal" : "Secundario"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-gray-700">
                      {Number(d.total_clicks).toLocaleString("es-ES")}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-gray-700">
                      {d.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="card-bg rounded-2xl border border-gray-200/80 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Eventos de Clic
          </h3>
          <span className="text-xs text-gray-400">
            {eventsTotal.toLocaleString("es-ES")} resultados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500">
                  Fecha/Hora
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">
                  Destino
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">
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
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    No hay eventos de clic para este enlace
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600 max-w-62.5 truncate">
                      {event.resolved_destination_url}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600">
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
