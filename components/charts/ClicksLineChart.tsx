"use client";

/**
 * RouteGenius — Clicks Line Chart
 *
 * Time-series line chart showing total clicks and unique visitors over time.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ClicksByDayData {
  click_date: string;
  total_clicks: number;
  unique_visitors: number;
  main_clicks?: number;
  secondary_clicks?: number;
}

interface ClicksLineChartProps {
  data: ClicksByDayData[];
  showUnique?: boolean;
}

export default function ClicksLineChart({
  data,
  showUnique = true,
}: ClicksLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos disponibles para el período seleccionado
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    date: new Date(d.click_date).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "13px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
          labelStyle={{ fontWeight: 600, color: "#1f2937" }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: "12px" }}
        />
        <Line
          type="monotone"
          dataKey="total_clicks"
          name="Total de Clics"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: "#2563eb" }}
          activeDot={{ r: 5 }}
        />
        {showUnique && (
          <Line
            type="monotone"
            dataKey="unique_visitors"
            name="Visitantes Únicos"
            stroke="#0891b2"
            strokeWidth={2}
            dot={{ r: 3, fill: "#0891b2" }}
            activeDot={{ r: 5 }}
            strokeDasharray="5 5"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
