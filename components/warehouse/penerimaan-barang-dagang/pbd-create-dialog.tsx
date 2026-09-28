"use client";

import { useState } from "react";
import type { PbdTim } from "@/services/penerimaan-barang-dagang-service";
import { createPbdHeaderAction } from "@/app/(app)/warehouse/penerimaan-barang-dagang/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { AddIcon, CalendarIcon, CloseIcon } from "./pbd-icons";
import { todayISO } from "./pbd-format";
import { PbdStatusDialog } from "./pbd-status-dialog";

const ACCENT = "#00897B";
const BORDER = "#E2E6EA";

export function PbdCreateDialog({
  tim,
  onClose,
  onCreated,
}: {
  tim: PbdTim;
  onClose: () => void;
  onCreated: (noPenerimaan: string) => void;
}) {
  const [tanggal, setTanggal] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );

  async function submit() {
    if (saving) return;
    setSaving(true);
    const res = await createPbdHeaderAction({ tglPenerimaan: tanggal, idTim: tim.idTim });
    setSaving(false);
    if (res.ok) {
      onCreated(res.noPenerimaan);
    } else {
      setError({ title: "Gagal Menyimpan", message: res.error });
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-[440px] overflow-hidden rounded-xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-2.5">
            <span
              className="grid place-items-center rounded-lg p-2"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              <AddIcon className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#1F2937]">
              {tim.namaTim} - Penerimaan Barang Dagang
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100 disabled:opacity-50"
              aria-label="Tutup"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-medium text-gray-600">
              Tanggal
            </span>
            <span className="relative block">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={saving}
                className="h-11 w-full rounded-lg border bg-white pl-10 pr-4 text-sm outline-none focus:border-[#00897B] focus:ring-1 focus:ring-[#00897B]"
                style={{ borderColor: BORDER }}
              />
            </span>
          </label>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border px-5 py-3 text-[15px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: BORDER }}
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg px-7 py-3 text-[15px] font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {saving ? "MENYIMPAN..." : "SIMPAN"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <PbdStatusDialog
          type="error"
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}
    </>
  );
}
