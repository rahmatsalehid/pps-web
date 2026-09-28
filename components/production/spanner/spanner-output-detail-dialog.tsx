"use client";

import { useState } from "react";
import {
  deleteSpannerLabelAction,
  printSpannerLabelAction,
} from "@/app/(app)/production/spanner/actions";
import type { SpannerOutput } from "@/services/spanner-service";
import { ConfirmDialog } from "./confirm-dialog";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const ACCENT = "#00796B";
const BORDER = "#E2E6EA";

function printPdfBase64(base64: string, title: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60_000);
      }
    };
    return;
  }
  win.onload = () => {
    setTimeout(() => {
      try {
        win.print();
      } catch {
        /* user can print from preview */
      }
      URL.revokeObjectURL(url);
    }, 300);
  };
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  void title;
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
    <div className="flex items-baseline justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <span className="shrink-0 text-[11px] text-gray-500">{label}</span>
      <span
        className={`truncate text-xs font-bold text-gray-900 ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function SpannerOutputDetailDialog({
  output,
  canModify,
  onClose,
  onChanged,
  onSnack,
}: {
  output: SpannerOutput;
  canModify: boolean;
  onClose: () => void;
  onChanged: () => void;
  onSnack: (msg: string, color?: string) => void;
}) {
  const [busy, setBusy] = useState<"print" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [printCount, setPrintCount] = useState(output.hasBeenPrinted);

  async function handlePrint() {
    if (busy) return;
    setBusy("print");
    setError(null);
    const res = await printSpannerLabelAction(output.category, output.noLabel);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.hasBeenPrinted != null) setPrintCount(res.hasBeenPrinted);
    printPdfBase64(res.pdfBase64, output.noLabel);
    onSnack(`Label ${output.noLabel} dicetak.`);
    onChanged();
  }

  async function handleDelete() {
    if (busy) return;
    setBusy("delete");
    setError(null);
    const res = await deleteSpannerLabelAction(output.category, output.noLabel);
    setBusy(null);
    setConfirmDelete(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSnack(res.message ?? "Label dihapus.");
    onChanged();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div
            className="flex items-center gap-2.5 px-5 py-3.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-sm"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              🏷
            </span>
            <h2 className="flex-1 text-sm font-bold text-gray-900">
              Detail Label Spanner
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy != null}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 px-5 py-4">
            <DetailRow label="Nomor" value={output.noLabel} mono />
            <DetailRow label="Jenis" value={output.namaJenis || "-"} />
            <DetailRow
              label="Total"
              value={
                output.category === "fwip"
                  ? `${output.pcs ?? 0} pcs`
                  : `${(output.berat ?? 0).toFixed(2)} kg`
              }
            />
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-400">🖨</span>
              <span className="text-xs text-gray-700">
                {printCount > 0
                  ? `Sudah dicetak ${printCount} kali`
                  : "Belum pernah dicetak"}
              </span>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-2 border-t px-5 py-3"
            style={{ borderColor: BORDER }}
          >
            {canModify && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={busy != null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {busy === "print" && (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                )}
                {printCount > 0 ? "Cetak Ulang" : "Cetak Label"}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {canModify && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy != null}
                  className="inline-flex h-9 items-center rounded-lg border border-red-300 px-4 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Hapus Label
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus Label Output?"
          confirmLabel="HAPUS"
          loading={busy === "delete"}
          error={error}
          onConfirm={handleDelete}
          onCancel={() => {
            setConfirmDelete(false);
            setError(null);
          }}
        >
          <p className="text-sm text-gray-700">
            Label{" "}
            <span className="font-mono font-semibold">{output.noLabel}</span>{" "}
            akan dihapus permanen dan tidak dapat dikembalikan.
          </p>
          <p className="mt-2 text-xs text-red-600">
            Tindakan ini bersifat permanen.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
