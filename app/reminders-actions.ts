"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { getDb } from "../lib/mongodb";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../lib/google-calendar";

export interface Reminder {
  _id?: string;
  title: string;
  reminderAt: Date;
  leadId?: string | null;
  propertyId?: string | null;
  notes?: string;
  /** Google Calendar event id when synced */
  googleEventId?: string | null;
}

const COLLECTION = "reminders";

function toReminder(doc: { _id: { toString(): string }; title?: string; reminderAt?: Date; leadId?: string; propertyId?: string; notes?: string; googleEventId?: string | null }): Reminder {
  return {
    _id: doc._id.toString(),
    title: doc.title ?? "",
    reminderAt: doc.reminderAt ? new Date(doc.reminderAt) : new Date(),
    leadId: doc.leadId ?? null,
    propertyId: doc.propertyId ?? null,
    notes: doc.notes ?? "",
    googleEventId: doc.googleEventId ?? null,
  };
}

export async function listRemindersForRange(
  startDate: Date,
  endDate: Date,
): Promise<Reminder[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const docs = await col
    .find({
      reminderAt: { $gte: startDate, $lte: endDate },
    })
    .sort({ reminderAt: 1 })
    .toArray();
  return docs.map((d) => toReminder(d as Parameters<typeof toReminder>[0]));
}

export async function createReminder(formData: FormData) {
  const db = await getDb();
  const col = db.collection(COLLECTION);

  const title = String(formData.get("title") || "").trim();
  const dateStr = String(formData.get("date") || "").trim();
  const timeStr = String(formData.get("time") || "").trim();
  const leadId = formData.get("leadId") ? String(formData.get("leadId")).trim() : null;
  const propertyId = formData.get("propertyId") ? String(formData.get("propertyId")).trim() : null;
  const notes = String(formData.get("notes") || "").trim();

  if (!title) throw new Error("Title is required");
  if (!dateStr) throw new Error("Date is required");

  const [y, m, d] = dateStr.split("-").map(Number);
  let hours = 9;
  let minutes = 0;
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    hours = h ?? 9;
    minutes = min ?? 0;
  }
  const reminderAt = new Date(y, m - 1, d, hours, minutes, 0, 0);
  const endAt = new Date(reminderAt.getTime() + 30 * 60 * 1000);

  const doc = {
    title,
    reminderAt,
    leadId: leadId || null,
    propertyId: propertyId || null,
    notes,
    googleEventId: null as string | null,
    createdAt: new Date(),
  };
  const result = await col.insertOne(doc);

  const eventId = await createCalendarEvent({
    title,
    startTime: reminderAt,
    endTime: endAt,
    description: notes || undefined,
  });
  if (eventId) {
    await col.updateOne(
      { _id: result.insertedId },
      { $set: { googleEventId: eventId } },
    );
  }

  revalidatePath("/");
}

export async function updateReminder(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Reminder ID required");

  const db = await getDb();
  const col = db.collection(COLLECTION);

  const title = String(formData.get("title") || "").trim();
  const dateStr = String(formData.get("date") || "").trim();
  const timeStr = String(formData.get("time") || "").trim();
  const leadId = formData.get("leadId") ? String(formData.get("leadId")).trim() : null;
  const propertyId = formData.get("propertyId") ? String(formData.get("propertyId")).trim() : null;
  const notes = String(formData.get("notes") || "").trim();

  if (!title) throw new Error("Title is required");
  if (!dateStr) throw new Error("Date is required");

  const [y, m, d] = dateStr.split("-").map(Number);
  let hours = 9;
  let minutes = 0;
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    hours = h ?? 9;
    minutes = min ?? 0;
  }
  const reminderAt = new Date(y, m - 1, d, hours, minutes, 0, 0);
  const endAt = new Date(reminderAt.getTime() + 30 * 60 * 1000);

  const existing = await col.findOne({ _id: new ObjectId(id) }) as { googleEventId?: string } | null;
  const googleEventId = existing?.googleEventId;

  if (googleEventId) {
    await updateCalendarEvent(googleEventId, {
      title,
      startTime: reminderAt,
      endTime: endAt,
      description: notes || undefined,
    });
  }

  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title,
        reminderAt,
        leadId: leadId || null,
        propertyId: propertyId || null,
        notes,
        updatedAt: new Date(),
      },
    },
  );
  revalidatePath("/");
}

export async function deleteReminder(id: string) {
  if (!id) return;
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const doc = await col.findOne({ _id: new ObjectId(id) }) as { googleEventId?: string } | null;
  if (doc?.googleEventId) {
    await deleteCalendarEvent(doc.googleEventId);
  }
  await col.deleteOne({ _id: new ObjectId(id) });
  revalidatePath("/");
}
