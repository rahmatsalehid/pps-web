"use client";

import type { LmxOutputItem } from "@/services/label-mixer-service";

type Props = {
  noProduksi: string;
  outputs: LmxOutputItem[];
  loading: boolean;
  mode: "production" | "inject";
};

export function LmxOutputPanel({ noProduksi, outputs, loading, mode }: Props) {
  const hasSource = noProduksi.trim() !== "";
  const count = outputs.length;
  const emptyLabel =
    mode === "inject" ? "Pilih No Inject\nuntuk melihat output" : "Pilih No Produksi\nuntuk melihat output";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#EBECF0] px-3 py-3">
        <span className="text-[#6366F1]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M4 17h16" />
            <path d="M4 7h10" />
            <path d="m14 3 4 4-4 4" />
          </svg>
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-bold text-[#172B4D]">Output Mixer</p>
        {hasSource && (
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#4F46E5]">
            {count}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center py-10 text-[12px] text-gray-500">
            Memuat…
          </div>
        ) : !hasSource ? (
          <div className="flex h-full items-center justify-center whitespace-pre-line px-3 py-10 text-center text-[12px] text-gray-500">
            {emptyLabel}
          </div>
        ) : outputs.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 py-10 text-center text-[12px] text-gray-500">
            Belum ada
            <br />
            label output
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F2F4]">
            {outputs.map((o) => {
              const printed = o.HasBeenPrinted > 0;
              return (
                <li key={o.NoMixer} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#172B4D]">
                    {o.NoMixer}
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold"
                    style={
                      printed
                        ? { backgroundColor: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
                        : { backgroundColor: "#F3F4F6", borderColor: "#DCDFE4", color: "#6B778C" }
                    }
                  >
                    {printed ? "Printed" : "Belum"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
