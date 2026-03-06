"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { getDb } from "../lib/mongodb";
import { getPropertyOptions } from "./properties-actions";

export type LeadStage =
  | "new_lead"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type LeadPriority = "High" | "Medium" | "Low";

export interface Lead {
  _id?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  dealValueAed: number;
  propertyInterest: string;
  /** Selected property from Properties list */
  propertyId?: string | null;
  stage: LeadStage;
  priority: LeadPriority;
  source: string;
  assignedTo: "Sheraz" | "Umair";
  notes?: string;
  /** When the lead was last marked as called (click on Call button) */
  calledAt?: string;
}

const COLLECTION = "leads";

function toLead(doc: { _id: { toString(): string }; companyName?: string; contactPerson?: string; email?: string; phone?: string; dealValueAed?: number; propertyInterest?: string; propertyId?: string; stage?: string; priority?: string; source?: string; assignedTo?: string; notes?: string; calledAt?: Date | string }): Lead {
  return {
    _id: doc._id.toString(),
    companyName: doc.companyName ?? "",
    contactPerson: doc.contactPerson ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    dealValueAed: doc.dealValueAed ?? 0,
    propertyInterest: doc.propertyInterest ?? "",
    propertyId: doc.propertyId ?? null,
    stage: (doc.stage as LeadStage) ?? "new_lead",
    priority: (doc.priority as LeadPriority) ?? "High",
    source: doc.source ?? "",
    assignedTo: (doc.assignedTo as "Sheraz" | "Umair") ?? "Sheraz",
    notes: doc.notes ?? "",
    calledAt: doc.calledAt ? (typeof doc.calledAt === "string" ? doc.calledAt : new Date(doc.calledAt).toISOString()) : undefined,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => toLead(d as Parameters<typeof toLead>[0]));
}

export type LeadListFilters = {
  propertyId?: string;
  propertyInterest?: string;
};

export async function listLeadsPaginated(
  page: number,
  limit: number,
  filters?: LeadListFilters,
): Promise<{ leads: Lead[]; total: number }> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const query: Record<string, unknown> = {};
  if (filters?.propertyId && filters.propertyId.trim()) query.propertyId = filters.propertyId.trim();
  if (filters?.propertyInterest != null && String(filters.propertyInterest).trim()) query.propertyInterest = String(filters.propertyInterest).trim();
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(query),
  ]);
  const leads = docs.map((d) => toLead(d as Parameters<typeof toLead>[0]));
  return { leads, total };
}

/** For Kanban: load only recent N leads so 10k+ doesn't break the UI */
export async function listLeadsForKanban(
  limit: number = 1000,
): Promise<Lead[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => toLead(d as Parameters<typeof toLead>[0]));
}

/** Leads created on a given day (YYYY-MM-DD) for daily report. Day is in Pakistan time (UTC+5). */
export async function getLeadsForDailyReport(
  dateStr: string,
): Promise<Lead[]> {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return [];
  const [y, m, d] = parts;
  const pkOffsetMs = 5 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - pkOffsetMs);
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - pkOffsetMs);
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col
    .find({ createdAt: { $gte: start, $lte: end } })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map((d) => toLead(d as Parameters<typeof toLead>[0]));
}

export async function createLead(formData: FormData) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const companyName = String(formData.get("companyName") || "").trim();
  const contactPerson = String(formData.get("contactPerson") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dealValueAed = Number(formData.get("dealValueAed") || 0);
  const propertyInterest = String(formData.get("propertyInterest") || "").trim();
  const propertyIdRaw = formData.get("propertyId");
  const propertyId = propertyIdRaw && String(propertyIdRaw).trim() ? String(propertyIdRaw).trim() : null;
  const stage = (formData.get("stage") as LeadStage) || "new_lead";
  const priority = (formData.get("priority") as LeadPriority) || "High";
  const source = String(formData.get("source") || "").trim();
  const assignedTo =
    (formData.get("assignedTo") as "Sheraz" | "Umair") || "Sheraz";
  const notes = String(formData.get("notes") || "").trim();

  if (!companyName) {
    throw new Error("Company / Name is required");
  }

  await col.insertOne({
    companyName,
    contactPerson,
    email,
    phone,
    dealValueAed,
    propertyInterest,
    propertyId,
    stage,
    priority,
    source,
    assignedTo,
    notes,
    createdAt: new Date(),
  });
  revalidatePath("/");
}

/** Get cell value by trying possible column headers (sheet headers may vary) */
function getCell(row: Record<string, string>, ...possibleHeaders: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  for (const header of possibleHeaders) {
    const n = norm(header);
    for (const key of Object.keys(row)) {
      if (norm(key) === n) return String(row[key] ?? "").trim();
    }
  }
  return "";
}

const STAGE_MAP: Record<string, LeadStage> = {
  new_lead: "new_lead",
  "new lead": "new_lead",
  contacted: "contacted",
  qualified: "qualified",
  proposal: "proposal",
  negotiation: "negotiation",
  closed_won: "closed_won",
  "closed won": "closed_won",
  closed_lost: "closed_lost",
  "closed lost": "closed_lost",
};

const PRIORITY_MAP: Record<string, LeadPriority> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const ASSIGNED_MAP: Record<string, "Sheraz" | "Umair"> = {
  sheraz: "Sheraz",
  umair: "Umair",
};

/**
 * Import leads from XLSX rows. Each row is an object with keys = column headers.
 * Expected columns: Company / Name, Contact Person, Email, Phone, Deal Value (PKR), Property, Property Interest, Stage, Priority, Source, Assigned To, Notes
 */
export async function importLeadsBulk(
  rows: Record<string, string>[],
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const properties = await getPropertyOptions();
  const nameToId = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p._id]));

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const companyName = getCell(
      row,
      "Company / Name",
      "Company/Name",
      "Company",
      "company",
      "Name",
      "name",
    );
    if (!companyName) {
      errors.push(`Row ${i + 2}: Company/Name is required`);
      continue;
    }

    const contactPerson = getCell(row, "Contact Person", "Contact Person", "contactPerson");
    const email = getCell(row, "Email", "email");
    const phone = getCell(row, "Phone", "phone");
    const dealValueStr = getCell(row, "Deal Value (PKR)", "Deal Value (PKR)", "Deal Value", "dealValueAed");
    const dealValueAed = Number(dealValueStr) || 0;
    const propertyName = getCell(row, "Property", "property");
    const propertyId = propertyName
      ? nameToId.get(propertyName.trim().toLowerCase()) ?? null
      : null;
    const propertyInterest = getCell(row, "Property Interest", "Property Interest", "propertyInterest");
    const stageStr = getCell(row, "Stage", "stage");
    const stage: LeadStage =
      STAGE_MAP[stageStr.toLowerCase()] ?? "new_lead";
    const priorityStr = getCell(row, "Priority", "priority");
    const priority: LeadPriority =
      PRIORITY_MAP[priorityStr.toLowerCase()] ?? "High";
    const source = getCell(row, "Source", "source");
    const assignedStr = getCell(row, "Assigned To", "Assigned To", "Assigned T Notes", "assignedTo");
    const assignedTo: "Sheraz" | "Umair" =
      ASSIGNED_MAP[assignedStr.toLowerCase()] ?? "Sheraz";
    const notes = getCell(row, "Notes", "notes");

    try {
      await col.insertOne({
        companyName,
        contactPerson,
        email,
        phone,
        dealValueAed,
        propertyInterest: propertyInterest || "",
        propertyId: propertyId || null,
        stage,
        priority,
        source,
        assignedTo,
        notes: notes || "",
        createdAt: new Date(),
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : "Failed to insert"}`);
    }
  }

  revalidatePath("/");
  return { imported, skipped: rows.length - imported - errors.length, errors };
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { stage, updatedAt: new Date() } },
  );
  revalidatePath("/");
}

export async function updateLead(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Lead ID required");

  const db = await getDb();
  const col = db.collection(COLLECTION);

  const companyName = String(formData.get("companyName") || "").trim();
  const contactPerson = String(formData.get("contactPerson") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dealValueAed = Number(formData.get("dealValueAed") || 0);
  const propertyInterest = String(formData.get("propertyInterest") || "").trim();
  const propertyIdRaw = formData.get("propertyId");
  const propertyId = propertyIdRaw && String(propertyIdRaw).trim() ? String(propertyIdRaw).trim() : null;
  const stage = (formData.get("stage") as LeadStage) || "new_lead";
  const priority = (formData.get("priority") as LeadPriority) || "High";
  const source = String(formData.get("source") || "").trim();
  const assignedTo =
    (formData.get("assignedTo") as "Sheraz" | "Umair") || "Sheraz";
  const notes = String(formData.get("notes") || "").trim();

  if (!companyName) {
    throw new Error("Company / Name is required");
  }

  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        companyName,
        contactPerson,
        email,
        phone,
        dealValueAed,
        propertyInterest,
        propertyId,
        stage,
        priority,
        source,
        assignedTo,
        notes,
        updatedAt: new Date(),
      },
    },
  );
  revalidatePath("/");
}

export async function duplicateLead(id: string) {
  if (!id) throw new Error("Lead ID required");
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("Lead not found");
  const { _id, ...rest } = doc;
  await col.insertOne({ ...rest, createdAt: new Date() });
  revalidatePath("/");
}

export async function deleteLead(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/");
}

/** Mark lead as called (used when user clicks Call button). */
export async function updateLeadMarkCalled(id: string) {
  if (!id) return;
  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { calledAt: new Date(), updatedAt: new Date() } },
  );
  revalidatePath("/");
}

/** Bulk update selected leads with common fields (stage, priority, assignedTo, etc.). */
export async function updateLeadsBulk(
  ids: string[],
  updates: {
    stage?: LeadStage;
    priority?: LeadPriority;
    assignedTo?: "Sheraz" | "Umair";
    propertyInterest?: string;
    propertyId?: string | null;
  },
) {
  if (!ids.length) return;
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.stage != null) set.stage = updates.stage;
  if (updates.priority != null) set.priority = updates.priority;
  if (updates.assignedTo != null) set.assignedTo = updates.assignedTo;
  if (updates.propertyInterest != null) set.propertyInterest = updates.propertyInterest;
  if (updates.propertyId !== undefined) set.propertyId = updates.propertyId ?? null;
  if (Object.keys(set).length <= 1) return;
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { $set: set },
  );
  revalidatePath("/");
}

export type LeadStats = {
  byProperty: { propertyId: string; propertyName: string; count: number }[];
  bySource: { source: string; count: number }[];
  byStage: { stage: string; count: number }[];
};

export async function getLeadStats(): Promise<LeadStats> {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTION);
  const propsCol = db.collection("properties");

  const [byPropertyAgg, bySourceAgg, byStageAgg] = await Promise.all([
    leadsCol.aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: { $ifNull: ["$propertyId", ""] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    leadsCol.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $ifNull: ["$source", "(not set)"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    leadsCol.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $ifNull: ["$stage", "new_lead"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
  ]);

  const propertyIds = (byPropertyAgg.map((r) => r._id).filter((id) => id && id.length === 24) as string[]) || [];
  const nameMap: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const props = await propsCol.find({ _id: { $in: propertyIds.map((id) => new ObjectId(id)) } }).project({ name: 1 }).toArray();
    props.forEach((p) => { nameMap[p._id.toString()] = p.name ?? ""; });
  }

  const byProperty = byPropertyAgg.map((r) => ({
    propertyId: r._id ?? "",
    propertyName: r._id ? (nameMap[r._id] || r._id) : "(No property)",
    count: r.count,
  }));

  const bySource = bySourceAgg.map((r) => ({ source: r._id, count: r.count }));
  const stageLabels: Record<string, string> = {
    new_lead: "New Lead",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
  };
  const byStage = byStageAgg.map((r) => ({
    stage: stageLabels[r._id] ?? r._id,
    count: r.count,
  }));

  return { byProperty, bySource, byStage };
}

