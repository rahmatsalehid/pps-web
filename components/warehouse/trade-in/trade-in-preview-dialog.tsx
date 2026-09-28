"use client";

import { useState } from "react";
import {
  deleteTradeInAction,
  printTradeInRejectLabelAction,
} from "@/app/(app)/warehouse/trade-in/actions";
import type { TradeInRow } from "@/services/trade-in-service";
import { Loader2Icon, TrashIcon, X } from "@/components/dashboard/icons";
import { EyeIcon, PrintIcon } from "./trade-in-icons";
import { printPdfBase64 } from "./print-pdf";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

type ErrorDialog = { title: string; message: string } | null;

export function TradeInPreviewDialog({
  row,
  onClose,
  onDeleted,
  onPrinted,
}: {
  row: TradeInRow;
  onClose: () => void;
  onDeleted: (noPenerimaan: string) => void;
  onPrinted: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorDialog, setErrorDialog] = useState<ErrorDialog>(null);

  const reject = row.reject;

  const print = async () => {
    if (!reject || printing || !reject.noReject) return;
    setPrinting(true);
    const res = await printTradeInRejectLabelAction(reject.noReject);
    setPrinting(false);
    if (!res.ok) {
      setErrorDialog({ title: "Gagal Mencetak", message: res.error });
      return;
    }
    printPdfBase64(res.pdfBase64, reject.noReject);
    onPrinted();
  };

  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteTradeInAction(row.noPenerimaan);
    setDeleting(false);
    if (!res.ok) {
      setConfirmOpen(false);
      setErrorDialog({ title: "Gagal Menghapus", message: res.error });
      return;
    }
    onDeleted(row.noPenerimaan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="flex items-center gap-2.5 px-4 pb-3.5 pt-3.5">
          <span
            className="flex shrink-0 items-center justify-center rounded-[9px] p-2"
            style={{ backgroundColor: `${PRIMARY}17` }}
          >
            <EyeIcon className="h-[18px] w-[18px]" style={{ color: PRIMARY }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-[#1A1D23]">
              Detail Penerimaan
            </p>
            <p className="text-[11px] text-[#6B7280]">{row.noPenerimaan}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="h-px bg-[#E2E6EA]" />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3.5">
          <InfoRow label="No. Penerimaan" value={row.noPenerimaan} />
          <InfoRow label="Tanggal" value={row.tanggal || "-"} />
          <InfoRow label="Supplier" value={row.supplier || "-"} />
          <InfoRow
            label="Sales Person"
            value={row.salesPersonName || row.salesPersonCode || "-"}
          />
          <div className="mt-2 border-t" style={{ borderColor: BORDER }} />
          <p className="mt-3 text-[13px] font-bold text-[#1A1D23]">Reject</p>
          <div className="mt-2.5">
            {!reject ? (
              <p className="text-[13px] text-gray-500">Belum ada label reject</p>
            ) : (
              <>
                <InfoRow label="No. Reject" value={reject.noReject} />
                <InfoRow label="Jenis Reject" value={reject.namaReject} />
                <InfoRow
                  label="Berat"
                  value={`${formatWeight(reject.berat)} kg`}
                />
              </>
            )}
          </div>
        </div>

        <div className="h-px bg-[#E2E6EA]" />

        <div className="flex gap-3 px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting || printing}
            className="inline-flex items-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-bold text-red-600 transition disabled:opacity-60"
            style={{ borderColor: "#FECACA" }}
          >
            {deleting ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <TrashIcon className="h-[18px] w-[18px]" />
            )}
            Hapus
          </button>
          <button
            type="button"
            onClick={() => void print()}
            disabled={!reject || printing || deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-bold text-white transition disabled:bg-gray-300"
            style={{ backgroundColor: PRIMARY }}
          >
            {printing ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <PrintIcon className="h-[18px] w-[18px]" />
            )}
            {reject ? "Cetak Label Reject" : "Tidak Ada Label Reject"}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">Hapus Penerimaan</p>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {`Yakin ingin menghapus penerimaan ${row.noPenerimaan} ("${row.supplier}")? Data reject terkait akan ikut terhapus dan tidak dapat dikembalikan.`}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                style={{ borderColor: BORDER }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void doDelete()}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#DC2626] py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {errorDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">
              {errorDialog.title}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {errorDialog.message}
            </p>
            <button
              type="button"
              onClick={() => setErrorDialog(null)}
              className="mt-4 w-full rounded-lg bg-[#E53935] py-2 text-sm font-bold text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-start">
      <span className="w-[130px] shrink-0 text-[12.5px] font-semibold text-gray-600">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-[#1A1D23]">
        {value}
      </span>
    </div>
  );
}

function formatWeight(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}
