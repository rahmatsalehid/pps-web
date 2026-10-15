"use client";

import { Loader2Icon } from "@/components/dashboard/icons";
import type { LwsDetail } from "@/services/label-washing-service";
import { fmtBerat, isDateUsageFilled } from "./lws-format";
import { LwsWeightIcon } from "./lws-icons";

type Props = {
  className?: string;
  noWashing: string | null;
  details: LwsDetail[];
  loading: boolean;
  error: string | null;
};

export function LwsDetailPanel({
  className = "",
  noWashing,
  details,
  loading,
  error,
}: Props) {
  const available = details.filter((d) => !isDateUsageFilled(d.DateUsage));
  const totalBerat = details.reduce((a, d) => a + (d.Berat ?? 0), 0);
  const availableBerat = available.reduce((a, d) => a + (d.Berat ?? 0), 0);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[#EBECF0] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#172B4D]">Detail</p>
          <p className="truncate text-[11px] font-semibold text-[#6B778C]">
            {noWashing ?? "Pilih label untuk melihat detail"}
          </p>
        </div>
        {noWashing && (
          <div className="flex shrink-0 items-center gap-3 text-[12px] font-bold text-[#44546F]">
            <span>
              {available.length}/{details.length} sak
              {loading ? (
                <Loader2Icon className="ml-1 inline h-3 w-3 animate-spin" />
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1 text-[#172B4D]">
              <LwsWeightIcon className="h-3.5 w-3.5 text-[#00897B]" />
              {fmtBerat(availableBerat)}/{fmtBerat(totalBerat)} kg
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!noWashing && (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12px] text-gray-500">
            Pilih label untuk melihat detail
          </div>
        )}
        {noWashing && !loading && details.length === 0 && !error && (
          <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12px] text-gray-500">
            Belum ada detail.
          </div>
        )}
        {details.length > 0 && (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-[#FCFDFE] to-[#F7F8F9] shadow-[0_1px_0_#DCDFE4]">
              <tr className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#44546F]">
                <th className="w-[50px] px-3 py-2.5">Sak</th>
                <th className="px-3 py-2.5 text-right">Berat (kg)</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => {
                const used = isDateUsageFilled(d.DateUsage);
                return (
                  <tr
                    key={d.NoSak}
                    className="border-b border-[#F1F2F4]"
                    style={used ? { backgroundColor: "#F6F7F9", color: "#8993A4" } : undefined}
                  >
                    <td className="px-3 py-2 text-[12px] font-bold text-[#172B4D]">{d.NoSak}</td>
                    <td
                      className="px-3 py-2 text-right text-[12px]"
                      style={used ? { color: "#8993A4" } : { color: "#44546F" }}
                    >
                      {fmtBerat(d.Berat)}
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
