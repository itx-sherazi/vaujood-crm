"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { getDb } from "../lib/mongodb";

export type PropertyStatus = "available" | "under_offer" | "sold";

export type PropertyType = "residential" | "commercial" | "residential_commercial" | "industrial" | "land";

export interface Property {
  _id?: string;
  name: string;
  location: string;
  type: PropertyType;
  /** Legacy single price; use priceResidential / priceCommercial when set */
  price: number;
  /** Residential rate (PKR) – can be set alongside commercial */
  priceResidential: number;
  /** Commercial rate (PKR) – can be set alongside residential */
  priceCommercial: number;
  sizeSqft: number;
  /** Showrooms 1-5+ or unit type: retail_shop, food_court, offices, etc. */
  bedrooms: string | number | null;
  status: PropertyStatus;
  shortDescription: string;
}

const COLLECTION = "properties";

export async function listProperties(): Promise<Property[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc: { _id: { toString(): string }; name?: string; location?: string; type?: string; price?: number; priceResidential?: number; priceCommercial?: number; sizeSqft?: number; bedrooms?: string | number | null; status?: string; shortDescription?: string }): Property => ({
    _id: doc._id.toString(),
    name: doc.name ?? "",
    location: doc.location ?? "",
    type: (doc.type ?? "residential") as PropertyType,
    price: doc.price ?? 0,
    priceResidential: doc.priceResidential ?? 0,
    priceCommercial: doc.priceCommercial ?? 0,
    sizeSqft: doc.sizeSqft ?? 0,
    bedrooms: doc.bedrooms != null ? String(doc.bedrooms) : null,
    status: (doc.status ?? "available") as PropertyStatus,
    shortDescription: doc.shortDescription ?? "",
  }));
}

export async function listPropertiesPaginated(
  page: number,
  limit: number,
): Promise<{ properties: Property[]; total: number }> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    col.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(),
  ]);
  const properties = docs.map((doc: { _id: { toString(): string }; name?: string; location?: string; type?: string; price?: number; priceResidential?: number; priceCommercial?: number; sizeSqft?: number; bedrooms?: string | number | null; status?: string; shortDescription?: string }): Property => ({
    _id: doc._id.toString(),
    name: doc.name ?? "",
    location: doc.location ?? "",
    type: (doc.type ?? "residential") as PropertyType,
    price: doc.price ?? 0,
    priceResidential: doc.priceResidential ?? 0,
    priceCommercial: doc.priceCommercial ?? 0,
    sizeSqft: doc.sizeSqft ?? 0,
    bedrooms: doc.bedrooms != null ? String(doc.bedrooms) : null,
    status: (doc.status ?? "available") as PropertyStatus,
    shortDescription: doc.shortDescription ?? "",
  }));
  return { properties, total };
}

/** Lightweight list for dropdowns (e.g. in Lead form) */
export async function getPropertyOptions(): Promise<{ _id: string; name: string }[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col.find({}).sort({ name: 1 }).project({ name: 1 }).toArray();
  return docs.map((d) => ({ _id: d._id.toString(), name: d.name ?? "" }));
}

export async function createProperty(formData: FormData) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const name = String(formData.get("name") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const type = formData.get("type") as PropertyType;
  const price = Number(formData.get("price") || 0);
  const priceResidential = Number(formData.get("priceResidential") || 0);
  const priceCommercial = Number(formData.get("priceCommercial") || 0);
  const sizeSqft = Number(formData.get("sizeSqft") || 0);
  const bedroomsRaw = formData.get("bedrooms");
  const status = formData.get("status") as PropertyStatus;
  const shortDescription = String(formData.get("shortDescription") || "").trim();

  const bedrooms =
    bedroomsRaw === null || bedroomsRaw === ""
      ? null
      : String(bedroomsRaw).trim();

  if (!name || !location || !type || !status) {
    throw new Error("Missing required fields");
  }

  await col.insertOne({
    name,
    location,
    type,
    price,
    priceResidential,
    priceCommercial,
    sizeSqft,
    bedrooms,
    status,
    shortDescription,
    createdAt: new Date(),
  });
  revalidatePath("/");
}

export async function updateProperty(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Property ID required");

  const db = await getDb();
  const col = db.collection(COLLECTION);

  const name = String(formData.get("name") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const type = formData.get("type") as PropertyType;
  const price = Number(formData.get("price") || 0);
  const priceResidential = Number(formData.get("priceResidential") || 0);
  const priceCommercial = Number(formData.get("priceCommercial") || 0);
  const sizeSqft = Number(formData.get("sizeSqft") || 0);
  const bedroomsRaw = formData.get("bedrooms");
  const status = formData.get("status") as PropertyStatus;
  const shortDescription = String(formData.get("shortDescription") || "").trim();

  const bedrooms =
    bedroomsRaw === null || bedroomsRaw === ""
      ? null
      : String(bedroomsRaw).trim();

  if (!name || !location || !type || !status) {
    throw new Error("Missing required fields");
  }

  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        name,
        location,
        type,
        price,
        priceResidential,
        priceCommercial,
        sizeSqft,
        bedrooms,
        status,
        shortDescription,
        updatedAt: new Date(),
      },
    },
  );
  revalidatePath("/");
}

export async function duplicateProperty(id: string) {
  if (!id) throw new Error("Property ID required");
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("Property not found");
  const { _id, ...rest } = doc;
  await col.insertOne({ ...rest, createdAt: new Date() });
  revalidatePath("/");
}

export async function deleteProperty(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/");
}

/** Bulk update selected properties (status, type). */
export async function updatePropertiesBulk(
  ids: string[],
  updates: { status?: PropertyStatus; type?: PropertyType },
) {
  if (!ids.length) return;
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.status != null) set.status = updates.status;
  if (updates.type != null) set.type = updates.type;
  if (Object.keys(set).length <= 1) return;
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { $set: set },
  );
  revalidatePath("/");
}

