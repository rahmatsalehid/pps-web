"use client";

import type { LcsOutputItem } from "@/services/label-crusher-service";
import { LcsPrintIcon } from "./lcs-icons";

type Props = {
  title: string;
  items: LcsOutputItem[];
  isLoading: boolean;
  hasSource: boolean;
  noSourceMessage: string;
};

export function LcsOutputPanel({
  title,
  items,
  isLoading,
  hasSource,
  noSourceMessage,
}: Props) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white">
      <div className="shrink-0 border-b border-[#EBECF0] px-3 py-2.5">
        <p className="text-[13px] font-bold text-[#172B4D]">{title}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!hasSource ? (
          <p className="whitespace-pre-line px-2 py-6 text-center text-[12px] leading-relaxed text-gray-500">
            {noSourceMessage}
          </p>
        ) : isLoading ? (
          <p className="px-2 py-6 text-center text-[12px] text-gray-400">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-gray-500">Belum ada output</p>
        ) : (
          <ul className="space-y-1">
            {items.map((o) => (
              <li
                key={o.NoCrusher}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#EBECF0] px-2.5 py-1.5"
                style={{ backgroundColor: "#F7F8F9" }}
              >
                <span className="truncate text-[12px] font-semibold text-[#172B4D]">
                  {o.NoCrusher}
                </span>
                {o.HasBeenPrinted > 0 ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: "rgba(12,102,228,0.10)",
                      border: "1px solid rgba(12,102,228,0.30)",
                      color: "#0C66E4",
                    }}
                  >
                    <LcsPrintIcon className="h-2.5 w-2.5" />
                    {o.HasBeenPrinted}x
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
                    style={{
                      backgroundColor: "#F1F2F4",
                      border: "1px solid #DCDFE4",
                    }}
                  >
                    Belum
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
