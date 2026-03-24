"use client";

import { useEffect, useState } from "react";

interface MetricsData {
  count: number;
  records: Array<{
    session_id: string;
    pipeline_used: string;
    total_latency_ms: number;
    node_durations_ms: Record<string, number>;
    cache_hit: boolean;
  }>;
}

export function MetricsBadge() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/metrics?limit=1");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        // fail silently
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics || metrics.count === 0 || !metrics.records.length) {
    return null;
  }

  const latest = metrics.records[0];
  const nodeCount = Object.keys(latest.node_durations_ms || {}).length;

  return (
    <div className="fixed bottom-6 right-6 text-[10px] font-mono text-muted border border-border bg-accent/30 backdrop-blur px-3 py-2 rounded flex flex-col gap-1 z-50 pointer-events-none">
      <div className="flex justify-between gap-4">
        <span>Pipeline:</span>
        <span className="text-foreground">{latest.pipeline_used}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Latency:</span>
        <span
          className={
            latest.total_latency_ms < 2000
              ? "text-green-500"
              : latest.total_latency_ms < 5000
                ? "text-white"
                : "text-white/50"
          }
        >
          {latest.total_latency_ms.toFixed(1)}ms
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Nodes:</span>
        <span className="text-foreground">{nodeCount}</span>
      </div>
      {latest.cache_hit && (
        <div className="text-green-500 mt-1 opacity-80">★ Cache Hit</div>
      )}
    </div>
  );
}
