"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { getDb } from "../lib/mongodb";

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
}

const COLLECTION = "leads";

function toLead(doc: { _id: { toString(): string }; companyName?: string; contactPerson?: string; email?: string; phone?: string; dealValueAed?: number; propertyInterest?: string; propertyId?: string; stage?: string; priority?: string; source?: string; assignedTo?: string; notes?: string }): Lead {
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

export async function listLeadsPaginated(
  page: number,
  limit: number,
): Promise<{ leads: Lead[]; total: number }> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    col.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(),
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

