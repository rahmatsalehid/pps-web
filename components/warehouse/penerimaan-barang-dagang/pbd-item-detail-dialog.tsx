"use client";

import { useState } from "react";
import type { PbdItem } from "@/services/penerimaan-barang-dagang-service";
import {
  deletePbdLabelAction,
  printPbdLabelAction,
} from "@/app/(app)/warehouse/penerimaan-barang-dagang/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import {
  CloseIcon,
  LabelIcon,
  PrintDisabledIcon,
  PrintIcon,
} from "./pbd-icons";
import { fmtQty } from "./pbd-format";
import { printPdfBase64 } from "./print-pdf";
import { PbdConfirmDialog } from "./pbd-confirm-dialog";

const ACCENT = "#00897B";
const BORDER = "#E2E6EA";

export function PbdItemDetailDialog({
  item,
  onClose,
  onChanged,
  onSnack,
}: {
  item: PbdItem;
  onClose: () => void;
  onChanged: () => void;
  onSnack: (message: string) => void;
}) {
  const [busy, setBusy] = useState<"print" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printCount, setPrintCount] = useState(item.hasBeenPrinted);

  async function handlePrint() {
    if (busy) return;
    setBusy("print");
    setError(null);
    const res = await printPbdLabelAction(item.noBarangDagang);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.hasBeenPrinted != null) setPrintCount(res.hasBeenPrinted);
    printPdfBase64(res.pdfBase64, item.noBarangDagang);
    onSnack(`Label ${item.noBarangDagang} dicetak.`);
    onChanged();
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const res = await deletePbdLabelAction(item.noBarangDagang);
    setDeleting(false);
    setConfirmDelete(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSnack(`Barang ${item.noBarangDagang} dihapus.`);
    onChanged();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 pb-3.5 pt-3.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span
              className="grid place-items-center rounded-[9px] p-2"
              style={{ backgroundColor: `${ACCENT}17`, color: ACCENT }}
            >
              <LabelIcon className="h-[18px] w-[18px]" />
            </span>
            <h2 className="min-w-0 flex-1 text-[15px] font-extrabold text-[#1F2937]">
              Detail Label
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy != null || deleting}
              className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100 disabled:opacity-50"
              aria-label="Tutup"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 pb-0 pt-3.5">
            <DetailRow label="Nomor" value={item.noBarangDagang} mono />
            <div className="mt-[9px]" />
            <DetailRow label="Jenis" value={item.namaBarang} />
            <div className="mt-[9px]" />
            <DetailRow label="Qty" value={`${fmtQty(item.qty)} PCS`} />
            {item.namaSupplier && (
              <>
                <div className="mt-[9px]" />
                <DetailRow label="Supplier" value={item.namaSupplier} />
              </>
            )}
          </div>

          {/* Print count */}
          <div className="flex items-center gap-1.5 px-4 pb-0 pt-3">
            {printCount > 0 ? (
              <PrintIcon className="h-[15px] w-[15px]" style={{ color: ACCENT }} />
            ) : (
              <PrintDisabledIcon className="h-[15px] w-[15px] text-gray-400" />
            )}
            <span
              className="text-xs"
              style={{
                color: printCount > 0 ? ACCENT : "#9CA3AF",
                fontWeight: printCount > 0 ? 600 : 400,
              }}
            >
              {printCount > 0
                ? `Sudah dicetak ${printCount} kali`
                : "Belum pernah dicetak"}
            </span>
          </div>

          {error && (
            <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 px-4 pb-4 pt-3.5">
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={busy != null || deleting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[13px] font-bold text-white disabled:bg-gray-300"
              style={{ backgroundColor: ACCENT }}
            >
              {busy === "print" ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PrintIcon className="h-4 w-4" />
              )}
              {busy === "print"
                ? "Memproses..."
                : printCount > 0
                  ? "Cetak Ulang"
                  : "Cetak Label"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy != null || deleting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-red-300 text-[13px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
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
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
              Hapus Label
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <PbdConfirmDialog
          title="Hapus Barang?"
          message={`Yakin ingin menghapus ${item.namaBarang} (${item.noBarangDagang})?`}
          confirmLabel="Hapus"
          loading={deleting}
          error={error}
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            setConfirmDelete(false);
            setError(null);
          }}
        />
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start">
      <span className="w-[66px] shrink-0 text-xs text-[#6B7280]">{label}</span>
      <span className="min-w-0 flex-1 pl-2 text-[13px] font-semibold text-[#1F2937]">
        <span
          className={`block break-words ${mono ? "font-mono" : ""}`}
          title={value}
        >
          {value}
        </span>
      </span>
    </div>
  );
}
