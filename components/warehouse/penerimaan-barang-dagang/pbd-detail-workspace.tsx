"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PbdDetail,
  PbdItem,
} from "@/services/penerimaan-barang-dagang-service";
import {
  completePbdAction,
  deletePbdLabelAction,
  getPbdDetailAction,
  printPbdLabelAction,
} from "@/app/(app)/warehouse/penerimaan-barang-dagang/actions";
import { CheckCircleIcon, Loader2Icon } from "@/components/dashboard/icons";
import {
  AddIcon,
  CloseIcon,
  NumbersIcon,
  PrintIcon,
} from "./pbd-icons";
import { fmtQty, formatTanggalShort } from "./pbd-format";
import { printPdfBase64 } from "./print-pdf";
import { PbdConfirmDialog } from "./pbd-confirm-dialog";
import { PbdStatusDialog } from "./pbd-status-dialog";
import { PbdItemDetailDialog } from "./pbd-item-detail-dialog";
import { PbdItemFormDialog } from "./pbd-item-form-dialog";

const ACCENT = "#00897B";

type StatusDialogState = {
  type: "success" | "error";
  title: string;
  message: string;
};

export function PbdDetailWorkspace({
  noPenerimaan,
  initialDetail,
}: {
  noPenerimaan: string;
  initialDetail: PbdDetail | null;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<PbdDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogItem, setDlgItem] = useState<PbdItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkPrinting, setBulkPrinting] = useState(false);

  const [statusDialog, setStatusDialog] =
    useState<StatusDialogState | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getPbdDetailAction(noPenerimaan);
    setLoading(false);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [noPenerimaan]);

  useEffect(() => {
    if (detail) return;
    let cancelled = false;
    void (async () => {
      const res = await getPbdDetailAction(noPenerimaan);
      if (cancelled) return;
      if (res.ok) setDetail(res.detail);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, noPenerimaan]);

  function enterSelectionMode(code: string) {
    setSelected(new Set([code]));
    setSelectionMode(true);
  }

  function toggleSelection(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
    setSelectionMode(next.size > 0);
  }

  function exitSelectionMode() {
    setSelected(new Set());
    setSelectionMode(false);
  }

  async function handleBulkDelete() {
    const codes = [...selected];
    if (codes.length === 0) return;
    setBulkDeleting(true);
    setBulkDeleteError(null);
    let failed = 0;
    for (const code of codes) {
      const res = await deletePbdLabelAction(code);
      if (!res.ok) failed++;
    }
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    exitSelectionMode();
    void reload();
    if (failed > 0) showFlash(`${failed} barang gagal dihapus`);
  }

  async function handleBulkPrint() {
    const codes = [...selected];
    if (codes.length === 0 || bulkPrinting) return;
    setBulkPrinting(true);
    let failure: string | null = null;
    for (const code of codes) {
      const res = await printPbdLabelAction(code);
      if (!res.ok) {
        failure = `Gagal mencetak ${code}: ${res.error}`;
        break;
      }
      printPdfBase64(res.pdfBase64, code);
    }
    setBulkPrinting(false);
    exitSelectionMode();
    void reload();
    if (failure) showFlash(failure);
  }

  async function handleComplete() {
    if (completing) return;
    setCompleting(true);
    setCompleteError(null);
    const res = await completePbdAction(noPenerimaan);
    setCompleting(false);
    setConfirmComplete(false);
    if (!res.ok) {
      setCompleteError(res.error);
      setStatusDialog({
        type: "error",
        title: "Gagal",
        message: res.error,
      });
      return;
    }
    setStatusDialog({
      type: "success",
      title: "Berhasil",
      message: "Penerimaan berhasil ditandai selesai.",
    });
  }

  const header = detail?.header ?? null;
  const items = detail?.items ?? [];
  const isComplete = header?.isComplete ?? false;

  if (error && !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {`Gagal memuat barang\n${error}`}
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Loader2Icon className="h-4 w-4 animate-spin" /> Coba Lagi
        </button>
      </div>
    );
  }

  if (!detail || !header) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
          </>
        ) : (
          "Data tidak ditemukan"
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#F3F5F8]">
      {/* Header / selection bar */}
      {selectionMode ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-[#E5E7EB] bg-white px-2 py-1.5">
          <button
            type="button"
            onClick={exitSelectionMode}
            className="rounded p-1.5 text-[#6B7280] hover:bg-gray-100"
            title="Batal"
            aria-label="Batal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <span className="text-[13px] font-bold text-[#1F2937]">
            {selected.size} dipilih
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            disabled={selected.size === 0 || bulkPrinting}
            className="rounded p-1.5 text-[#DC2626] hover:bg-red-50 disabled:text-gray-300"
            title="Hapus yang dipilih"
            aria-label="Hapus yang dipilih"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void handleBulkPrint()}
            disabled={selected.size === 0 || bulkPrinting}
            className="rounded p-1.5 hover:bg-teal-50 disabled:text-gray-300"
            style={{ color: ACCENT }}
            title="Print yang dipilih"
            aria-label="Print yang dipilih"
          >
            {bulkPrinting ? (
              <Loader2Icon className="h-5 w-5 animate-spin" />
            ) : (
              <PrintIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[#E5E7EB] bg-white px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#1F2937]">
              {header.namaTim} • {formatTanggalShort(header.tglPenerimaan)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">
              {header.noPenerimaan}
            </p>
          </div>
          {isComplete ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#DCFCE7] px-2.5 py-1.5 text-xs font-bold text-[#16A34A]">
              <CheckCircleIcon className="h-3.5 w-3.5" /> Selesai
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmComplete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-bold text-white hover:brightness-95"
            >
              <CheckCircleIcon className="h-4 w-4" /> Selesai
            </button>
          )}
        </div>
      )}

      {/* Grid barang */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && detail ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            Belum ada barang
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemTile
                key={item.noBarangDagang}
                item={item}
                selectionMode={selectionMode}
                selected={selected.has(item.noBarangDagang)}
                onTap={() => {
                  if (selectionMode) toggleSelection(item.noBarangDagang);
                  else setDlgItem(item);
                }}
                onLongPress={() => {
                  if (!selectionMode) enterSelectionMode(item.noBarangDagang);
                }}
                onToggle={() => toggleSelection(item.noBarangDagang)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB tambah barang */}
      {!selectionMode && !isComplete && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="absolute bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition hover:brightness-95"
          style={{ backgroundColor: ACCENT }}
          aria-label="Tambah Barang"
        >
          <AddIcon className="h-6 w-6" />
        </button>
      )}

      {dialogItem && (
        <PbdItemDetailDialog
          item={dialogItem}
          onClose={() => setDlgItem(null)}
          onChanged={() => void reload()}
          onSnack={showFlash}
        />
      )}

      {addOpen && (
        <PbdItemFormDialog
          noPenerimaan={noPenerimaan}
          onClose={() => setAddOpen(false)}
          onSaved={() => void reload()}
        />
      )}

      {confirmComplete && (
        <PbdConfirmDialog
          title="Tandai Selesai?"
          message={`Yakin ingin menandai penerimaan ${noPenerimaan} sebagai selesai? Setelah selesai, tim tidak bisa menambah barang lagi.`}
          confirmLabel="Selesai"
          confirmColor="#16A34A"
          danger={false}
          loading={completing}
          error={completeError}
          onConfirm={() => void handleComplete()}
          onCancel={() => {
            setConfirmComplete(false);
            setCompleteError(null);
          }}
        />
      )}

      {confirmBulkDelete && (
        <PbdConfirmDialog
          title={`Hapus ${selected.size} Barang?`}
          message={`Yakin ingin menghapus ${selected.size} barang yang dipilih?`}
          confirmLabel="Hapus"
          loading={bulkDeleting}
          error={bulkDeleteError}
          onConfirm={() => void handleBulkDelete()}
          onCancel={() => {
            setConfirmBulkDelete(false);
            setBulkDeleteError(null);
          }}
        />
      )}

      {statusDialog && (
        <PbdStatusDialog
          type={statusDialog.type}
          title={statusDialog.title}
          message={statusDialog.message}
          onClose={() => {
            const wasSuccess = statusDialog.type === "success";
            setStatusDialog(null);
            if (wasSuccess) {
              void reload();
              router.push("/warehouse/penerimaan-barang-dagang");
            }
          }}
        />
      )}

      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-lg bg-gray-900/90 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg">
          {flash}
        </div>
      )}
    </div>
  );
}

function ItemTile({
  item,
  selectionMode,
  selected,
  onTap,
  onLongPress,
  onToggle,
}: {
  item: PbdItem;
  selectionMode: boolean;
  selected: boolean;
  onTap: () => void;
  onLongPress: () => void;
  onToggle: () => void;
}) {
  const timer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  function clearTimer() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function handlePointerDown() {
    longPressFired.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, 450);
  }

  function handlePointerUp() {
    clearTimer();
  }

  function handleClick() {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectionMode) onToggle();
    else onTap();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (selectionMode) onToggle();
          else onTap();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative min-h-[104px] cursor-pointer rounded-[10px] border bg-white p-2 text-left"
      style={{
        borderColor: selected ? ACCENT : "#D1D5DB",
        backgroundColor: selected ? `${ACCENT}14` : "#FFFFFF",
        borderWidth: selected ? 1.6 : 1,
      }}
    >
      <div className="flex items-start gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#1A1D23]">
          {item.namaBarang}
        </span>
        <PrintIcon
          className="h-[11px] w-[11px] shrink-0"
          style={{
            color: item.hasBeenPrinted > 0 ? ACCENT : "#D1D5DB",
          }}
        />
        <span
          className="shrink-0 text-[10px] font-bold"
          style={{ color: item.hasBeenPrinted > 0 ? ACCENT : "#D1D5DB" }}
        >
          x{item.hasBeenPrinted}
        </span>
      </div>
      <p className="mt-px truncate text-[10px] text-gray-500">
        {item.noBarangDagang}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
          <NumbersIcon className="h-3 w-3" />
          {fmtQty(item.qty)} PCS
        </span>
        {item.namaSupplier && (
          <span
            className="inline-flex min-w-0 max-w-full items-center gap-1 text-[10px] text-gray-600"
            title={item.namaSupplier}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 shrink-0"
              aria-hidden
            >
              <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
            <span className="truncate">{item.namaSupplier}</span>
          </span>
        )}
      </div>

      {selectionMode && (
        <span className="absolute right-1 top-1">
          {selected ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              style={{ color: ACCENT }}
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path
                d="m8 12.5 2.5 2.5 4.5-5"
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4 text-gray-400"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </span>
      )}
    </div>
  );
}
