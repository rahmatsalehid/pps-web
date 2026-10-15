"use client";

import type { LrjPartialInfo } from "@/services/label-reject-service";
import { fmtBerat, fmtTanggalLong } from "./lrj-format";
import { LrjSplitIcon } from "./lrj-icons";

type Props = {
  noReject: string;
  x: number;
  y: number;
  info: LrjPartialInfo | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function LrjPartialPopover({
  noReject,
  x,
  y,
  info,
  loading,
  error,
  onClose,
}: Props) {
  const left = Math.min(x, typeof window !== "undefined" ? window.innerWidth - 340 : x);
  const top = Math.min(y, typeof window !== "undefined" ? window.innerHeight - 420 : y);

  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} aria-hidden />
      <div
        style={{ left: Math.max(8, left), top: Math.max(8, top) }}
        className="fixed z-[60] flex max-h-[70vh] w-[320px] flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-xl"
      >
        <div className="border-b border-[#DCDFE4] bg-[#FEF2F2] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <LrjSplitIcon className="text-[#C9372C]" />
            <p className="text-[13px] font-bold text-[#172B4D]">Partial Reject</p>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-[#44546F]">{noReject}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#44546F]">
            Total: {loading ? "…" : `${fmtBerat(info?.totalPartialBerat ?? 0)} kg`}
          </p>
        </div>

        <div className="border-b border-[#E9ECF0] bg-[#F7F8F9] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#44546F]">
          Partials ({loading ? "…" : (info?.rows.length ?? 0)})
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <p className="px-3 py-8 text-center text-[12px] font-medium text-[#6B778C]">
              Memuat data…
            </p>
          )}
          {!loading && error && (
            <p className="px-3 py-4 text-[12px] font-semibold text-[#C9372C]">{error}</p>
          )}
          {!loading && !error && (info?.rows.length ?? 0) === 0 && (
            <p className="px-3 py-6 text-center text-[12px] font-medium text-[#6B778C]">
              Tidak ada partial untuk label ini
            </p>
          )}
          {!loading &&
            !error &&
            (info?.rows ?? []).map((r) => (
              <div
                key={r.NoRejectPartial}
                className="flex items-start gap-2 border-b border-[#F1F2F4] px-3 py-2.5 last:border-b-0"
              >
                <span className="mt-0.5 text-[13px] text-red-500">−</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-[#172B4D]">
                    {r.NamaMesin || r.NoProduksi || r.SourceType || "-"}
                  </p>
                  <p className="truncate text-[11px] text-[#6B778C]">
                    {r.NoProduksi || "-"}
                    {r.TanggalProduksi ? ` · ${fmtTanggalLong(r.TanggalProduksi)}` : ""}
                    {r.JamProduksi ? ` · ${r.JamProduksi}` : ""}
                    {r.Shift != null ? ` · Shift ${r.Shift}` : ""}
                  </p>
                  {r.SourceType && (
                    <p className="mt-0.5 truncate text-[11px] text-[#6B778C]">
                      {r.SourceType}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-[#FCA5A5]/50 bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#C9372C]">
                  {fmtBerat(r.Berat)} kg
                </span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
