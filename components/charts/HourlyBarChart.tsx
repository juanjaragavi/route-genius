"use client";

/**
 * RouteGenius — Hourly Activity Bar Chart
 *
 * Vertical bar chart showing click activity by hour of the day.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HourlyData {
  hour_of_day: number;
  total_clicks: number;
}

interface HourlyBarChartProps {
  data: HourlyData[];
}

export default function HourlyBarChart({ data }: HourlyBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos de actividad horaria disponibles
      </div>
    );
  }

  // Ensure all 24 hours are represented
  const fullDay = Array.from({ length: 24 }, (_, i) => {
    const found = data.find((d) => d.hour_of_day === i);
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      clics: found ? Number(found.total_clicks) : 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={fullDay}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value} clics`, "Clics"]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "13px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        <Bar
          dataKey="clics"
          fill="#84cc16"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
