"use client";

/**
 * RouteGenius — Destination Pie Chart
 *
 * Pie/donut chart showing traffic distribution across destinations.
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DestinationData {
  destination_url: string;
  went_to_main: boolean;
  total_clicks: number;
  percentage: number;
}

interface DestinationPieChartProps {
  data: DestinationData[];
}

const COLORS = [
  "#2563eb", // brand-blue
  "#0891b2", // brand-cyan
  "#84cc16", // brand-lime
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

function truncateUrl(url: string, maxLen: number = 35): string {
  try {
    const parsed = new URL(url);
    const short = parsed.hostname + parsed.pathname;
    return short.length > maxLen ? short.slice(0, maxLen) + "…" : short;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "…" : url;
  }
}

export default function DestinationPieChart({
  data,
}: DestinationPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos disponibles para el período seleccionado
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.went_to_main ? "Principal" : truncateUrl(d.destination_url),
    fullUrl: d.destination_url,
    value: Number(d.total_clicks),
    percentage: Number(d.percentage),
    isMain: d.went_to_main,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ percent }: { percent?: number }) =>
            `${((percent ?? 0) * 100).toFixed(1)}%`
          }
          labelLine={{ stroke: "#9ca3af" }}
        >
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} clics`, "Destino"]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "13px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: "11px" }}
          formatter={(value) => <span className="text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
