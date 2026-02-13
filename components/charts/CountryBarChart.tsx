"use client";

/**
 * RouteGenius — Country Bar Chart
 *
 * Horizontal bar chart showing click distribution by country.
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

interface CountryData {
  country_code: string;
  total_clicks: number;
  percentage: number;
}

interface CountryBarChartProps {
  data: CountryData[];
}

export default function CountryBarChart({ data }: CountryBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos de ubicación disponibles
      </div>
    );
  }

  // Top 10 countries
  const chartData = data.slice(0, 10).map((d) => ({
    country: d.country_code || "Desconocido",
    clics: Number(d.total_clicks),
    porcentaje: Number(d.percentage),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="country"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={80}
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
          fill="#0891b2"
          radius={[0, 6, 6, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
