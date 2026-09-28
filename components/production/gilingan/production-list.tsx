"use client";

import { useEffect, useRef, useState } from "react";
import type { GilinganMesinInfo, GilinganProduction } from "@/services/gilingan-service";
import { deleteGilinganAction } from "@/app/(app)/production/gilingan/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { Loader2Icon, TrashIcon } from "@/components/dashboard/icons";

/** Warna band status kiri — sama dengan production_produksi_list.dart */
const STATUS = {
  current: "#1D4ED8",
  pending: "#D97706",
  complete: "#059669",
  default: "#D1D5DB",
} as const;

function statusColor(status: string): string {
  switch (status) {
    case "current":
      return STATUS.current;
    case "pending":
      return STATUS.pending;
    case "complete":
      return STATUS.complete;
    default:
      return STATUS.default;
  }
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(time: string | null): string {
  if (!time) return "--:--";
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

type MetaItem = { label: string; value: string };

export function ProductionList({
  items,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  filterIdMesin,
  mesinList,
  onFilterChanged,
  onRowClick,
  onRefresh,
  onReachEnd,
}: {
  items: GilinganProduction[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  filterIdMesin: number | null;
  mesinList: GilinganMesinInfo[];
  onFilterChanged: (id: number | null) => void;
  onRowClick: (row: GilinganProduction) => void;
  onRefresh: () => void;
  onReachEnd?: () => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GilinganProduction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const reachEndRef = useRef(onReachEnd);

  useEffect(() => {
    reachEndRef.current = onReachEnd;
  }, [onReachEnd]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isLoadingMore || isLoading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reachEndRef.current?.();
      },
      { root: scrollRef.current, rootMargin: "80px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, isLoadingMore, isLoading, items.length]);

  useEffect(() => {
    if (!menuFor) return;
    const onScroll = () => setMenuFor(null);
    const node = scrollRef.current;
    node?.addEventListener("scroll", onScroll, { passive: true });
    return () => node?.removeEventListener("scroll", onScroll);
  }, [menuFor]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteGilinganAction(deleteTarget.noProduksi);
    setDeleting(false);
    if (result.status === "success") {
      setDeleteTarget(null);
      onRefresh();
    } else {
      setDeleteError(result.message ?? "Gagal menghapus data");
    }
  }

  const hasActiveMenu = menuFor != null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Filter header — ala ProductionRiwayatHeader (showTitle:false ? chips saja) */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-white">
        <div className="flex min-h-12 items-center gap-1.5 overflow-x-auto overflow-y-hidden px-3.5 py-2.5">
          <FilterChip
            label="Semua"
            active={filterIdMesin === null}
            onClick={() => onFilterChanged(null)}
          />
          {mesinList.map((m) => (
            <FilterChip
              key={m.idMesin}
              label={m.namaMesin}
              active={filterIdMesin === m.idMesin}
              onClick={() => onFilterChanged(m.idMesin)}
            />
          ))}
        </div>
      </div>

      {/* List — padding & spacing ala tablet: LTRB 10,8,10,12 + item gap 8 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-2">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5">
            <InboxIcon className="h-8 w-8 text-gray-300" />
            <span className="text-xs text-gray-400">Belum ada data produksi</span>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((row) => {
              const isActiveMenu = menuFor === row.noProduksi;
              const metaItems: MetaItem[] = [
                ...(filterIdMesin == null
                  ? [{ label: "Mesin", value: row.namaMesin.trim() || "-" }]
                  : []),
                { label: "Regu", value: row.namaRegu?.trim() || "-" },
                { label: "Output", value: row.outputJenisNama?.trim() || "-" },
              ];

              return (
                <div
                  key={row.noProduksi}
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  className={`relative cursor-pointer overflow-hidden rounded-[10px] border border-[#E5E7EB] bg-white transition-opacity duration-150 ${
                    hasActiveMenu && !isActiveMenu ? "opacity-35" : "opacity-100"
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Band status kiri 4px */}
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: statusColor(row.produksiStatus) }}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1 p-2.5">
                      {/* Baris 1: tanggal · jam · Shift · Locked */}
                      <div className="flex items-start gap-1.5">
                        <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                        <span className="shrink-0 text-xs font-bold text-[#111827]">
                          {formatDateShort(row.tglProduksi)}
                        </span>
                        <ScheduleIcon className="ml-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#111827]">
                          {formatTime(row.hourStart)} - {formatTime(row.hourEnd)}
                        </span>
                        <span
                          className="shrink-0 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[10px] font-semibold text-[#334155]"
                        >
                          Shift {row.shift}
                        </span>
                        {row.isLocked ? (
                          <span className="shrink-0 rounded-full bg-[#FFF7ED] px-2 py-[3px] text-[10px] font-semibold text-[#F97316]">
                            Locked
                          </span>
                        ) : null}
                      </div>

                      {/* Meta box */}
                      <div className="mt-2 rounded-lg bg-[#F9FAFB] px-2 py-1.5">
                        <div className="flex items-stretch">
                          {metaItems.map((meta, i) => (
                            <div key={meta.label} className="flex min-w-0 flex-1 items-stretch">
                              {i > 0 ? (
                                <div className="mx-2 w-px shrink-0 bg-[#E5E7EB]" aria-hidden />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-semibold text-[#9CA3AF]">
                                  {meta.label}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#374151]">
                                  {meta.value}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* noProduksi rata kanan */}
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-[10px] italic text-gray-400">
                          {row.noProduksi}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(isActiveMenu ? null : row.noProduksi);
                          }}
                          className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
                          aria-label="Menu"
                        >
                          ?
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Context menu ala tablet: Edit | Hapus horizontal */}
                  {isActiveMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor(null);
                        }}
                      />
                      <div
                        className="absolute bottom-8 right-3 z-30 flex overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.22),0_2px_6px_rgba(0,0,0,0.08)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="flex flex-col items-center gap-1.5 px-7 py-3.5 text-[#1D4ED8]"
                          onClick={() => {
                            setMenuFor(null);
                            onRowClick(row);
                          }}
                        >
                          <EditIcon className="h-5 w-5" />
                          <span className="text-[13px] font-bold">Edit</span>
                        </button>
                        <div className="my-auto h-[60px] w-px bg-[#E5E7EB]" aria-hidden />
                        <button
                          type="button"
                          className="flex flex-col items-center gap-1.5 px-7 py-3.5 text-[#DC2626]"
                          onClick={() => {
                            setMenuFor(null);
                            setDeleteTarget(row);
                          }}
                        >
                          <TrashIcon className="h-5 w-5" />
                          <span className="text-[13px] font-bold">Hapus</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {/* Sentinel: terlihat ? load halaman berikutnya */}
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat lagi…
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="py-2 text-center text-[11px] text-gray-400">Tidak ada data lagi</p>
            )}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Konfirmasi Hapus"
          confirmLabel="HAPUS"
          loading={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        >
          <div className="space-y-1.5 text-sm">
            <Row label="No. Produksi" value={deleteTarget.noProduksi} />
            <Row label="Mesin" value={deleteTarget.namaMesin} />
            <Row label="Tanggal" value={formatDateShort(deleteTarget.tglProduksi)} />
          </div>
          <p className="mt-3 text-xs text-red-600">
            Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-[20px] border px-2.5 py-[3px] text-[10px] font-medium transition-colors duration-150 ${
        active
          ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
          : "border-[#D1D5DB] bg-[#F3F4F6] text-[#4B5563] hover:bg-gray-200"
      }`}
      style={{ marginRight: 4 }}
    >
      {label}
    </button>
  );
}
