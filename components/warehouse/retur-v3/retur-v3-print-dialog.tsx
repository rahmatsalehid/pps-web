"use client";

import { useState } from "react";
import { printReturLabelAction } from "@/app/(app)/warehouse/retur-v3/actions";
import type { ReturOutput } from "@/services/retur-v3-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { PrintIcon } from "./retur-v3-icons";
import { printPdfBase64 } from "./print-pdf";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

export function ReturV3PrintDialog({
  outputs,
  onPrinted,
  onClose,
}: {
  outputs: ReturOutput[];
  /** Setelah cetak selesai (printCount berubah). */
  onPrinted: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(outputs.map((o) => o.labelCode)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === outputs.length
        ? new Set()
        : new Set(outputs.map((o) => o.labelCode)),
    );
  }

  async function printAll() {
    if (busy || selected.size === 0) return;
    setBusy(true);
    setError(null);
    for (const out of outputs) {
      if (!selected.has(out.labelCode)) continue;
      const res = await printReturLabelAction(out.kodeKategori, out.labelCode);
      if (!res.ok) {
        setError(res.error);
        break;
      }
      printPdfBase64(res.pdfBase64, out.labelCode);
    }
    setBusy(false);
    onPrinted();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="text-sm font-extrabold text-[#1A1D23]">
            Pilih Label untuk Dicetak
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold"
              style={{ color: PRIMARY }}
            >
              {selected.size === outputs.length
                ? "Batalkan Semua"
                : "Pilih Semua"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {outputs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Belum ada label yang di-generate.
            </p>
          ) : (
            outputs.map((o) => {
              const active = selected.has(o.labelCode);
              return (
                <button
                  key={o.labelCode}
                  type="button"
                  onClick={() => toggle(o.labelCode)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left"
                  style={{
                    backgroundColor: active ? `${PRIMARY}0F` : "#fff",
                    border: `1px solid ${active ? `${PRIMARY}59` : "#E5E7EB"}`,
                  }}
                >
                  <span
                    className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded border"
                    style={{
                      borderColor: active ? PRIMARY : "#9CA3AF",
                      backgroundColor: active ? PRIMARY : "#fff",
                    }}
                  >
                    {active && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden
                      >
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-[#1A1D23]">
                      {o.namaJenis ?? "-"}
                    </span>
                    <span className="block truncate text-[9px] text-[#9CA3AF]">
                      {o.labelCode}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-[#1E6FD9]">
                    {o.qty} {o.uom ?? "pcs"}
                  </span>
                </button>
              );
            })
          )}
          {error && (
            <p className="pt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-t p-4" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={() => void printAll()}
            disabled={busy || selected.size === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {busy ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <PrintIcon className="h-4 w-4" />
            )}
            Cetak {selected.size} Label
          </button>
        </div>
      </div>
    </div>
  );
}
