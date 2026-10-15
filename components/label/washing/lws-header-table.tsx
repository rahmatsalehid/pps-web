"use client";

import { useEffect, useRef } from "react";
import { Loader2Icon, PlusIcon, XIcon } from "@/components/dashboard/icons";
import type { LwsHeader } from "@/services/label-washing-service";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import { fmtTanggal, formatBlokLokasi, isQcCompleted } from "./lws-format";
import {
  LwsCheckSquareIcon,
  LwsEllipsisIcon,
  LwsSearchIcon,
  LwsSquareIcon,
} from "./lws-icons";

type Props = {
  className?: string;
  search: string;
  onSearch: (v: string) => void;
  includeUsed: boolean;
  onToggleIncludeUsed: () => void;
  canCreate: boolean;
  onCreate: () => void;
  checking: boolean;
  headers: LwsHeader[];
  loading: boolean;
  error: string | null;
  selectedNo: string | null;
  onSelect: (noWashing: string) => void;
  onOpenPopover: (header: LwsHeader, x: number, y: number) => void;
  locks: Record<string, LbPrintLock>;
  hasMore: boolean;
  loadingMore: boolean;
  onReachEnd: () => void;
};

export function LwsHeaderTable({
  className = "",
  search,
  onSearch,
  includeUsed,
  onToggleIncludeUsed,
  canCreate,
  onCreate,
  checking,
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
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm ${className}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#EBECF0] px-3 py-3">
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate || checking}
          title={canCreate ? "Buat Label Baru" : "Anda tidak memiliki izin untuk membuat label"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          style={{ backgroundColor: "#00897B", borderColor: "#00897B" }}
        >
          <PlusIcon className="h-4 w-4" />
          Buat Baru
        </button>
        <div className="relative min-w-[180px] flex-1">
          <LwsSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari No Washing / Jenis / Warehouse…"
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
            <LwsCheckSquareIcon className="h-4 w-4" />
          ) : (
            <LwsSquareIcon className="h-4 w-4" />
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
              <th className="w-[150px] px-4 py-3">No. Washing</th>
              <th className="w-[100px] px-3 py-3">Tanggal</th>
              <th className="px-3 py-3">Jenis</th>
              <th className="px-3 py-3">Proses</th>
              <th className="w-[90px] px-3 py-3">Lokasi</th>
              <th className="w-[76px] px-3 py-3">Print</th>
              <th className="w-[44px] px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && headers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-[13px] text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Memuat data…
                  </span>
                </td>
              </tr>
            )}
            {!loading && headers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-[13px] text-gray-500">
                  Tidak ada data.
                </td>
              </tr>
            )}
            {headers.map((h) => {
              const selected = selectedNo === h.NoWashing;
              const lock = locks[h.NoWashing];
              const printed = h.HasBeenPrinted > 0;
              const qcDone = isQcCompleted(h);
              return (
                <tr
                  key={h.NoWashing}
                  onClick={() => onSelect(h.NoWashing)}
                  className="cursor-pointer border-b border-[#F1F2F4] transition hover:bg-[#F8FAFD]"
                  style={
                    selected
                      ? { backgroundColor: "#E9F2FF", boxShadow: "inset 3px 0 0 #1565C0" }
                      : qcDone
                        ? { backgroundColor: "#ECFDF3" }
                        : undefined
                  }
                >
                  <td className="px-4 py-2.5 text-[13px] font-bold text-[#172B4D]">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {h.NoWashing}
                      {h.Used && (
                        <span className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-bold text-[#C9372C]">
                          Terpakai
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#44546F]">
                    {fmtTanggal(h.DateCreate)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#44546F]">
                    <div className="truncate">{h.NamaJenisPlastik ?? "-"}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#44546F]">
                    <div className="truncate">{h.NoProduksi || h.NoBongkarSusun || "-"}</div>
                    {h.NamaMesin && (
                      <div className="truncate text-[11px] text-[#6B778C]">{h.NamaMesin}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#44546F]">
                    {formatBlokLokasi(h.Blok, h.IdLokasi)}
                  </td>
                  <td className="px-3 py-2.5">
                    {lock ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold"
                        style={{
                          backgroundColor: "#FFF3E0",
                          borderColor: "#FFCC80",
                          color: "#E65100",
                        }}
                        title={`Sedang diprint oleh ${lock.username ?? lock.lockedBy ?? "-"}`}
                      >
                        Printing
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold"
                        style={
                          printed
                            ? {
                                backgroundColor: "#ECFDF5",
                                borderColor: "#86EFAC",
                                color: "#166534",
                              }
                            : {
                                backgroundColor: "#F3F4F6",
                                borderColor: "#DCDFE4",
                                color: "#6B778C",
                              }
                        }
                      >
                        {printed ? `${h.HasBeenPrinted}x` : "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      aria-label={`Aksi ${h.NoWashing}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onOpenPopover(h, r.left, r.top);
                      }}
                      className="rounded-lg p-1.5 text-[#44546F] transition hover:bg-[#EBECF0]"
                    >
                      <LwsEllipsisIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {hasMore && (
          <div ref={sentinelRef} className="h-1 w-full">
            {loadingMore && (
              <div className="flex items-center justify-center py-3 text-[12px] text-gray-500">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Memuat lagi…
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
