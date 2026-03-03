"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadStage, LeadPriority } from "./leads-actions";
import {
  createLead,
  updateLead,
  deleteLead,
  listLeadsPaginated,
} from "./leads-actions";
import Modal from "./components/Modal";

interface LeadsTabProps {
  initialLeads: Lead[];
  totalLeads: number;
  pageSize: number;
}

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: "new_lead", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const PRIORITY_OPTIONS: LeadPriority[] = ["High", "Medium", "Low"];

export default function LeadsTab({
  initialLeads,
  totalLeads: initialTotal,
  pageSize,
}: LeadsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [localLeads, setLocalLeads] = useState<Lead[]>(initialLeads);
  const [totalLeads, setTotalLeads] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLocalLeads(initialLeads);
    setTotalLeads(initialTotal);
    setCurrentPage(1);
  }, [initialLeads, initialTotal]);

  const loadPage = (page: number) => {
    startTransition(async () => {
      const { leads, total } = await listLeadsPaginated(page, pageSize);
      setLocalLeads(leads);
      setTotalLeads(total);
      setCurrentPage(page);
    });
  };

  const handleCreate = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createLead(formData);
        setModalOpen(false);
        setEditingLead(null);
        router.refresh();
        loadPage(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add lead");
      }
    });
  };

  const handleEditSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateLead(formData);
        setModalOpen(false);
        setEditingLead(null);
        router.refresh();
        loadPage(currentPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update lead");
      }
    });
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      try {
        await deleteLead(formData);
        setLocalLeads((prev) => prev.filter((lead) => lead._id !== id));
        setTotalLeads((t) => Math.max(0, t - 1));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete lead");
      }
    });
  };

  const totalPages =
    totalLeads === 0 ? 1 : Math.ceil(totalLeads / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalLeads);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Leads List
        </h2>
        <button
          type="button"
          onClick={() => {
            setEditingLead(null);
            setModalOpen(true);
          }}
          className="min-h-[44px] shrink-0 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600"
        >
          + Add Lead
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLead(null);
        }}
        title={editingLead ? "Edit Lead" : "Add Lead"}
      >
        <form
          action={editingLead ? handleEditSubmit : handleCreate}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {editingLead && (
            <input
              type="hidden"
              name="id"
              value={editingLead._id ?? ""}
              readOnly
            />
          )}

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-companyName">
              Company / Name *
            </label>
            <input
              id="modal-companyName"
              name="companyName"
              required
              defaultValue={editingLead?.companyName}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Acme Corp"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-contactPerson">
              Contact Person
            </label>
            <input
              id="modal-contactPerson"
              name="contactPerson"
              defaultValue={editingLead?.contactPerson}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="John Smith"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-email">
              Email
            </label>
            <input
              id="modal-email"
              name="email"
              type="email"
              defaultValue={editingLead?.email}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="john@acme.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-phone">
              Phone
            </label>
            <input
              id="modal-phone"
              name="phone"
              defaultValue={editingLead?.phone}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="+92 300 0000000"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-dealValueAed">
              Deal Value (PKR)
            </label>
            <input
              id="modal-dealValueAed"
              name="dealValueAed"
              type="number"
              min={0}
              defaultValue={editingLead?.dealValueAed ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="500000"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-propertyInterest">
              Property Interest
            </label>
            <input
              id="modal-propertyInterest"
              name="propertyInterest"
              defaultValue={editingLead?.propertyInterest}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Downtown Apt, 3BR"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-stage">
              Stage
            </label>
            <select
              id="modal-stage"
              name="stage"
              defaultValue={editingLead?.stage ?? "new_lead"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-priority">
              Priority
            </label>
            <select
              id="modal-priority"
              name="priority"
              defaultValue={editingLead?.priority ?? "High"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-source">
              Source
            </label>
            <input
              id="modal-source"
              name="source"
              defaultValue={editingLead?.source}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Website"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-assignedTo">
              Assigned To
            </label>
            <select
              id="modal-assignedTo"
              name="assignedTo"
              defaultValue={editingLead?.assignedTo ?? "Sheraz"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Sheraz">Sheraz</option>
              <option value="Umair">Umair</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-notes">
              Notes
            </label>
            <textarea
              id="modal-notes"
              name="notes"
              rows={2}
              defaultValue={editingLead?.notes ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Additional context, call notes, etc."
            />
          </div>

          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingLead(null);
              }}
              className="min-h-[44px] rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] min-w-[120px] rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <p className="text-xs text-zinc-500">
        {totalLeads === 0
          ? "No leads"
          : `Showing ${startIndex + 1}–${endIndex} of ${totalLeads} leads`}
      </p>

      {localLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
          No leads yet. Click &quot;Add Lead&quot; to add one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localLeads.map((lead) => (
              <article
                key={lead._id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="truncate text-sm font-semibold text-zinc-800">
                      {lead.companyName}
                    </h3>
                    <p className="truncate text-xs text-zinc-500">
                      {lead.contactPerson}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    {stageLabel(lead.stage)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  {lead.dealValueAed > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                      PKR {lead.dealValueAed.toLocaleString()}
                    </span>
                  )}
                  {lead.priority && (
                    <span className="rounded-full bg-zinc-100 px-2 py-1">
                      {lead.priority}
                    </span>
                  )}
                  {lead.assignedTo && (
                    <span className="rounded-full bg-zinc-100 px-2 py-1">
                      {lead.assignedTo}
                    </span>
                  )}
                </div>

                {lead.propertyInterest && (
                  <p className="text-xs text-zinc-500">
                    Property: {lead.propertyInterest}
                  </p>
                )}

                {lead.notes && (
                  <p className="line-clamp-3 text-xs text-zinc-500">
                    {lead.notes}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <span className="max-w-[120px] truncate text-[11px] text-zinc-400">
                    {lead._id}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLead(lead);
                        setModalOpen(true);
                      }}
                      className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(lead._id)}
                      className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalLeads > pageSize && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadPage(currentPage - 1)}
                  disabled={currentPage <= 1 || isPending}
                  className="min-h-[32px] rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => loadPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || isPending}
                  className="min-h-[32px] rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function stageLabel(stage: LeadStage): string {
  const found = STAGE_OPTIONS.find((opt) => opt.value === stage);
  return found ? found.label : "New Lead";
}
