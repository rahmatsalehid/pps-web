"use client";

import { useEffect, useRef } from "react";
import { Loader2Icon, PlusIcon, XIcon } from "@/components/dashboard/icons";
import type { LbgHeader } from "@/services/label-bonggolan-service";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import { fmtBerat, fmtTanggal, formatBlokLokasi } from "./lbg-format";
import {
  LbgCheckSquareIcon,
  LbgEllipsisIcon,
  LbgSearchIcon,
  LbgSquareIcon,
} from "./lbg-icons";

type Props = {
  className?: string;
  search: string;
  onSearch: (v: string) => void;
  includeUsed: boolean;
  onToggleIncludeUsed: () => void;
  canCreate: boolean;
  onCreate: () => void;
  headers: LbgHeader[];
  loading: boolean;
  error: string | null;
  selectedNo: string | null;
  onSelect: (noBonggolan: string) => void;
  onOpenPopover: (header: LbgHeader, x: number, y: number) => void;
  locks: Record<string, LbPrintLock>;
  hasMore: boolean;
  loadingMore: boolean;
  onReachEnd: () => void;
};

export function LbgHeaderTable({
  className = "",
  search,
  onSearch,
  includeUsed,
  onToggleIncludeUsed,
  canCreate,
  onCreate,
  headers,
  loading,
  error,
  selectedNo,
  onSelect,
  onOpenPopover,
  locks,
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
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#EBECF0] px-3 py-3">
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          title={canCreate ? "Buat Label Baru" : "Anda tidak memiliki izin untuk membuat label"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          style={{ backgroundColor: "#00897B", borderColor: "#00897B" }}
        >
          <PlusIcon className="h-4 w-4" />
          Buat Baru
        </button>
        <div className="relative min-w-[180px] flex-1">
          <LbgSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari No Bonggolan / Blok / Lokasi / Proses…"
            className="h-9 w-full rounded-xl border border-[#DCDFE4] bg-[#F8F9FB] pl-9 pr-8 text-[13px] text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
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
            <LbgCheckSquareIcon className="h-4 w-4" />
          ) : (
            <LbgSquareIcon className="h-4 w-4" />
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
              <th className="w-[150px] px-4 py-3">No. Bonggolan</th>
              <th className="w-[104px] px-3 py-3">Tanggal</th>
              <th className="px-3 py-3">Jenis</th>
              <th className="w-[80px] px-3 py-3">Berat</th>
              <th className="px-3 py-3">Proses</th>
              <th className="w-[96px] px-3 py-3">Lokasi</th>
              <th className="w-[76px] px-3 py-3">Print</th>
              <th className="w-[44px] px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {headers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-gray-500">
                  {loading ? "Memuat…" : "Tidak ada data"}
                </td>
              </tr>
            ) : (
              headers.map((h) => {
                const active = h.NoBonggolan === selectedNo;
                const lock = locks[h.NoBonggolan];
                const refNo =
                  (h.InjectNoProduksi ?? "").trim() ||
                  (h.BrokerNoProduksi ?? "").trim() ||
                  (h.NoBongkarSusun ?? "").trim();
                const refMesin =
                  (h.InjectNamaMesin ?? "").trim() || (h.BrokerNamaMesin ?? "").trim();
                return (
                  <tr
                    key={h.NoBonggolan}
                    onClick={() => onSelect(h.NoBonggolan)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSelect(h.NoBonggolan);
                      onOpenPopover(h, e.clientX, e.clientY);
                    }}
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
                      style={
                        active
                          ? { color: "#0C66E4", fontWeight: 700 }
                          : { color: "#172B4D", fontWeight: 600 }
                      }
                    >
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        {h.NoBonggolan}
                        {h.Used && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: "rgba(183,28,28,0.10)",
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
                      {h.NamaBonggolan || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#172B4D]">{fmtBerat(h.Berat)}</td>
                    <td className="px-3 py-2.5 text-[13px]">
                      <p className="font-semibold text-[#172B4D]">{refNo || "-"}</p>
                      {refMesin && <p className="text-[12px] text-gray-500">{refMesin}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#172B4D]">
                      {formatBlokLokasi(h.Blok, h.IdLokasi)}
                    </td>
                    <td className="px-3 py-2.5">
                      {lock ? (
                        <span
                          title={`Sedang diprint oleh ${lock.username ?? lock.lockedBy ?? "-"}`}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: "rgba(178,106,0,0.12)",
                            border: "1px solid rgba(178,106,0,0.30)",
                            color: "#B26A00",
                          }}
                        >
                          Printing
                        </span>
                      ) : h.HasBeenPrinted === 0 ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-500"
                          style={{
                            backgroundColor: "#F1F2F4",
                            border: "1px solid #DCDFE4",
                          }}
                        >
                          -
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: "rgba(12,102,228,0.10)",
                            border: "1px solid rgba(12,102,228,0.30)",
                            color: "#0C66E4",
                          }}
                        >
                          {h.HasBeenPrinted}x
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        aria-label={`Menu ${h.NoBonggolan}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          onSelect(h.NoBonggolan);
                          onOpenPopover(h, r.left, r.bottom + 4);
                        }}
                        className="rounded-lg p-1.5 text-[#44546F] transition hover:bg-[#EBECF0]"
                      >
                        <LbgEllipsisIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div ref={sentinelRef} className="h-px" />
        {loadingMore && (
          <p className="flex items-center justify-center gap-1.5 px-4 py-2 text-center text-[12px] text-gray-400">
            <Loader2Icon className="h-3 w-3 animate-spin" />
            Memuat lagi…
          </p>
        )}
      </div>
    </section>
  );
}
