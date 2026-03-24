"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface StructuredDataProps {
  data: any;
}

export function StructuredData({ data }: StructuredDataProps) {
  // Attempt to parse if string
  const parsedData = useMemo(() => {
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  }, [data]);

  if (!parsedData) return null;

  // Render a simple table if it's an array of objects
  if (Array.isArray(parsedData) && parsedData.length > 0) {
    const keys = Object.keys(parsedData[0]);

    // Check if it looks chartable (has a numeric value)
    const isChartable = keys.some((k) => typeof parsedData[0][k] === "number");

    if (isChartable && parsedData.length > 1) {
      // Find x-axis (first string/categorical key) and y-axis (first numeric key)
      const xKey =
        keys.find((k) => typeof parsedData[0][k] === "string") || keys[0];
      const yKey =
        keys.find((k) => typeof parsedData[0][k] === "number") || keys[1];

      return (
        <div className="w-full h-64 mt-4 border border-border rounded-md p-4 bg-accent/20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parsedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
                vertical={false}
              />
              <XAxis
                dataKey={xKey}
                stroke="#888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#000",
                  border: "1px solid #222",
                  borderRadius: "4px",
                }}
                itemStyle={{ color: "#ededed" }}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey={yKey} fill="#ededed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Otherwise render a table
    return (
      <div className="w-full overflow-x-auto mt-4 border border-border rounded-md bg-accent/10">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted uppercase bg-accent/30 border-b border-border">
            <tr>
              {keys.map((k) => (
                <th key={k} className="px-4 py-3 font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedData.map((row: any, i: number) => (
              <tr
                key={i}
                className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors"
              >
                {keys.map((k) => (
                  <td key={k} className="px-4 py-3 text-foreground">
                    {String(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback for flat JSON object
  if (typeof parsedData === "object" && parsedData !== null) {
    return (
      <div className="mt-4 border border-border rounded-md bg-accent/10 p-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {Object.entries(parsedData).map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col border-b border-border/50 pb-2 last:border-0 sm:last:border-b-0"
            >
              <dt className="text-muted text-xs uppercase mb-1">{k}</dt>
              <dd className="text-foreground">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return null;
}
