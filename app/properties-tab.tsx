"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "./properties-actions";
import {
  createProperty,
  updateProperty,
  deleteProperty,
  duplicateProperty,
  listPropertiesPaginated,
} from "./properties-actions";
import Modal from "./components/Modal";

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  residential_commercial: "Residential & Commercial",
  industrial: "Industrial",
  land: "Land",
};

const BEDROOMS_OPTIONS: { value: string; label: string }[] = [
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
  { value: "financial_and_institutional", label: "Financial and institutional" },
];

interface PropertiesTabProps {
  initialProperties: Property[];
  totalProperties: number;
  pageSize: number;
}

export default function PropertiesTab({
  initialProperties,
  totalProperties: initialTotal,
  pageSize,
}: PropertiesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [localProperties, setLocalProperties] =
    useState<Property[]>(initialProperties);
  const [totalProperties, setTotalProperties] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLocalProperties(initialProperties);
    setTotalProperties(initialTotal);
    setCurrentPage(1);
  }, [initialProperties, initialTotal]);

  const loadPage = (page: number) => {
    startTransition(async () => {
      const { properties, total } = await listPropertiesPaginated(page, pageSize);
      setLocalProperties(properties);
      setTotalProperties(total);
      setCurrentPage(page);
    });
  };

  const handleCreate = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createProperty(formData);
        setModalOpen(false);
        setEditingProperty(null);
        router.refresh();
        loadPage(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add property");
      }
    });
  };

  const handleEditSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateProperty(formData);
        setModalOpen(false);
        setEditingProperty(null);
        router.refresh();
        loadPage(currentPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update property");
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
        await deleteProperty(formData);
        setLocalProperties((prev) => prev.filter((p) => p._id !== id));
        setTotalProperties((t) => Math.max(0, t - 1));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete property");
      }
    });
  };

  const handleDuplicate = (id: string | undefined) => {
    if (!id) return;
    setError(null);
    startTransition(async () => {
      try {
        await duplicateProperty(id);
        router.refresh();
        loadPage(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to duplicate property");
      }
    });
  };

  const totalPages =
    totalProperties === 0 ? 1 : Math.ceil(totalProperties / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalProperties);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Properties List
        </h2>
        <button
          type="button"
          onClick={() => {
            setEditingProperty(null);
            setModalOpen(true);
          }}
          className="min-h-[44px] shrink-0 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600"
        >
          + Add Property
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProperty(null);
        }}
        title={editingProperty ? "Edit Property" : "Add Property"}
      >
        <form
          action={editingProperty ? handleEditSubmit : handleCreate}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {editingProperty && (
            <input
              type="hidden"
              name="id"
              value={editingProperty._id ?? ""}
              readOnly
            />
          )}

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-name">
              Name *
            </label>
            <input
              id="modal-name"
              name="name"
              required
              defaultValue={editingProperty?.name}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Downtown Heights - 3BR"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-location">
              Location *
            </label>
            <input
              id="modal-location"
              name="location"
              required
              defaultValue={editingProperty?.location}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Downtown Dubai"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-type">
              Type *
            </label>
            <select
              id="modal-type"
              name="type"
              required
              defaultValue={editingProperty?.type ?? "residential"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="residential_commercial">Residential & Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="land">Land</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-price">
              Price (PKR)
            </label>
            <input
              id="modal-price"
              name="price"
              type="number"
              min={0}
              defaultValue={editingProperty?.price ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="1500000"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-sizeSqft">
              Size (sqft)
            </label>
            <input
              id="modal-sizeSqft"
              name="sizeSqft"
              type="number"
              min={0}
              defaultValue={editingProperty?.sizeSqft ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="1800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-bedrooms">
              Bedrooms / Unit type
            </label>
            <select
              id="modal-bedrooms"
              name="bedrooms"
              defaultValue={
                editingProperty?.bedrooms != null
                  ? String(editingProperty.bedrooms)
                  : ""
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {BEDROOMS_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-status">
              Status *
            </label>
            <select
              id="modal-status"
              name="status"
              required
              defaultValue={editingProperty?.status}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="available">Available</option>
              <option value="under_offer">Under Offer</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-600" htmlFor="modal-shortDescription">
              Short Description
            </label>
            <textarea
              id="modal-shortDescription"
              name="shortDescription"
              rows={2}
              defaultValue={editingProperty?.shortDescription ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Brief internal notes or marketing description"
            />
          </div>

          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingProperty(null);
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
              {isPending ? "Saving…" : editingProperty ? "Save" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteConfirmId != null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete property?"
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to delete this property? This action cannot be undone.
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
        {totalProperties === 0
          ? "No properties"
          : `Showing ${startIndex + 1}–${endIndex} of ${totalProperties} properties`}
      </p>

      {localProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
          No properties yet. Click &quot;Add Property&quot; to add one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localProperties.map((property) => (
              <article
                key={property._id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="truncate text-sm font-semibold text-zinc-800">
                      {property.name}
                    </h3>
                    <p className="truncate text-xs text-zinc-500">
                      {property.location}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    {TYPE_LABELS[property.type] ?? property.type}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  {property.price > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                      PKR {property.price.toLocaleString()}
                    </span>
                  )}
                  {property.sizeSqft > 0 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-1">
                      {property.sizeSqft} sqft
                    </span>
                  )}
                  {property.bedrooms != null && String(property.bedrooms) !== "" && (
                    <span className="rounded-full bg-zinc-100 px-2 py-1">
                      {bedroomsLabel(String(property.bedrooms))}
                    </span>
                  )}
                  <StatusBadge status={property.status} />
                </div>

                {property.shortDescription && (
                  <p className="line-clamp-3 text-xs text-zinc-500">
                    {property.shortDescription}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  <span className="max-w-[120px] truncate text-[11px] text-zinc-400">
                    {property._id}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(property._id)}
                      className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProperty(property);
                        setModalOpen(true);
                      }}
                      className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(property._id ?? null)}
                      className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalProperties > pageSize && (
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

function bedroomsLabel(value: string): string {
  if (value === "detail_shop") return "Retail Shop"; // backward compatibility
  const found = BEDROOMS_OPTIONS.find((o) => o.value === value);
  if (found?.label) return found.label;
  if (["1", "2", "3", "4"].includes(value)) return `${value} BR`;
  if (value === "5+") return "5+ BR";
  return value;
}

function StatusBadge({ status }: { status: Property["status"] }) {
  if (status === "available") {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
        Available
      </span>
    );
  }
  if (status === "under_offer") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
        Under Offer
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-red-600">
      Sold
    </span>
  );
}
