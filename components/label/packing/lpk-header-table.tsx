"use client";

import { useEffect, useRef } from "react";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type { LpkHeader } from "@/services/label-packing-service";
import {
  fmtBerat,
  fmtPcs,
  fmtTanggal,
  formatBlokLokasi,
} from "./lpk-format";
import {
  LpkEllipsisIcon,
  LpkPlusIcon,
  LpkPrintIcon,
  LpkSearchIcon,
} from "./lpk-icons";

type Props = {
  className?: string;
  search: string;
  onSearch: (v: string) => void;
  includeUsed: boolean;
  onToggleIncludeUsed: () => void;
  canCreate: boolean;
  onCreate: () => void;
  headers: LpkHeader[];
  loading: boolean;
  error: string | null;
  selectedNo: string | null;
  onSelect: (noBJ: string) => void;
  onOpenPopover: (header: LpkHeader, x: number, y: number) => void;
  locks: Record<string, LbPrintLock>;
  hasMore: boolean;
  loadingMore: boolean;
  onReachEnd: () => void;
};

export function LpkHeaderTable({
  className,
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onReachEnd();
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onReachEnd, headers.length, hasMore, loadingMore]);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E2E6EA] bg-white ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-[#E2E6EA] px-3 py-2.5">
        <div className="relative min-w-[180px] flex-1">
          <LpkSearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari No. Label…"
            className="h-9 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] pl-8 pr-3 text-[13px] font-medium text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={onToggleIncludeUsed}
          className={`h-9 rounded-lg border px-3 text-[12px] font-bold transition ${
            includeUsed
              ? "border-[#0C66E4] bg-[#E9F2FF] text-[#0C66E4]"
              : "border-[#DCDFE4] bg-white text-[#44546F] hover:bg-[#F7F8F9]"
          }`}
        >
          Termasuk Terpakai
        </button>
        {canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0C66E4] px-3 text-[12px] font-bold text-white transition hover:bg-[#0055CC]"
          >
            <LpkPlusIcon width={14} height={14} />
            Buat Baru
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#F7F8F9]">
            <tr className="border-b border-[#E2E6EA] text-[11px] font-bold uppercase tracking-wide text-[#44546F]">
              <th className="px-3 py-2">No. Label</th>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Jenis</th>
              <th className="px-3 py-2">Proses</th>
              <th className="px-3 py-2 text-right">Pcs</th>
              <th className="px-3 py-2 text-right">Berat</th>
              <th className="px-3 py-2 text-center">Lokasi</th>
              <th className="px-3 py-2 text-center">Print</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {headers.map((h) => {
              const selected = h.NoBJ === selectedNo;
              const lock = locks[h.NoBJ];
              const usedBadge =
                h.Used && (
                  <span className="ml-1.5 rounded border border-[#E2483C]/35 bg-[#E2483C]/10 px-1 py-0.5 text-[9px] font-bold uppercase text-[#B71C1C]">
                    Terpakai
                  </span>
                );
              return (
                <tr
                  key={h.NoBJ}
                  onClick={() => onSelect(h.NoBJ)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onOpenPopover(h, e.clientX, e.clientY);
                  }}
                  className={`cursor-pointer border-b border-[#F1F2F4] text-[13px] transition hover:bg-[#F7F8F9] ${
                    selected ? "bg-[#E9F2FF]" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`font-bold ${selected ? "text-[#0C66E4]" : "text-[#172B4D]"}`}
                    >
                      {h.NoBJ}
                    </span>
                    {usedBadge}
                  </td>
                  <td className="px-3 py-2 text-[#44546F]">{fmtTanggal(h.DateCreate)}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-[#172B4D]">
                    {h.NamaBJ ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className={`text-[12px] font-bold ${selected ? "text-[#0C66E4]" : "text-[#172B4D]"}`}
                    >
                      {h.OutputCode ?? "-"}
                    </div>
                    {h.OutputNamaMesin && (
                      <div className="text-[11px] text-[#6B778C]">{h.OutputNamaMesin}</div>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      h.IsPartial ? "text-red-600" : "text-[#172B4D]"
                    }`}
                  >
                    {fmtPcs(h.Pcs)}
                  </td>
                  <td className="px-3 py-2 text-right text-[#44546F]">{fmtBerat(h.Berat)}</td>
                  <td className="px-3 py-2 text-center text-[#44546F]">
                    {formatBlokLokasi(h.Blok, h.IdLokasi)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lock ? (
                      <span
                        title={`Sedang diprint oleh ${lock.username ?? "user"}`}
                        className="inline-flex rounded-full border border-[#B26A00]/30 bg-[#B26A00]/10 px-2 py-0.5 text-[10px] font-bold text-[#B26A00]"
                      >
                        Printing
                      </span>
                    ) : h.HasBeenPrinted > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#0C66E4]/30 bg-[#0C66E4]/10 px-2 py-0.5 text-[10px] font-bold text-[#0C66E4]">
                        <LpkPrintIcon width={11} height={11} />
                        {h.HasBeenPrinted}x
                      </span>
                    ) : (
                      <span className="text-[#B3BAC5]">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onOpenPopover(h, r.right, r.bottom);
                      }}
                      className="rounded-md p-1 text-[#6B778C] transition hover:bg-[#E9ECF0] hover:text-[#172B4D]"
                    >
                      <LpkEllipsisIcon width={16} height={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {headers.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-[13px] text-[#6B778C]">
                  {error ?? "Tidak ada data"}
                </td>
              </tr>
            )}
            {loading && headers.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-[13px] text-[#6B778C]">
                  Memuat data…
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {hasMore && (
          <div ref={sentinelRef} className="px-3 py-3 text-center text-[12px] text-[#6B778C]">
            {loadingMore ? "Memuat lagi…" : "Scroll untuk memuat lagi"}
          </div>
        )}
      </div>
    </section>
  );
}
