"use client";

import { useEffect, useRef, useState } from "react";
import {
  printReturLabelAction,
  scanReturAction,
} from "@/app/(app)/warehouse/retur-v3/actions";
import type { ReturScanSuggestion } from "@/services/retur-v3-service";
import { Loader2Icon, QrCodeIcon, X } from "@/components/dashboard/icons";
import { CameraScanner } from "./camera-scanner";
import { printPdfBase64 } from "./print-pdf";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const WARNING = "#F59E0B";
const SUCCESS = "#43A047";

type PartialInfo = {
  labelCode: string;
  kodeKategori: string;
  pcsNeeded: number;
};

export function ReturV3ScanDialog({
  noRetur,
  onScanned,
  onClose,
}: {
  noRetur: string;
  /** Dipanggil setiap scan berhasil (data detail perlu dimuat ulang). */
  onScanned: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ReturScanSuggestion | null>(null);
  const [partial, setPartial] = useState<PartialInfo | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [suggestion, partial]);

  async function scan(raw: string) {
    const label = raw.trim().toUpperCase();
    if (!label || busy || suggestion || partial) return;
    setCode(label);
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await scanReturAction(noRetur, label);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.outcome.kind === "needsConfirmation") {
      setSuggestion(res.outcome.suggestion);
      return;
    }
    const data = res.outcome.data;
    onScanned();
    if (data.wasPartialSplit) {
      setPartial({
        labelCode: data.labelCode || label,
        kodeKategori: data.kodeKategori,
        pcsNeeded: data.pcs,
      });
      return;
    }
    setInfo(`Label ${label} berhasil discan.`);
    setCode("");
  }

  async function confirmPartial() {
    if (!suggestion) return;
    const label = suggestion.labelCode;
    setBusy(true);
    setError(null);
    const res = await scanReturAction(noRetur, label, true);
    setBusy(false);
    setSuggestion(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onScanned();
    const data = res.outcome.kind === "success" ? res.outcome.data : null;
    if (data?.wasPartialSplit) {
      setPartial({
        labelCode: data.labelCode || label,
        kodeKategori: data.kodeKategori,
        pcsNeeded: suggestion.pcsNeeded,
      });
      return;
    }
    setInfo(`Label ${label} dicatat ${suggestion.pcsNeeded} pcs.`);
    setCode("");
  }

  async function printParent() {
    if (!partial) return;
    setBusy(true);
    const res = await printReturLabelAction(partial.kodeKategori, partial.labelCode);
    setBusy(false);
    if (res.ok) {
      printPdfBase64(res.pdfBase64, partial.labelCode);
    } else {
      setError(res.error);
    }
    setPartial(null);
    setInfo(null);
    setCode("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <div>
            <p className="text-sm font-bold">Scan / Input Label</p>
            <p className="text-[11px] opacity-85">
              Scan label untuk memenuhi turnover · {noRetur}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/15"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {partial ? (
          <div className="space-y-3 p-5">
            <p className="text-sm font-bold text-[#1A1D23]">
              Partial Berhasil Dibuat
            </p>
            <p className="text-xs leading-relaxed text-gray-600">
              Label {partial.labelCode} berhasil dipecah (partial) untuk memenuhi
              turnover retur ini. Pcs pada label fisiknya sekarang berkurang, jadi
              label perlu dicetak ulang supaya pcs yang tertera sesuai. Cetak
              sekarang?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPartial(null);
                  setInfo(null);
                  setCode("");
                }}
                className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-[#4A5568] hover:bg-gray-50"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={() => void printParent()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: SUCCESS }}
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Cetak Sekarang
              </button>
            </div>
          </div>
        ) : suggestion ? (
          <div className="space-y-3 p-5">
            <p className="text-sm font-bold text-amber-700">
              Pcs Label Melebihi Kebutuhan
            </p>
            <p className="text-xs leading-relaxed text-gray-700">
              {suggestion.message}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSuggestion(null);
                  setError("Scan dibatalkan — pcs label melebihi sisa target");
                }}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-[#4A5568] hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmPartial()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: WARNING }}
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Ya, Pecah {suggestion.pcsNeeded} pcs
              </button>
            </div>
          </div>
        ) : (
          <>
            {cameraOn && (
              <div className="space-y-2 px-5 pt-5">
                <CameraScanner paused={busy} onDetected={(t) => void scan(t)} />
                <p className="text-center text-[11px] text-gray-500">
                  Arahkan kamera ke barcode/QR pada label. Hasil terbaca otomatis
                  diproses.
                </p>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void scan(code);
              }}
              className="space-y-3 p-5"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Kode label (BA. Barang Jadi / BB. Furniture WIP)
                </span>
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BA.0000000001 / BB.0000000001"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border bg-gray-50 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  style={{ borderColor: BORDER }}
                />
              </label>
              {info && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {info}
                </p>
              )}
              {error && (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOn((v) => !v)}
                  className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold hover:bg-blue-50"
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  <QrCodeIcon className="h-4 w-4" />
                  {cameraOn ? "Tutup Kamera" : "Scan Kamera"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Selesai
                </button>
                <button
                  type="submit"
                  disabled={busy || !code.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  Scan
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
