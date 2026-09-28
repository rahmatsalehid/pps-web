"use client";

import { X } from "@/components/dashboard/icons";
import type { BsSak } from "@/services/bongkar-susun-service";
import { ListIcon } from "./bongkar-susun-icons";
import { formatNum } from "./format";

const BORDER = "#E2E6EA";
const HEADER = "#1565C0";

/** Dialog daftar sak per label (input maupun output). */
export function BongkarSusunSakDialog({
  labelCode,
  namaJenis,
  jumlahSak,
  totalBerat,
  saks,
  onClose,
}: {
  labelCode: string;
  namaJenis: string;
  jumlahSak: number;
  totalBerat: number;
  saks: BsSak[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center gap-2.5 px-5 py-3.5 text-white"
          style={{ backgroundColor: HEADER }}
        >
          <span className="rounded-lg bg-white/15 p-1.5">
            <ListIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {namaJenis || labelCode}
            </p>
            <p className="truncate text-[11px] text-white/75">{labelCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/15 p-1 hover:bg-white/25"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex items-center gap-4 px-5 py-2.5"
          style={{ backgroundColor: "#F0F7FF" }}
        >
          <span className="text-[11px] font-bold" style={{ color: HEADER }}>
            {jumlahSak} Sak
          </span>
          <span className="text-[11px] font-bold" style={{ color: "#0A7349" }}>
            {formatNum(totalBerat)} kg total
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto py-2">
          {saks.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-500">
              Tidak ada data sak
            </p>
          ) : (
            saks.map((s) => (
              <div
                key={`${s.noSak}-${s.berat}`}
                className="flex items-center gap-3 px-5 py-2.5"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold"
                  style={{ backgroundColor: "#E3F2FD", color: HEADER }}
                >
                  {s.noSak}
                </span>
                <span className="flex-1 text-[13px] font-semibold text-[#1A1D23]">
                  Sak {s.noSak}
                </span>
                <span className="text-[13px] font-bold text-[#1A1D23]">
                  {formatNum(s.berat)} kg
                </span>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-3.5" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
