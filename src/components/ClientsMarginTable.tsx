"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatEnergyPerRequest,
  formatEnergyWh,
  formatPercent,
  marginColor,
} from "@/lib/format";

export type ClientMarginRow = {
  clientId: string;
  name: string;
  redFlag: boolean;
  totalRevenue: number;
  totalCost: number;
  margin: number;
  marginPercent: number | null;
  energyWhPerRequest: number | null;
  totalEnergyWh: number;
};

const PAGE_SIZE = 10;

export function ClientsMarginTable({ rows }: { rows: ClientMarginRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);

  const from = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, rows.length);

  return (
    <div className="space-y-3">
      <div className="brand-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="brand-table-head">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">AI cost</th>
              <th className="px-4 py-3 font-medium">Margin</th>
              <th className="px-4 py-3 font-medium">Margin %</th>
              <th className="px-4 py-3 font-medium text-black">Energy / req</th>
              <th className="px-4 py-3 font-medium text-black">Total energy</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.clientId}
                className="border-t border-[var(--border)]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clients/${row.clientId}`}
                    className="font-medium text-black hover:underline"
                  >
                    {row.name}
                    {row.redFlag && <span className="brand-chip">Flag</span>}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(row.totalRevenue)}
                </td>
                <td className="px-4 py-3">{formatCurrency(row.totalCost)}</td>
                <td className="px-4 py-3">{formatCurrency(row.margin)}</td>
                <td
                  className={`px-4 py-3 ${marginColor(row.marginPercent, row.redFlag)}`}
                >
                  {formatPercent(row.marginPercent)}
                </td>
                <td className="px-4 py-3 font-semibold text-black">
                  {formatEnergyPerRequest(row.energyWhPerRequest)}
                </td>
                <td className="px-4 py-3 font-semibold text-black">
                  {formatEnergyWh(row.totalEnergyWh)}
                  <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                    est.
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-sm text-[var(--muted)]">
            Showing {from}–{to} of {rows.length}
          </p>
          <nav
            className="flex flex-wrap items-center gap-1"
            aria-label="Clients table pages"
          >
            <button
              type="button"
              className="brand-btn-ghost min-w-9 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                  className={
                    pageNum === currentPage
                      ? "brand-btn min-w-9 px-2 py-1.5 text-sm"
                      : "brand-btn-ghost min-w-9 px-2 py-1.5 text-sm"
                  }
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}
            <button
              type="button"
              className="brand-btn-ghost min-w-9 px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
