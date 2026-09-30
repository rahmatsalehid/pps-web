"use client";

import { useState } from "react";
import { X } from "@/components/dashboard/icons";
import { soMonthName } from "./so-format";
import { SoChevronDownIcon } from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

export function SoPeriodPickerDialog({
  initialYear,
  initialMonth,
  onPick,
  onClose,
}: {
  initialYear: number;
  initialMonth: number;
  onPick: (period: { year: number; month: number }) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#111827]">
              Pilih Periode Riwayat
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Lihat riwayat stock opname pada bulan yang dipilih.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex gap-2.5">
            <label className="min-w-0 flex-[3]">
              <span className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                Bulan
              </span>
              <div
                className="relative rounded-[10px] border bg-white"
                style={{ borderColor: BORDER }}
              >
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-10 w-full appearance-none rounded-[10px] bg-transparent px-3 pr-8 text-[13px] font-semibold text-[#111827] outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {soMonthName(m)}
                    </option>
                  ))}
                </select>
                <SoChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </label>
            <label className="min-w-0 flex-[2]">
              <span className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                Tahun
              </span>
              <div
                className="relative rounded-[10px] border bg-white"
                style={{ borderColor: BORDER }}
              >
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="h-10 w-full appearance-none rounded-[10px] bg-transparent px-3 pr-8 text-[13px] font-semibold text-[#111827] outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <SoChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onPick({ year, month })}
              className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
