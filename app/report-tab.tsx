"use client";

import { useState, useTransition } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getLeadsForDailyReport } from "./leads-actions";
import type { Lead } from "./leads-actions";
import { propertyInterestLabel } from "./leads-tab";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function formatReportDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildPdfAndDownload(dateStr: string, leads: Lead[]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  // Header block
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CU Holding CRM", margin, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Daily Activity Report", margin, 22);

  doc.setTextColor(0, 0, 0);
  y = 34;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(formatReportDate(dateStr), margin, y);
  doc.text(
    `${leads.length} lead(s) added`,
    pageW - margin - doc.getTextWidth(`${leads.length} lead(s) added`),
    y,
  );
  y += 10;

  const headers = [
    "Company / Name",
    "Contact Person",
    "Deal Value",
    "Property Interest",
    "Stage",
    "Priority",
    "Source",
    "Assigned To",
    "Notes",
  ];
  const rows = leads.map((l) => [
    l.companyName || "-",
    l.contactPerson || "-",
    l.dealValueAed > 0 ? "PKR " + l.dealValueAed.toLocaleString() : "-",
    propertyInterestLabel(l.propertyInterest) || "-",
    stageLabel(l.stage),
    l.priority || "-",
    l.source || "-",
    l.assignedTo || "-",
    (l.notes || "-").slice(0, 80) + ((l.notes || "").length > 80 ? "…" : ""),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [41, 41, 46],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7, textColor: [39, 39, 42] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: margin, right: margin },
    tableLineColor: [228, 228, 231],
    tableLineWidth: 0.2,
  });

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? y;
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    "Report generated from CU Holding CRM. Phone numbers and email omitted for privacy.",
    margin,
    y,
  );

  doc.save(`Daily-Report-${dateStr}.pdf`);
}

export default function ReportTab() {
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadReport = () => {
    startTransition(async () => {
      const list = await getLeadsForDailyReport(dateStr);
      setLeads(list);
    });
  };

  const downloadPdf = () => {
    if (!leads || leads.length === 0) return;
    buildPdfAndDownload(dateStr, leads);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-zinc-600"
            htmlFor="report-date"
          >
            Report date
          </label>
          <input
            id="report-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>
        <button
          type="button"
          onClick={loadReport}
          disabled={isPending}
          className="min-h-[44px] rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {isPending ? "Loading…" : "Generate report"}
        </button>
        {leads && leads.length > 0 && (
          <button
            type="button"
            onClick={downloadPdf}
            className="min-h-[44px] rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Download PDF
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Daily report shows all leads added on the selected date. Phone numbers
        and email are not included so you can forward or share the PDF safely.
      </p>

      {leads && (
        <>
          <p className="text-sm font-medium text-zinc-700">
            {formatReportDate(dateStr)} — {leads.length} lead(s)
          </p>
          {leads.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No leads added on this date.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Company / Name
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Contact Person
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Deal Value
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Property Interest
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Stage
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Priority
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Source
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Assigned To
                    </th>
                    <th className="px-3 py-2 font-medium text-zinc-700">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id} className="border-b border-zinc-100">
                      <td className="px-3 py-2 text-zinc-800">
                        {lead.companyName}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {lead.contactPerson}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {lead.dealValueAed > 0
                          ? "PKR " + lead.dealValueAed.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {propertyInterestLabel(lead.propertyInterest) || "-"}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {stageLabel(lead.stage)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {lead.priority}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {lead.source || "-"}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {lead.assignedTo}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-zinc-600">
                        {lead.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
