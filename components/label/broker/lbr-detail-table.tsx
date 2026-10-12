"use client";

import type { MouseEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LbrDetail } from "@/services/label-broker-service";
import { fmtBerat, isDateUsageFilled } from "./lbr-format";

type Props = {
  className?: string;
  noBroker: string | null;
  details: LbrDetail[];
  loading: boolean;
  error: string | null;
  onOpenPartial: (noSak: number, e: MouseEvent<HTMLButtonElement>) => void;
};

export function LbrDetailTable({
  className = "",
  noBroker,
  details,
  loading,
  error,
  onOpenPartial,
}: Props) {
  const totalBerat = details.reduce((a, d) => a + (d.Berat ?? 0), 0);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[#EBECF0] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#172B4D]">Detail Sak</p>
          <p className="truncate text-[11px] font-semibold text-[#6B778C]">
            {noBroker ?? "Pilih label untuk melihat detail"}
          </p>
        </div>
        {noBroker && (
          <div className="flex shrink-0 items-center gap-3 text-[12px] font-bold text-[#44546F]">
            <span>
              {details.length} sak
              {loading ? (
                <Loader2Icon className="ml-1 inline h-3 w-3 animate-spin" />
              ) : null}
            </span>
            <span className="text-[#172B4D]">{fmtBerat(totalBerat)} kg</span>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!noBroker && (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12px] text-gray-500">
            Klik salah satu baris label di kiri untuk melihat daftar sak.
          </div>
        )}
        {noBroker && !loading && details.length === 0 && !error && (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12px] text-gray-500">
            Belum ada detail sak.
          </div>
        )}
        {details.length > 0 && (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-[#FCFDFE] to-[#F7F8F9] shadow-[0_1px_0_#DCDFE4]">
              <tr className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#44546F]">
                <th className="w-[50px] px-3 py-2.5">Sak</th>
                <th className="w-[90px] px-3 py-2.5 text-right">Berat (kg)</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => {
                const used = isDateUsageFilled(d.DateUsage);
                const partial = d.IsPartial === true;
                return (
                  <tr key={d.NoSak} className="border-b border-[#F1F2F4]">
                    <td className="px-3 py-2 text-[12px] font-bold text-[#172B4D]">{d.NoSak}</td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#44546F]">
                      {fmtBerat(d.Berat)}
                    </td>
                    <td className="px-3 py-2">
                      {partial ? (
                        <button
                          type="button"
                          onClick={(e) => onOpenPartial(d.NoSak, e)}
                          className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700 transition hover:bg-orange-100"
                          title="Lihat rincian partial"
                        >
                          Partial
                        </button>
                      ) : used ? (
                        <span className="rounded-full border border-[#CCE0FF] bg-[#E9F2FF] px-2 py-0.5 text-[11px] font-bold text-[#1565C0]">
                          Dipakai
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#DCDFE4] bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-[#6B778C]">
                          Kosong
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
