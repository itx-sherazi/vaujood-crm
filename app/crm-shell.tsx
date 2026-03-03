"use client";

import { useState } from "react";
import PropertiesTab from "./properties-tab";
import LeadsTab from "./leads-tab";
import KanbanTab from "./kanban-tab";
import ChartsTab from "./charts-tab";
import CalendarTab from "./calendar-tab";
import type { Property } from "./properties-actions";
import type { Lead } from "./leads-actions";

type TabId = "properties" | "leads" | "kanban" | "charts" | "calendar";

interface CrmShellProps {
  initialProperties: Property[];
  totalProperties: number;
  initialLeads: Lead[];
  totalLeads: number;
  kanbanLeads: Lead[];
  pageSize: number;
}

export default function CrmShell({
  initialProperties,
  totalProperties,
  initialLeads,
  totalLeads,
  kanbanLeads,
  pageSize,
}: CrmShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("properties");

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-800">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">
              Vujood Holdings CRM
            </h1>
            <p className="text-xs text-zinc-500 sm:text-sm">
              Properties, Leads and Kanban pipeline – internal use only
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            No authentication – internal use
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:p-1">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`min-h-[44px] min-w-[100px] flex-1 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:min-w-0 ${
              activeTab === "properties"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`min-h-[44px] min-w-[100px] flex-1 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:min-w-0 ${
              activeTab === "leads"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Leads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kanban")}
            className={`min-h-[44px] min-w-[100px] flex-1 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:min-w-0 ${
              activeTab === "kanban"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("charts")}
            className={`min-h-[44px] min-w-[100px] flex-1 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:min-w-0 ${
              activeTab === "charts"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Charts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`min-h-[44px] min-w-[100px] flex-1 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition sm:min-w-0 ${
              activeTab === "calendar"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Calendar
          </button>
        </nav>

        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          {activeTab === "properties" && (
            <PropertiesTab
              initialProperties={initialProperties}
              totalProperties={totalProperties}
              pageSize={pageSize}
            />
          )}
          {activeTab === "leads" && (
            <LeadsTab
              initialLeads={initialLeads}
              totalLeads={totalLeads}
              pageSize={pageSize}
            />
          )}
          {activeTab === "kanban" && (
            <KanbanTab initialLeads={kanbanLeads} />
          )}
          {activeTab === "charts" && <ChartsTab />}
          {activeTab === "calendar" && <CalendarTab />}
        </section>
      </main>
    </div>
  );
}
