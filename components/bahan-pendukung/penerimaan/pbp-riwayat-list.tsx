"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PbpRiwayat,
  PbpTim,
} from "@/services/penerimaan-bahan-pendukung-service";
import { deletePbpAction } from "@/app/(app)/bahan-pendukung/penerimaan/actions";
import { Loader2Icon, TrashIcon } from "@/components/dashboard/icons";
import { CalendarIcon, EditIcon, InboxIcon } from "./pbp-icons";
import { formatTanggalShort, pbpRowStatus } from "./pbp-format";
import { PbpConfirmDialog } from "./pbp-confirm-dialog";
import { PbpStatusDialog } from "./pbp-status-dialog";

const STATUS_COLOR = {
  current: "#1D4ED8",
  pending: "#D97706",
  complete: "#059669",
  default: "#D1D5DB",
} as const;

type StatusDialogState = {
  type: "success" | "error";
  title: string;
  message: string;
};

export function PbpRiwayatList({
  items,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  filterIdTim,
  timList,
  onFilterChanged,
  onRowClick,
  onReachEnd,
  onRefresh,
  notify,
}: {
  items: PbpRiwayat[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  filterIdTim: number | null;
  timList: PbpTim[];
  onFilterChanged: (id: number | null) => void;
  onRowClick: (row: PbpRiwayat) => void;
  onReachEnd?: () => void;
  onRefresh: () => void;
  notify: (message: string) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PbpRiwayat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] =
    useState<StatusDialogState | null>(null);
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
    const no = deleteTarget.noPenerimaan;
    const res = await deletePbpAction(no);
    setDeleting(false);
    if (res.ok) {
      setDeleteTarget(null);
      setStatusDialog({
        type: "success",
        title: "Berhasil Menghapus",
        message: `Penerimaan ${no} berhasil dihapus.`,
      });
    } else {
      setDeleteError(res.error);
    }
  }

  const hasActiveMenu = menuFor != null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — ala ProductionRiwayatHeader (title + Semua, lalu chips tim) */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-white">
        <div className="flex h-11 items-center gap-2.5 px-3.5">
          <h2 className="text-[13px] font-bold text-[#1F2937]">
            Riwayat Penerimaan
          </h2>
          <FilterChip
            label="Semua"
            active={filterIdTim === null}
            onClick={() => onFilterChanged(null)}
          />
        </div>
        <div className="flex h-[38px] items-center gap-1.5 overflow-x-auto overflow-y-hidden px-3.5 py-2">
          {timList.map((t) => (
            <FilterChip
              key={t.idTim}
              label={t.namaTim}
              active={filterIdTim === t.idTim}
              onClick={() => onFilterChanged(t.idTim)}
            />
          ))}
        </div>
      </div>

      {/* List — padding & spacing ala tablet: LTRB 10,8,10,12 + gap 8 */}
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
              const isActiveMenu = menuFor === row.noPenerimaan;
              const status = pbpRowStatus(row.isComplete, row.tglPenerimaan);
              const metaItems = [
                { label: "Tim Penerima", value: row.namaTim.trim() || "-" },
                {
                  label: "Tanggal",
                  value: formatTanggalShort(row.tglPenerimaan),
                },
                { label: "Dibuat oleh", value: row.createBy?.trim() || "-" },
              ];

              return (
                <div
                  key={row.noPenerimaan}
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
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: STATUS_COLOR[status] }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 p-2.5">
                      <div className="flex items-start gap-1.5">
                        <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#111827]">
                          {formatTanggalShort(row.tglPenerimaan)}
                        </span>
                        {row.isComplete && (
                          <span className="shrink-0 rounded-full bg-green-50 px-2 py-[3px] text-[10px] font-semibold text-green-700">
                            Selesai
                          </span>
                        )}
                      </div>

                      <div className="mt-2 rounded-lg bg-[#F9FAFB] px-2 py-1.5">
                        <div className="flex items-stretch">
                          {metaItems.map((meta, i) => (
                            <div
                              key={meta.label}
                              className="flex min-w-0 flex-1 items-stretch"
                            >
                              {i > 0 ? (
                                <div
                                  className="mx-2 w-px shrink-0 bg-[#E5E7EB]"
                                  aria-hidden
                                />
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

                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-[10px] italic text-gray-400">
                          {row.noPenerimaan}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(isActiveMenu ? null : row.noPenerimaan);
                          }}
                          className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
                          aria-label="Menu"
                        >
                          ⋮
                        </button>
                      </div>
                    </div>
                  </div>

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
                            notify(
                              "Edit belum didukung untuk data penerimaan",
                            );
                          }}
                        >
                          <EditIcon className="h-5 w-5" />
                          <span className="text-[13px] font-bold">Edit</span>
                        </button>
                        <div
                          className="my-auto h-[60px] w-px bg-[#E5E7EB]"
                          aria-hidden
                        />
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
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat
                lagi…
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="py-2 text-center text-[11px] text-gray-400">
                Tidak ada data lagi
              </p>
            )}
          </div>
        )}
      </div>

      {deleteTarget && (
        <PbpConfirmDialog
          title="Hapus Penerimaan?"
          message={`Yakin ingin menghapus penerimaan ${deleteTarget.noPenerimaan}?`}
          confirmLabel="Hapus"
          loading={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      )}

      {statusDialog && (
        <PbpStatusDialog
          type={statusDialog.type}
          title={statusDialog.title}
          message={statusDialog.message}
          onClose={() => {
            const wasSuccess = statusDialog.type === "success";
            setStatusDialog(null);
            if (wasSuccess) {
              setDeleteTarget(null);
              onRefresh();
            }
          }}
        />
      )}
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
    >
      {label}
    </button>
  );
}
