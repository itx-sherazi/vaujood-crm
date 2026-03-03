"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getLeadStats, type LeadStats } from "./leads-actions";

const STAGE_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#059669",
  "#ef4444",
];

export default function ChartsTab() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeadStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-zinc-500">
        Loading charts…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
        Could not load chart data.
      </div>
    );
  }

  const propertyData = stats.byProperty.map((p) => ({
    name: p.propertyName.length > 18 ? p.propertyName.slice(0, 18) + "…" : p.propertyName,
    fullName: p.propertyName,
    count: p.count,
  }));

  const sourceData = stats.bySource.map((s) => ({
    name: (s.source || "(not set)").length > 14 ? (s.source || "(not set)").slice(0, 14) + "…" : (s.source || "(not set)"),
    fullName: s.source || "(not set)",
    count: s.count,
  }));

  const stageData = stats.byStage.map((s, i) => ({
    name: s.stage,
    count: s.count,
    fill: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Leads by Property
        </h2>
        <p className="text-xs text-zinc-500">
          Kitni leads kis property se add hain
        </p>
        <div className="mt-3 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [value, "Leads"]}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ""}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Leads by Source
        </h2>
        <p className="text-xs text-zinc-500">
          Kis source se leads add ki hain
        </p>
        <div className="mt-3 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [value, "Leads"]}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ""}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Kanban Pipeline – Leads by Stage
        </h2>
        <p className="text-xs text-zinc-500">
          Pipeline ke har stage par kitni leads hain
        </p>
        <div className="mt-3 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [value, "Leads"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stageData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
