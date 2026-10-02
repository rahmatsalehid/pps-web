"use client";

import type { SpkDetail } from "@/services/spk-barang-jadi-service";
import { X } from "@/components/dashboard/icons";
import { spkFormatDate } from "./spk-format";
import { SpkCheckCircleIcon, SpkPrinterIcon } from "./spk-icons";

const BORDER = "#E2E6EA";
const MUTED = "#6B7280";
const SUCCESS = "#0A7349";

export function SpkSuccessDialog({
  detail,
  onClose,
  onView,
  onPrint,
}: {
  detail: SpkDetail;
  onClose: () => void;
  onView: () => void;
  onPrint: () => void;
}) {
  const totalQty = detail.items.reduce((sum, i) => sum + i.qtySpk, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              SPK Berhasil Dibuat
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Surat Perintah Kerja tersimpan
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
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <SpkCheckCircleIcon
              style={{ width: 44, height: 44, color: SUCCESS }}
            />
            <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-[#6B7280]">
              Nomor SPK
            </p>
            <p className="text-xl font-extrabold tracking-tight text-[#1A1D23]">
              {detail.noSpk}
            </p>
          </div>

          <div
            className="grid grid-cols-3 gap-2 rounded-md border px-3 py-2.5"
            style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Tanggal
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                {spkFormatDate(detail.tanggal)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Barang
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                {detail.items.length}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                Total Qty
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                {totalQty}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2.5 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border px-4 py-2.5 text-[13px] font-semibold hover:bg-gray-50"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onView}
            className="flex-1 rounded-md px-4 py-2.5 text-[13px] font-bold text-white"
            style={{ backgroundColor: "#1E6FD9" }}
          >
            Lihat SPK
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="flex flex-[1.2] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white"
            style={{ backgroundColor: SUCCESS }}
          >
            <SpkPrinterIcon className="h-4 w-4" />
            Cetak SPK
          </button>
        </div>
      </div>
    </div>
  );
}
