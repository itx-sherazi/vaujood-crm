/**
 * Google Calendar integration using service account.
 * Uses GOOGLE_CALENDAR_ID and GOOGLE_SERVICE_ACCOUNT_JSON from .env.
 * Share the target calendar with: cu-holdings@crm-calendar-notification.iam.gserviceaccount.com
 */

import { google } from "googleapis";

const TIMEZONE = "Asia/Karachi";

function normalizeKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

function getCredentials():
  | { client_email: string; private_key: string }
  | null {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON missing in environment");
    return null;
  }
  try {
    const parsed = JSON.parse(jsonStr) as { client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: normalizeKey(parsed.private_key) };
    }
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON missing client_email or private_key");
  } catch (e) {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON parse error:", (e as Error).message);
  }
  return null;
}

function getCalendarId(): string | null {
  return process.env.GOOGLE_CALENDAR_ID ?? null;
}

function isConfigured(): boolean {
  return !!getCredentials() && !!getCalendarId();
}

function toRFC3339(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day}T${h}:${min}:${s}`;
}

/**
 * Create a calendar event. Returns event id or null if not configured or on error.
 */
export async function createCalendarEvent(params: {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}): Promise<string | null> {
  const creds = getCredentials();
  const calendarId = getCalendarId();
  if (!creds || !calendarId) return null;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const start = toRFC3339(params.startTime);
    const end = toRFC3339(params.endTime);
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: params.title,
        description: params.description ?? undefined,
        start: { dateTime: start, timeZone: TIMEZONE },
        end: { dateTime: end, timeZone: TIMEZONE },
        reminders: {
          useDefault: true,
        },
      },
      sendUpdates: "all",
    });
    return res.data.id ?? null;
  } catch (err) {
    // Surface in server logs so misconfiguration is visible during dev
    console.error("Google Calendar createEvent failed", err);
    return null;
  }
}

/**
 * Update an existing calendar event. Returns true on success.
 */
export async function updateCalendarEvent(
  eventId: string,
  params: {
    title: string;
    startTime: Date;
    endTime: Date;
    description?: string;
  },
): Promise<boolean> {
  const creds = getCredentials();
  const calendarId = getCalendarId();
  if (!creds || !calendarId) return false;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const start = toRFC3339(params.startTime);
    const end = toRFC3339(params.endTime);
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: params.title,
        description: params.description ?? undefined,
        start: { dateTime: start, timeZone: TIMEZONE },
        end: { dateTime: end, timeZone: TIMEZONE },
      },
      sendUpdates: "all",
    });
    return true;
  } catch (err) {
    console.error("Google Calendar updateEvent failed", err);
    return false;
  }
}

/**
 * Delete a calendar event. Returns true on success.
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const creds = getCredentials();
  const calendarId = getCalendarId();
  if (!creds || !calendarId) return false;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all",
    });
    return true;
  } catch (err) {
    console.error("Google Calendar deleteEvent failed", err);
    return false;
  }
}

export { isConfigured };
