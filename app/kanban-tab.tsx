"use client";

import { useState, useEffect } from "react";
import type { Lead, LeadStage } from "./leads-actions";
import { updateLeadStage } from "./leads-actions";
import { propertyInterestLabel } from "./leads-tab";

interface KanbanTabProps {
  initialLeads: Lead[];
}

const STAGE_COLUMNS: {
  id: LeadStage;
  label: string;
  accent: string;
}[] = [
  { id: "new_lead", label: "New Lead", accent: "border-emerald-400" },
  { id: "contacted", label: "Contacted", accent: "border-sky-400" },
  { id: "qualified", label: "Qualified", accent: "border-amber-400" },
  { id: "proposal", label: "Proposal", accent: "border-purple-400" },
  { id: "negotiation", label: "Negotiation", accent: "border-pink-400" },
  { id: "closed_won", label: "Closed Won", accent: "border-emerald-500" },
  { id: "closed_lost", label: "Closed Lost", accent: "border-red-400" },
];

export default function KanbanTab({ initialLeads }: KanbanTabProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDrop = async (stage: LeadStage) => {
    if (!draggingId) return;

    const id = draggingId;
    setDraggingId(null);

    setLeads((prev) =>
      prev.map((lead) => (lead._id === id ? { ...lead, stage } : lead)),
    );

    await updateLeadStage(id, stage);
  };

  const leadsByStage = (stage: LeadStage) =>
    leads.filter((lead) => lead.stage === stage);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Kanban Pipeline
          </h2>
          <p className="text-xs text-zinc-500">
            Drag cards between columns to update pipeline stages.
          </p>
        </div>
        <p className="text-xs text-zinc-500">Total leads: {leads.length}</p>
      </div>

      <div className="flex flex-col gap-3">
        {STAGE_COLUMNS.map((column) => (
          <section
            key={column.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(column.id)}
            className={`flex min-h-[260px] w-full flex-col rounded-xl border-2 bg-white shadow-sm ${column.accent}`}
          >
            <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  {column.label}
                </h3>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
                {leadsByStage(column.id).length}
              </span>
            </header>

            <div className="flex-1 overflow-x-auto px-3 py-3">
              {leadsByStage(column.id).length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-2 py-6 text-center text-[11px] text-zinc-500">
                  No leads
                </div>
              ) : (
                <div className="flex flex-nowrap gap-3">
                  {leadsByStage(column.id).map((lead) => (
                    <article
                      key={lead._id}
                      draggable
                      onDragStart={() => setDraggingId(lead._id ?? null)}
                      onDragEnd={() => setDraggingId(null)}
                      className="min-w-[220px] max-w-[220px] shrink-0 cursor-grab rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-sm transition active:cursor-grabbing hover:border-emerald-300 hover:shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[13px] font-semibold text-zinc-800">
                            {lead.companyName}
                          </h4>
                          {lead.contactPerson && (
                            <p className="truncate text-[11px] text-zinc-500">
                              {lead.contactPerson}
                            </p>
                          )}
                        </div>
                        {lead.priority && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                            {lead.priority}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                        {lead.dealValueAed > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                            PKR {lead.dealValueAed.toLocaleString()}
                          </span>
                        )}
                        {lead.propertyInterest && (
                          <span className="rounded-full bg-zinc-100 px-2 py-1">
                            {propertyInterestLabel(lead.propertyInterest)}
                          </span>
                        )}
                        {lead.assignedTo && (
                          <span className="rounded-full bg-zinc-100 px-2 py-1">
                            {lead.assignedTo}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="text-[11px] text-zinc-500">
        Pipeline shows the most recent 1,000 leads so large databases stay fast.
        Add or edit leads in the Leads tab; on mobile, scroll horizontally to
        see all columns.
      </p>
    </div>
  );
}
