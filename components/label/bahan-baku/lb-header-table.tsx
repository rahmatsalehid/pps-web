"use client";

import { useEffect, useRef } from "react";
import { XIcon } from "@/components/dashboard/icons";
import type { LbHeader } from "@/services/label-bahan-baku-service";
import { fmtTanggal } from "./lb-format";
import { LbCheckSquareIcon, LbSearchIcon, LbSquareIcon } from "./lb-icons";

type Props = {
  className?: string;
  search: string;
  onSearch: (v: string) => void;
  includeUsed: boolean;
  onToggleIncludeUsed: () => void;
  headers: LbHeader[];
  loading: boolean;
  error: string | null;
  selectedBb: string | null;
  onSelect: (noBahanBaku: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onReachEnd: () => void;
};

export function LbHeaderTable({
  className = "",
  search,
  onSearch,
  includeUsed,
  onToggleIncludeUsed,
  headers,
  loading,
  error,
  selectedBb,
  onSelect,
  hasMore,
  loadingMore,
  onReachEnd,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onReachEnd();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadingMore, headers.length, onReachEnd]);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm lg:h-full ${className}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[#EBECF0] px-3 py-3">
        <div className="relative min-w-0 flex-1">
          <LbSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari No Bahan Baku / Supplier / No Plat…"
            className="h-9 w-full rounded-xl border border-[#DCDFE4] bg-[#F8F9FB] pl-9 pr-8 text-[13px] text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Bersihkan pencarian"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleIncludeUsed}
          title={includeUsed ? "Tampilkan hanya yang belum dipakai" : "Tampilkan semua data"}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-semibold transition"
          style={
            includeUsed
              ? {
                  backgroundColor: "rgba(21,101,192,0.10)",
                  borderColor: "rgba(21,101,192,0.35)",
                  color: "#1565C0",
                }
              : {
                  backgroundColor: "#F3F4F6",
                  borderColor: "#DCDFE4",
                  color: "#4B5563",
                }
          }
        >
          {includeUsed ? (
            <LbCheckSquareIcon className="h-4 w-4" />
          ) : (
            <LbSquareIcon className="h-4 w-4" />
          )}
          Tampilkan Semua
        </button>
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-gradient-to-b from-[#FCFDFE] to-[#F7F8F9] shadow-[0_1px_0_#DCDFE4]">
            <tr className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#44546F]">
              <th className="w-[140px] px-4 py-3">No. BB</th>
              <th className="w-[110px] px-3 py-3">Tanggal</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="w-[100px] px-3 py-3">No. Plat</th>
            </tr>
          </thead>
          <tbody>
            {headers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-gray-500">
                  {loading ? "Memuat…" : "Tidak ada data"}
                </td>
              </tr>
            ) : (
              headers.map((h) => {
                const active = h.NoBahanBaku === selectedBb;
                return (
                  <tr
                    key={h.NoBahanBaku}
                    onClick={() => onSelect(h.NoBahanBaku)}
                    className="cursor-pointer border-b border-[#EBECF0] transition-colors hover:bg-[#F1F5FB]"
                    style={
                      active
                        ? {
                            backgroundColor: "#E9F2FF",
                            boxShadow: "inset 3px 0 0 #0C66E4",
                          }
                        : undefined
                    }
                  >
                    <td
                      className="px-4 py-2.5 text-[13px]"
                      style={active ? { color: "#0C66E4", fontWeight: 700 } : { color: "#172B4D", fontWeight: 600 }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {h.NoBahanBaku}
                        {h.Used && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: "rgba(183,28,28,0.10)",
                              borderColor: "rgba(183,28,28,0.35)",
                              border: "1px solid rgba(183,28,28,0.35)",
                              color: "#B71C1C",
                              letterSpacing: "0.2px",
                            }}
                          >
                            Terpakai
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#172B4D]">
                      {fmtTanggal(h.DateCreate)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#172B4D]">
                      {h.NamaSupplier || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#172B4D]">{h.NoPlat || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div ref={sentinelRef} className="h-px" />
        {loadingMore && (
          <p className="px-4 py-2 text-center text-[12px] text-gray-400">Memuat lagi…</p>
        )}
      </div>
    </section>
  );
}
