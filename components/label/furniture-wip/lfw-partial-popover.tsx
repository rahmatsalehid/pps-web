"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LfwPartialInfo } from "@/services/label-furniture-wip-service";
import { fmtPcs, fmtTanggalPanjang } from "./lfw-format";
import { LfwLayersIcon } from "./lfw-icons";

type Props = {
  headerNo: string;
  info: LfwPartialInfo | null;
  isLoading: boolean;
  error: string | null;
  x: number;
  y: number;
  onClose: () => void;
};

export function LfwPartialPopover({
  headerNo,
  info,
  isLoading,
  error,
  x,
  y,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(12, x), window.innerWidth - w - 12);
    let top = y;
    if (y + h > window.innerHeight - 12) top = Math.max(12, y - h - 8);
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const rows = info?.rows ?? [];

  return (
    <div
      ref={ref}
      className="fixed z-40 w-[340px] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white"
      style={
        pos
          ? { left: pos.left, top: pos.top, boxShadow: "0 8px 24px rgba(9,30,66,0.18)" }
          : { visibility: "hidden" }
      }
    >
      <div
        className="flex items-center gap-2.5 border-b border-[#EBECF0] px-3.5 py-3"
        style={{ backgroundColor: "#FFF8E1" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "rgba(178,106,0,0.12)",
            border: "1px solid rgba(178,106,0,0.28)",
            color: "#B26A00",
          }}
        >
          <LfwLayersIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[#172B4D]">Partial Furniture WIP</p>
          <p className="truncate text-[11px] font-semibold text-[#44546F]">{headerNo}</p>
        </div>
        {info && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              backgroundColor: "rgba(178,106,0,0.12)",
              border: "1px solid rgba(178,106,0,0.30)",
              color: "#B26A00",
            }}
          >
            Total: {fmtPcs(info.totalPartialPcs)} pcs
          </span>
        )}
      </div>

      <div className="border-b border-[#EBECF0] px-4 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B778C]">
          Partials ({rows.length})
        </p>
      </div>

      <div className="max-h-[280px] overflow-y-auto p-2">
        {isLoading ? (
          <p className="px-3 py-6 text-center text-[12px] text-gray-400">Memuat…</p>
        ) : error ? (
          <p className="px-3 py-4 text-center text-[12px] font-semibold text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-gray-500">
            Tidak ada partial untuk Furniture WIP ini
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.NoFurnitureWIPPartial}
                className="rounded-lg border border-[#EBECF0] px-2.5 py-2"
                style={{ backgroundColor: "#F7F8F9" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold text-[#172B4D]">
                    {r.NamaMesin || r.SourceType || "-"}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: "rgba(12,102,228,0.10)",
                      border: "1px solid rgba(12,102,228,0.28)",
                      color: "#0C66E4",
                    }}
                  >
                    {fmtPcs(r.Pcs)} pcs
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[#6B778C]">
                  <span className="font-semibold">{r.NoProduksi || "-"}</span>
                  <span>{fmtTanggalPanjang(r.TglProduksi)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
