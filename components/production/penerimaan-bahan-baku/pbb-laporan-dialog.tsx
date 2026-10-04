"use client";

import { useEffect, useMemo, useState } from "react";
import type { PbbLaporanRow } from "@/services/penerimaan-bahan-baku-service";
import { getPbbLaporanAction } from "@/app/(app)/production/penerimaan-bahan-baku/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { CloseIcon } from "./pbb-icons";
import { fmt } from "./pbb-potongan";

const BORDER = "#E2E6EA";

function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function PbbLaporanDialog({
  noPenerimaan,
  onClose,
}: {
  noPenerimaan: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PbbLaporanRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPbbLaporanAction(noPenerimaan);
      if (cancelled) return;
      if (res.ok) setRows(res.rows);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [noPenerimaan]);

  const totals = useMemo(
    () => ({
      sak: (rows ?? []).reduce((s, r) => s + r.jumlahSak, 0),
      berat: (rows ?? []).reduce((s, r) => s + r.berat, 0),
    }),
    [rows],
  );

  function print() {
    if (!rows) return;
    const body = rows
      .map(
        (r) =>
          `<tr><td>${esc(r.noBahanBaku)}</td><td>${esc(r.dateCreate ?? "")}</td><td>${esc(r.namaSupplier ?? "")}</td><td>${esc(r.noPlat ?? "")}</td><td>${esc(r.jenis ?? "")}</td><td>${r.noPallet}</td><td>${r.kondisi}</td><td class="n">${r.jumlahSak}</td><td class="n">${fmt(r.berat)}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan ${esc(noPenerimaan)}</title>
<style>body{font:12px Arial,sans-serif;margin:24px}h1{font-size:16px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#eee}.n{text-align:right}tfoot td{font-weight:bold}</style></head>
<body><h1>Laporan Penerimaan Bahan Baku</h1><div>${esc(noPenerimaan)}</div>
<table><thead><tr><th>No Bahan Baku</th><th>Tanggal</th><th>Supplier</th><th>No Plat</th><th>Jenis</th><th>Pallet</th><th>Kondisi</th><th>Sak</th><th>Berat (kg)</th></tr></thead>
<tbody>${body}</tbody>
<tfoot><tr><td colspan="7">Total</td><td class="n">${totals.sak}</td><td class="n">${fmt(totals.berat)}</td></tr></tfoot></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  function downloadCsv() {
    if (!rows) return;
    const head = ["NoBahanBaku", "Tanggal", "Supplier", "NoPlat", "Jenis", "Pallet", "Kondisi", "Sak", "Berat"];
    const lines = [head.join(",")].concat(
      rows.map((r) =>
        [r.noBahanBaku, r.dateCreate ?? "", r.namaSupplier ?? "", r.noPlat ?? "", r.jenis ?? "", r.noPallet, r.kondisi, r.jumlahSak, r.berat]
          .map(csvCell)
          .join(","),
      ),
    );
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${noPenerimaan}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#1F2937]">Laporan Penerimaan • {noPenerimaan}</p>
          <button type="button" onClick={print} disabled={!rows?.length} className="h-8 rounded-lg border px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: BORDER }}>
            Cetak
          </button>
          <button type="button" onClick={downloadCsv} disabled={!rows?.length} className="h-8 rounded-lg border px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: BORDER }}>
            CSV
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100" aria-label="Tutup">
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="h-px" style={{ backgroundColor: BORDER }} />
        <div className="min-h-0 flex-1 overflow-auto">
          {error ? (
            <p className="p-5 text-sm text-red-700">{error}</p>
          ) : !rows ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">Belum ada data</p>
          ) : (
            <table className="w-full min-w-[760px] text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-500">
                <tr>
                  {["No Bahan Baku", "Supplier", "No Plat", "Jenis", "Pallet", "Kondisi", "Sak", "Berat"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 font-semibold ${i >= 6 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.noBahanBaku}-${r.noPallet}-${r.kondisi}`} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="px-3 py-1.5 font-semibold">{r.noBahanBaku}</td>
                    <td className="px-3 py-1.5">{r.namaSupplier ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.noPlat ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.jenis ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.noPallet}</td>
                    <td className="px-3 py-1.5">{r.kondisi}</td>
                    <td className="px-3 py-1.5 text-right">{r.jumlahSak}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmt(r.berat)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-bold" style={{ borderColor: BORDER }}>
                <tr>
                  <td colSpan={6} className="px-3 py-2">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right">{totals.sak}</td>
                  <td className="px-3 py-2 text-right">{fmt(totals.berat)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
