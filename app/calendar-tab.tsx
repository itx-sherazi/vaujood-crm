"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listRemindersForRange,
  createReminder,
  updateReminder,
  deleteReminder,
  type Reminder,
} from "./reminders-actions";
import { getPropertyOptions } from "./properties-actions";
import { listLeadsPaginated } from "./leads-actions";
import Modal from "./components/Modal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getMonthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
function toTimeInputValue(date: Date) {
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

export default function CalendarTab() {
  const router = useRouter();
  const [current, setCurrent] = useState(() => new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateInputValue(new Date()));
  const [propertyOptions, setPropertyOptions] = useState<{ _id: string; name: string }[]>([]);
  const [leadOptions, setLeadOptions] = useState<{ _id: string; companyName: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  const start = getMonthStart(current);
  const end = getMonthEnd(current);

  useEffect(() => {
    listRemindersForRange(start, end).then(setReminders).finally(() => setLoading(false));
  }, [current.getFullYear(), current.getMonth()]);

  useEffect(() => {
    getPropertyOptions().then(setPropertyOptions);
    listLeadsPaginated(1, 500)
      .then((r) =>
        setLeadOptions(r.leads.map((l) => ({ _id: l._id ?? "", companyName: l.companyName }))),
      )
      .catch(() => {});
  }, []);

  const remindersByDay: Record<string, Reminder[]> = {};
  reminders.forEach((r) => {
    const key = formatDateKey(new Date(r.reminderAt));
    if (!remindersByDay[key]) remindersByDay[key] = [];
    remindersByDay[key].push(r);
  });

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const prevMonth = () => setCurrent(new Date(year, month - 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        if (editingReminder?._id) {
          formData.set("id", editingReminder._id);
          await updateReminder(formData);
        } else {
          await createReminder(formData);
        }
        setModalOpen(false);
        setEditingReminder(null);
        router.refresh();
        listRemindersForRange(start, end).then(setReminders);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteReminder(id);
        router.refresh();
        setReminders((prev) => prev.filter((r) => r._id !== id));
        setModalOpen(false);
        setEditingReminder(null);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const openAdd = (dateStr?: string) => {
    setEditingReminder(null);
    setSelectedDate(dateStr ?? toDateInputValue(new Date()));
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Follow-up reminders
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            ← Prev
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-zinc-800">
            {current.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="min-h-[36px] rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => openAdd()}
            className="min-h-[36px] rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600"
          >
            + Add reminder
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[400px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {WEEKDAYS.map((day) => (
                <th key={day} className="px-2 py-2 text-left text-xs font-medium text-zinc-600">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-100">
                {row.map((day, di) => {
                  const dateStr =
                    day !== null
                      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      : "";
                  const dayReminders = dateStr ? remindersByDay[dateStr] ?? [] : [];
                  return (
                    <td
                      key={di}
                      className="vertical-align-top border-r border-zinc-100 p-1 last:border-r-0"
                    >
                      <div className="flex min-h-[80px] flex-col rounded-lg bg-zinc-50/50 p-2">
                        {day !== null ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-zinc-700">{day}</span>
                              <button
                                type="button"
                                onClick={() => openAdd(dateStr)}
                                className="text-[10px] text-emerald-600 hover:underline"
                              >
                                + Add
                              </button>
                            </div>
                            <ul className="mt-1 space-y-1">
                              {dayReminders.map((r) => (
                                <li key={r._id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReminder(r);
                                      setSelectedDate(toDateInputValue(new Date(r.reminderAt)));
                                      setModalOpen(true);
                                    }}
                                    className="w-full truncate rounded bg-emerald-100 px-1.5 py-0.5 text-left text-[11px] text-emerald-800 hover:bg-emerald-200"
                                    title={r.notes || r.title}
                                  >
                                    {new Date(r.reminderAt).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    {r.title}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="text-center text-xs text-zinc-500">Loading reminders…</div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingReminder(null);
        }}
        title={editingReminder ? "Edit reminder" : "Add reminder"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {editingReminder?._id && (
            <input type="hidden" name="id" value={editingReminder._id} readOnly />
          )}
          <div>
            <label className="text-xs font-medium text-zinc-600">Title *</label>
            <input
              name="title"
              required
              defaultValue={editingReminder?.title}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              placeholder="Follow up with client"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600">Date *</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={
                  editingReminder
                    ? toDateInputValue(new Date(editingReminder.reminderAt))
                    : selectedDate
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Time</label>
              <input
                name="time"
                type="time"
                defaultValue={
                  editingReminder
                    ? toTimeInputValue(new Date(editingReminder.reminderAt))
                    : "09:00"
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Lead (optional)</label>
            <select
              name="leadId"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              defaultValue={editingReminder?.leadId ?? ""}
            >
              <option value="">—</option>
              {leadOptions.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Property (optional)</label>
            <select
              name="propertyId"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              defaultValue={editingReminder?.propertyId ?? ""}
            >
              <option value="">—</option>
              {propertyOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingReminder?.notes}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              placeholder="Follow-up notes"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {editingReminder?._id && (
              <button
                type="button"
                onClick={() => handleDelete(editingReminder._id!)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              {editingReminder ? "Save" : "Add reminder"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingReminder(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
