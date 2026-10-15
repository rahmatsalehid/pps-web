"use client";

import type { LglOutputItem } from "@/services/label-gilingan-service";
import { LglCheckIcon, LglPackageIcon } from "./lgl-icons";

type Props = {
  items: LglOutputItem[];
  loading: boolean;
  hasSource: boolean;
  noSourceMessage?: string;
};

export function LglOutputPanel({
  items,
  loading,
  hasSource,
  noSourceMessage = "Pilih No Produksi Gilingan\nuntuk melihat output",
}: Props) {
  return (
    <div className="flex min-h-[180px] flex-col rounded-xl border border-[#DCDFE4] bg-[#F7F8F9]">
      <div className="flex items-center gap-2 border-b border-[#DCDFE4] px-3 py-2.5">
        <LglPackageIcon className="text-[#00897B]" />
        <span className="text-[13px] font-bold text-[#172B4D]">Output Gilingan</span>
      </div>

      {!hasSource && !loading && (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="whitespace-pre-line text-[12px] font-medium leading-relaxed text-[#44546F]">
            {noSourceMessage}
          </p>
        </div>
      )}

      {hasSource && loading && (
        <div className="flex flex-1 items-center justify-center p-6">
          <span className="text-[12px] font-medium text-[#44546F]">Memuat output…</span>
        </div>
      )}

      {hasSource && !loading && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-[12px] font-medium text-[#44546F]">Belum ada output</p>
        </div>
      )}

      {hasSource && !loading && items.length > 0 && (
        <ul className="max-h-[260px] flex-1 overflow-y-auto p-2">
          {items.map((o) => (
            <li
              key={o.NoGilingan}
              className="flex items-center justify-between gap-2 rounded-lg border border-[#E9ECF0] bg-white px-2.5 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {o.HasBeenPrinted > 0 ? (
                  <LglCheckIcon width={14} height={14} className="shrink-0 text-[#22A06B]" />
                ) : (
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#C1C7D0]" />
                )}
                <span className="truncate text-[12px] font-semibold text-[#172B4D]">
                  {o.NoGilingan}
                </span>
              </div>
              {o.HasBeenPrinted > 0 && (
                <span className="shrink-0 rounded-full bg-[#E9F2FF] px-2 py-0.5 text-[10px] font-bold text-[#0C66E4]">
                  {o.HasBeenPrinted}x
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
