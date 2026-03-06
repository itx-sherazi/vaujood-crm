"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadStage, LeadPriority } from "./leads-actions";
import {
  createLead,
  updateLead,
  deleteLead,
  duplicateLead,
  listLeadsPaginated,
  importLeadsBulk,
  updateLeadsBulk,
  updateLeadMarkCalled,
} from "./leads-actions";
import { getPropertyOptions } from "./properties-actions";
import Modal from "./components/Modal";

interface LeadsTabProps {
  initialLeads: Lead[];
  totalLeads: number;
  pageSize: number;
}

function whatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  let num = digits;
  if (num.startsWith("0") && num.length === 11) num = "92" + num.slice(1);
  else if (num.length === 10 && num.startsWith("3")) num = "92" + num;
  else if (num.length < 10) return "";
  return `https://wa.me/${num}`;
}

function telUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  let num = digits;
  if (num.startsWith("0") && num.length === 11) num = "92" + num.slice(1);
  else if (num.length === 10 && num.startsWith("3")) num = "92" + num;
  else if (num.length < 10) return "";
  return `tel:+${num}`;
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

const PROPERTY_INTEREST_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Select" },
  { value: "1", label: "1 BHK" },
  { value: "2", label: "2 BHK" },
  { value: "3", label: "3 BHK" },
  { value: "4", label: "4 BHK" },
  { value: "5+", label: "5 BHK" },
  { value: "retail_shop", label: "Retail Shop" },
  { value: "food_court", label: "Food Court" },
  { value: "offices", label: "Offices" },
  { value: "service_based_business", label: "Service-based business" },
  { value: "commercial_offices", label: "Commercial offices" },
  {
    value: "financial_and_institutional",
    label: "Financial and institutional",
  },
];

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<
    { _id: string; name: string }[]
  >([]);
  const [uploadResult, setUploadResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [filterPropertyInterest, setFilterPropertyInterest] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleSelectLead = (id: string | undefined) => {
    if (!id) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLeads = () => {
    if (localLeads.length === 0) return;
    const allSelected = localLeads.every((l) =>
      selectedLeadIds.has(l._id ?? ""),
    );
    if (allSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(
        new Set(localLeads.map((l) => l._id ?? "").filter(Boolean)),
      );
    }
  };

  const clearLeadSelection = () => setSelectedLeadIds(new Set());

  useEffect(() => {
    getPropertyOptions().then(setPropertyOptions);
  }, []);

  useEffect(() => {
    setLocalLeads(initialLeads);
    setTotalLeads(initialTotal);
    setCurrentPage(1);
  }, [initialLeads, initialTotal]);

  const loadPage = (page: number) => {
    startTransition(async () => {
      const filters = {
        propertyId: filterPropertyId.trim() || undefined,
        propertyInterest: filterPropertyInterest.trim() || undefined,
      };
      const { leads, total } = await listLeadsPaginated(page, pageSize, filters);
      setLocalLeads(leads);
      setTotalLeads(total);
      setCurrentPage(page);
    });
  };

  const filtersChangedRef = useRef(false);
  useEffect(() => {
    if (!filtersChangedRef.current) {
      filtersChangedRef.current = true;
      return;
    }
    loadPage(1);
  }, [filterPropertyId, filterPropertyInterest]);

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
    setDeleteConfirmId(null);
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

  const handleDuplicate = (id: string | undefined) => {
    if (!id) return;
    setError(null);
    startTransition(async () => {
      try {
        await duplicateLead(id);
        router.refresh();
        loadPage(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to duplicate lead");
      }
    });
  };

  const handleXlsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setUploadResult(null);
    startTransition(async () => {
      try {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        if (!firstSheet) {
          setError("No sheet found in file");
          return;
        }
        const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<
          string,
          unknown
        >[];
        const stringRows: Record<string, string>[] = rows.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) {
            out[String(k)] = v == null ? "" : String(v);
          }
          return out;
        });
        const result = await importLeadsBulk(stringRows);
        setUploadResult(result);
        router.refresh();
        loadPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  };

  const handleBulkEditSubmit = (formData: FormData) => {
    const ids = Array.from(selectedLeadIds);
    if (!ids.length) return;
    setError(null);
    startTransition(async () => {
      try {
        const bulkStage = formData.get("bulk-stage") as string;
        const bulkPriority = formData.get("bulk-priority") as string;
        const bulkAssignedTo = formData.get("bulk-assignedTo") as string;
        const bulkPropertyInterest = String(formData.get("bulk-propertyInterest") || "").trim();
        const bulkPropertyId = formData.get("bulk-propertyId");
        await updateLeadsBulk(ids, {
          stage: bulkStage ? (bulkStage as LeadStage) : undefined,
          priority: bulkPriority ? (bulkPriority as LeadPriority) : undefined,
          assignedTo: bulkAssignedTo ? (bulkAssignedTo as "Sheraz" | "Umair") : undefined,
          propertyInterest: bulkPropertyInterest || undefined,
          propertyId: bulkPropertyId && String(bulkPropertyId).trim() ? String(bulkPropertyId).trim() : undefined,
        });
        setBulkEditOpen(false);
        setSelectedLeadIds(new Set());
        router.refresh();
        loadPage(currentPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bulk update failed");
      }
    });
  };

  const totalPages = totalLeads === 0 ? 1 : Math.ceil(totalLeads / pageSize);
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
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Leads List
          </h2>
          {localLeads.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={
                  localLeads.length > 0 &&
                  localLeads.every((l) => selectedLeadIds.has(l._id ?? ""))
                }
                onChange={selectAllLeads}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              Select all
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleXlsxUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            title="Columns: Company / Name, Contact Person, Email, Phone, Deal Value (PKR), Property, Property Interest, Stage, Priority, Source, Assigned To, Notes"
            className="min-h-[44px] shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "Importing…" : "Upload XLSX"}
          </button>
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
      </div>

      {uploadResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">
            Import complete: {uploadResult.imported} lead(s) added.
          </p>
          {uploadResult.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-amber-700">
              {uploadResult.errors.slice(0, 10).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {uploadResult.errors.length > 10 && (
                <li>… and {uploadResult.errors.length - 10} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
        <span className="text-xs font-medium text-zinc-600">Filters:</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-zinc-700">
            <span className="text-xs">Property</span>
            <select
              value={filterPropertyId}
              onChange={(e) => {
                setFilterPropertyId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All properties</option>
              {propertyOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-700">
            <span className="text-xs">Unit / Interest</span>
            <select
              value={filterPropertyInterest}
              onChange={(e) => {
                setFilterPropertyInterest(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All (1 BHK, 2 BHK, etc.)</option>
              {PROPERTY_INTEREST_OPTIONS.filter((o) => o.value).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {(filterPropertyId || filterPropertyInterest) && (
            <button
              type="button"
              onClick={() => {
                setFilterPropertyId("");
                setFilterPropertyInterest("");
                setCurrentPage(1);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Clear filters
            </button>
          )}
        </div>
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-companyName"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-contactPerson"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-email"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-phone"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-dealValueAed"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-propertyId"
            >
              Property
            </label>
            <select
              id="modal-propertyId"
              name="propertyId"
              defaultValue={editingLead?.propertyId ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select property</option>
              {propertyOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-propertyInterest"
            >
              Property Interest
            </label>
            <select
              id="modal-propertyInterest"
              name="propertyInterest"
              defaultValue={editingLead?.propertyInterest ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {PROPERTY_INTEREST_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-stage"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-priority"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-source"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-assignedTo"
            >
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
            <label
              className="text-xs font-medium text-zinc-600"
              htmlFor="modal-notes"
            >
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

      {selectedLeadIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-sm">
          <span className="font-medium text-emerald-800">
            {selectedLeadIds.size} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkEditOpen(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Bulk edit
            </button>
            <button
              type="button"
              onClick={clearLeadSelection}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      <Modal
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        title={`Bulk edit ${selectedLeadIds.size} lead(s)`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBulkEditSubmit(new FormData(e.currentTarget));
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-xs text-zinc-500">
            Set the same value for all selected leads. Leave blank to keep
            current.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Stage</label>
            <select
              name="bulk-stage"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Keep current —</option>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Priority</label>
            <select
              name="bulk-priority"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Keep current —</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Assigned To</label>
            <select
              name="bulk-assignedTo"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Keep current —</option>
              <option value="Sheraz">Sheraz</option>
              <option value="Umair">Umair</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Property Interest</label>
            <select
              name="bulk-propertyInterest"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Keep current —</option>
              {PROPERTY_INTEREST_OPTIONS.filter((o) => o.value).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600">Property</label>
            <select
              name="bulk-propertyId"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Keep current —</option>
              {propertyOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkEditOpen(false)}
              className="min-h-[44px] rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {isPending ? "Updating…" : "Update selected"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteConfirmId != null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete lead?"
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to delete this lead? This action cannot be
          undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteConfirmId(null)}
            className="min-h-[44px] rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleDelete(deleteConfirmId ?? undefined)}
            disabled={isPending}
            className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
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
                className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm ${
                  selectedLeadIds.has(lead._id ?? "")
                    ? "border-emerald-400 bg-emerald-50/50"
                    : lead.calledAt
                      ? "border-sky-400 bg-sky-50/80"
                      : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <label className="shrink-0 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead._id ?? "")}
                        onChange={() => toggleSelectLead(lead._id)}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="sr-only">Select {lead.companyName}</span>
                    </label>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="truncate text-sm font-semibold text-zinc-800">
                        {lead.companyName}
                      </h3>
                      <p className="truncate text-xs text-zinc-500">
                        {lead.contactPerson}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    {lead.calledAt && (
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-medium text-sky-700">
                        Called
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                      {stageLabel(lead.stage)}
                    </span>
                  </div>
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

                {(lead.propertyId || lead.propertyInterest) && (
                  <p className="text-xs text-zinc-500">
                    Property:{" "}
                    {lead.propertyId
                      ? (propertyOptions.find((p) => p._id === lead.propertyId)
                          ?.name ?? lead.propertyId)
                      : propertyInterestLabel(lead.propertyInterest)}
                  </p>
                )}

                {lead.notes && (
                  <p className="line-clamp-3 text-xs text-zinc-500">
                    {lead.notes}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <span className="max-w-[100px] truncate text-[11px] text-zinc-400">
                    {lead._id}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {lead.phone && telUrl(lead.phone) && (
                      <a
                        href={telUrl(lead.phone)}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!lead._id) return;
                          await updateLeadMarkCalled(lead._id);
                          setLocalLeads((prev) =>
                            prev.map((l) =>
                              l._id === lead._id
                                ? { ...l, calledAt: new Date().toISOString() }
                                : l,
                            ),
                          );
                          window.location.href = telUrl(lead.phone);
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        aria-label="Call"
                      >
                        <PhoneIcon className="h-4 w-4" />
                        {lead.calledAt ? "Called" : "Call"}
                      </a>
                    )}
                    {lead.phone && whatsAppUrl(lead.phone) && (
                      <a
                        href={whatsAppUrl(lead.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#20BD5A]"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(lead._id)}
                      className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Duplicate
                    </button>
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
                      onClick={() => setDeleteConfirmId(lead._id ?? null)}
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

export function propertyInterestLabel(value: string): string {
  if (!value) return value;
  if (value === "detail_shop") return "Retail Shop";
  const found = PROPERTY_INTEREST_OPTIONS.find((o) => o.value === value);
  return found?.label ?? value;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
