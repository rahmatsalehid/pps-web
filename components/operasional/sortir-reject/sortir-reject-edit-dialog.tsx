"use client";

import { useEffect, useState } from "react";
import {
  getSrMastersAction,
  updateSortirRejectAction,
} from "@/app/(app)/operasional/sortir-reject/actions";
import type { SrMasters, SrTransaction } from "@/services/sortir-reject-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { CalendarIcon, EditIcon, WarehouseIcon } from "./sortir-reject-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

export function SortirRejectEditDialog({
  row,
  onClose,
  onUpdated,
}: {
  row: SrTransaction;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [masters, setMasters] = useState<SrMasters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idWarehouse, setIdWarehouse] = useState<number | null>(
    row.idWarehouse,
  );
  const [tanggal, setTanggal] = useState(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(row.tanggal);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSrMastersAction();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setMasters(res.masters);
      const exists =
        row.idWarehouse != null &&
        res.masters.warehouses.some((w) => w.idWarehouse === row.idWarehouse);
      if (!exists && res.masters.warehouses.length > 0) {
        setIdWarehouse(res.masters.warehouses[0].idWarehouse);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.idWarehouse]);

  async function submit() {
    if (busy || idWarehouse == null || !tanggal) return;
    setBusy(true);
    setError(null);
    const res = await updateSortirRejectAction({
      noSortir: row.noSortir,
      idWarehouse,
      tglBJSortir: tanggal,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{ backgroundColor: "#F8F9FB", borderBottom: `1px solid ${BORDER}` }}
        >
          <span
            className="grid place-items-center rounded-lg p-2"
            style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
          >
            <EditIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              Ubah Sortir Reject
            </p>
            <p className="text-xs font-medium text-[#8A94A6]">{row.noSortir}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#6B7280]">
              Tanggal
            </span>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={busy}
                className="h-11 w-full rounded-[10px] border bg-[#F8F9FB] pl-9 pr-3 text-sm font-medium text-[#1A1D23] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9] disabled:opacity-60"
                style={{ borderColor: BORDER }}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#6B7280]">
              Warehouse
            </span>
            {loading ? (
              <span className="inline-flex items-center gap-2 py-3 text-sm text-gray-500">
                <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat
                warehouse…
              </span>
            ) : (
              <div className="relative">
                <WarehouseIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
                <select
                  value={idWarehouse ?? ""}
                  onChange={(e) => setIdWarehouse(Number(e.target.value))}
                  disabled={busy}
                  className="h-11 w-full appearance-none rounded-[10px] border bg-[#F8F9FB] pl-9 pr-3 text-sm text-[#1A1D23] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9] disabled:opacity-60"
                  style={{ borderColor: BORDER }}
                >
                  <option value="" disabled>
                    PILIH WAREHOUSE
                  </option>
                  {masters?.warehouses.map((w) => (
                    <option key={w.idWarehouse} value={w.idWarehouse}>
                      {w.namaWarehouse}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {loadError && (
              <span className="mt-1.5 block text-xs text-red-600">{loadError}</span>
            )}
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div
          className="flex gap-2.5 px-5 pb-5"
          style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 flex-1 rounded-[10px] border text-sm font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || loading || idWarehouse == null || !tanggal}
            className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
            style={{
              backgroundColor:
                busy || loading || idWarehouse == null || !tanggal
                  ? undefined
                  : PRIMARY,
            }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
