"use server";

import { ObjectId } from "mongodb";
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
  stage: LeadStage;
  priority: LeadPriority;
  source: string;
  assignedTo: "Sheraz" | "Umair";
  notes?: string;
}

const COLLECTION = "leads";

function toLead(doc: { _id: { toString(): string }; companyName?: string; contactPerson?: string; email?: string; phone?: string; dealValueAed?: number; propertyInterest?: string; stage?: string; priority?: string; source?: string; assignedTo?: string; notes?: string }): Lead {
  return {
    _id: doc._id.toString(),
    companyName: doc.companyName ?? "",
    contactPerson: doc.contactPerson ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    dealValueAed: doc.dealValueAed ?? 0,
    propertyInterest: doc.propertyInterest ?? "",
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
    stage,
    priority,
    source,
    assignedTo,
    notes,
    createdAt: new Date(),
  });
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { stage, updatedAt: new Date() } },
  );
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
        stage,
        priority,
        source,
        assignedTo,
        notes,
        updatedAt: new Date(),
      },
    },
  );
}

export async function deleteLead(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.deleteOne({ _id: new ObjectId(id) });
}

