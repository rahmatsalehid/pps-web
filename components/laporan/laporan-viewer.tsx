"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getWarehouseOptionsAction,
  runLaporanAction,
} from "@/app/(app)/laporan/actions";
import type {
  LaporanField,
  LaporanSpec,
} from "@/components/laporan/laporan-catalog";
import type { LaporanData } from "@/services/laporan-service";
import { Loader2Icon } from "@/components/dashboard/icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthStartStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function resolveDefault(field: LaporanField): string {
  if (field.type === "date") {
    if (field.default === "today") return todayStr();
    if (field.default === "monthStart") return monthStartStr();
    return field.default;
  }
  if (field.type === "number") return String(field.default);
  return field.default;
}

function toCsv(data: LaporanData): string {
  const esc = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = data.columns.map((c) => esc(c.label)).join(",");
  const body = data.rows
    .map((row) => data.columns.map((c) => esc(row[c.key])).join(","))
    .join("\r\n");
  const bom = String.fromCharCode(0xfeff);
  return `${bom}${head}\r\n${body}`;
}

function exportCsv(filename: string, data: LaporanData) {
  const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

export function LaporanViewer({ spec }: { spec: LaporanSpec }) {
  const isPdf = spec.kind === "pdf";
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const field of spec.fields) init[field.key] = resolveDefault(field);
    return init;
  });
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSelect = useMemo(
    () => spec.fields.some((f) => f.type === "select" && f.optionsSource === "warehouse"),
    [spec.fields],
  );

  useEffect(() => {
    if (!hasSelect) return;
    let cancelled = false;
    void (async () => {
      const res = await getWarehouseOptionsAction();
      if (cancelled) return;
      if (res.ok) {
        setOptions((o) => ({ ...o, warehouse: res.options }));
      } else {
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSelect]);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await runLaporanAction(spec.kode, values);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setData(res.data);
    setRan(true);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-bold text-gray-800">
              {spec.title}
            </h1>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
              Laporan
            </span>
          </div>
          <p className="text-[12px] text-gray-500">
            Atur filter lalu tekan Tampilkan untuk memuat data
          </p>
        </div>
        <Link
          href="/laporan"
          className="rounded-lg border bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          ← Kembali ke Daftar Laporan
        </Link>
      </div>

      {error && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <section
        className="overflow-hidden rounded-xl border bg-white"
        style={{ borderColor: BORDER }}
      >
        <div className="flex flex-wrap items-end gap-3 border-b p-3" style={{ borderColor: BORDER }}>
          {spec.fields.map((field) => (
            <label key={field.key} className="block min-w-[160px]">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {field.label}
                <span className="ml-0.5 text-[#B91C1C]">*</span>
              </span>
              {field.type === "select" ? (
                <select
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  {field.options
                    ? field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    : (options[field.key] ?? [field.default]).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                </select>
              ) : (
                <input
                  type={field.type === "date" ? "date" : "number"}
                  value={values[field.key] ?? ""}
                  min={field.type === "number" ? 1 : undefined}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              )}
            </label>
          ))}

          {isPdf ? (
            <button
              type="button"
              title="Buka laporan PDF di tab baru"
              onClick={() => {
                const qs = new URLSearchParams(values).toString();
                window.open(`/api/laporan-pdf/${spec.kode}?${qs}`, "_blank");
              }}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold text-white"
              style={{ background: PRIMARY }}
            >
              BUKA PDF
            </button>
          ) : (
            <>
              <button
                type="button"
                title="Jalankan laporan dengan filter saat ini"
                onClick={() => void run()}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: PRIMARY }}
              >
                {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                TAMPILKAN
              </button>

              <button
                type="button"
                title="Unduh data laporan sebagai file CSV"
                onClick={() => {
                  if (data) exportCsv(`${spec.kode}-${todayStr()}.csv`, data);
                }}
                disabled={!data || data.rows.length === 0}
                className="rounded-lg border px-4 py-2 text-[12px] font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: BORDER }}
              >
                EXPORT CSV
              </button>

              {data && (
                <span className="py-2 text-[12px] font-semibold text-gray-500">
                  {`${data.totalRows} baris`}
                </span>
              )}
            </>
          )}
        </div>

        {isPdf ? (
          <div className="p-4 text-[12.5px] leading-relaxed text-gray-600">
            Laporan ini berbentuk PDF. Isi filter (tanda{" "}
            <span className="text-[#B91C1C]">*</span> wajib), lalu tekan{" "}
            <span className="font-bold" style={{ color: PRIMARY }}>
              BUKA PDF
            </span>{" "}
            untuk membuka hasil laporan di tab baru.
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead className="sticky top-0 bg-white">
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-2 py-2 font-semibold text-gray-500">#</th>
                {(data?.columns ?? []).map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-2 py-2 font-semibold text-gray-500"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={(data?.columns.length ?? 0) + 1}
                    className="px-2 py-8 text-center"
                  >
                    <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                  </td>
                </tr>
              )}
              {!loading && !ran && (
                <tr>
                  <td
                    colSpan={(data?.columns.length ?? 0) + 1}
                    className="px-2 py-8 text-center text-gray-400"
                  >
                    Atur filter lalu tekan TAMPILKAN untuk memuat data laporan
                  </td>
                </tr>
              )}
              {!loading && ran && data && data.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={data.columns.length + 1}
                    className="px-2 py-8 text-center text-gray-400"
                  >
                    Tidak ada data untuk filter tersebut
                  </td>
                </tr>
              )}
              {!loading &&
                data?.rows.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <td className="px-2 py-1.5 font-semibold text-gray-500">
                      {index + 1}
                    </td>
                    {data.columns.map((col) => (
                      <td
                        key={col.key}
                        className="whitespace-nowrap px-2 py-1.5 text-gray-800"
                      >
                        {cellText(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-relaxed text-blue-800">
        <span className="font-bold">Cara pakai: </span>
        {isPdf ? (
          <>
            Isi filter (tanda <span className="text-[#B91C1C]">*</span> wajib),
            lalu tekan BUKA PDF untuk membuka laporan di tab baru.
          </>
        ) : (
          <>
            Isi filter (tanda <span className="text-[#B91C1C]">*</span> wajib),
            tekan TAMPILKAN untuk memuat data, lalu EXPORT CSV untuk mengunduh
            hasilnya.
          </>
        )}
      </div>
    </div>
  );
}
