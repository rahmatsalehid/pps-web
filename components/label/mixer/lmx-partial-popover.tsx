"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LmxPartialInfo } from "@/services/label-mixer-service";
import { fmtBerat, fmtTanggal } from "./lmx-format";

type Props = {
  noMixer: string;
  noSak: number;
  x: number;
  y: number;
  info: LmxPartialInfo | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function LmxPartialPopover({
  noMixer,
  noSak,
  x,
  y,
  info,
  loading,
  error,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(12, x - w / 2), window.innerWidth - w - 12);
    let top = y - h - 8;
    if (top < 12) top = Math.min(y + 28, window.innerHeight - h - 12);
    setPos({ left, top });
  }, [x, y, info, loading, error]);

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
  const totalWeight = info?.totalPartialWeight ?? 0;

  return (
    <div
      ref={ref}
      className="fixed z-[55] w-[300px] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-[0_12px_40px_rgba(9,30,66,0.18)]"
      style={pos ? { left: pos.left, top: pos.top } : { left: x, top: y, visibility: "hidden" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: "linear-gradient(135deg, #60A5FA, #2563EB)",
        }}
      >
        <span className="rounded-lg bg-white/25 p-2 text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-white">
            Partial Sak {noSak}
          </p>
          <p className="truncate text-[11px] font-semibold text-white/90">
            {noMixer}
            {" · "}
            {loading ? "Memuat…" : `Total: ${fmtBerat(totalWeight)} kg`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-[#EBECF0] px-3 py-2">
        <span className="text-[11px] font-bold text-[#44546F]">
          Partials {loading ? "" : `(${rows.length})`}
        </span>
        {loading && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1565C0] border-t-transparent" />
        )}
      </div>

      <div className="max-h-[260px] overflow-y-auto">
        {error ? (
          <p className="px-4 py-6 text-center text-[12px] font-semibold text-red-600">{error}</p>
        ) : loading ? (
          <p className="px-4 py-6 text-center text-[12px] text-gray-500">Memuat data…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-gray-500">
            Tidak ada partial untuk Sak ini
          </p>
        ) : (
          <ul className="divide-y divide-[#F1F2F4]">
            {rows.map((r, i) => (
              <li key={r.NoMixerPartial || i} className="flex items-start gap-2.5 px-3 py-2.5">
                <span className="mt-0.5 shrink-0 text-[#DC2626]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M5 12h14" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#172B4D]">
                    {r.NamaMesin || r.SourceType || "-"}
                  </p>
                  <p className="truncate text-[11px] text-[#6B778C]">
                    {r.NoProduksi || "-"} · {fmtTanggal(r.TglProduksi)}
                    {r.Jam ? ` · ${r.Jam}` : ""}
                    {r.Shift ? ` · Shift ${r.Shift}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                  {fmtBerat(r.Berat)} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
