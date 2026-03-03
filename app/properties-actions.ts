"use server";

import { ObjectId } from "mongodb";
import { getDb } from "../lib/mongodb";

export type PropertyStatus = "available" | "under_offer" | "sold";

export type PropertyType = "residential" | "commercial" | "industrial" | "land";

export interface Property {
  _id?: string;
  name: string;
  location: string;
  type: PropertyType;
  price: number;
  sizeSqft: number;
  bedrooms: number | null;
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
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    name: doc.name,
    location: doc.location,
    type: doc.type,
    price: doc.price,
    sizeSqft: doc.sizeSqft,
    bedrooms: doc.bedrooms ?? null,
    status: doc.status,
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
  const properties = docs.map((doc) => ({
    _id: doc._id.toString(),
    name: doc.name,
    location: doc.location,
    type: doc.type,
    price: doc.price,
    sizeSqft: doc.sizeSqft,
    bedrooms: doc.bedrooms ?? null,
    status: doc.status,
    shortDescription: doc.shortDescription ?? "",
  }));
  return { properties, total };
}

export async function createProperty(formData: FormData) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const name = String(formData.get("name") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const type = formData.get("type") as PropertyType;
  const price = Number(formData.get("price") || 0);
  const sizeSqft = Number(formData.get("sizeSqft") || 0);
  const bedroomsRaw = formData.get("bedrooms");
  const status = formData.get("status") as PropertyStatus;
  const shortDescription = String(formData.get("shortDescription") || "").trim();

  const bedrooms =
    bedroomsRaw === null || bedroomsRaw === ""
      ? null
      : Number(bedroomsRaw);

  if (!name || !location || !type || !status) {
    throw new Error("Missing required fields");
  }

  await col.insertOne({
    name,
    location,
    type,
    price,
    sizeSqft,
    bedrooms,
    status,
    shortDescription,
    createdAt: new Date(),
  });
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
  const sizeSqft = Number(formData.get("sizeSqft") || 0);
  const bedroomsRaw = formData.get("bedrooms");
  const status = formData.get("status") as PropertyStatus;
  const shortDescription = String(formData.get("shortDescription") || "").trim();

  const bedrooms =
    bedroomsRaw === null || bedroomsRaw === ""
      ? null
      : Number(bedroomsRaw);

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
        sizeSqft,
        bedrooms,
        status,
        shortDescription,
        updatedAt: new Date(),
      },
    },
  );
}

export async function deleteProperty(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = await getDb();
  const col = db.collection(COLLECTION);
  await col.deleteOne({ _id: new ObjectId(id) });
}

