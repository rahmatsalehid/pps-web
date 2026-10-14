"use client";

import { useEffect, useRef, useState } from "react";
import {
  printPenjualanParentLabelAction,
  scanPenjualanAction,
} from "@/app/(app)/warehouse/penjualan/actions";
import type { PenjualanPartialSuggestion } from "@/services/penjualan-service";
import { Loader2Icon, QrCodeIcon, X } from "@/components/dashboard/icons";
import { CameraScanner } from "./camera-scanner";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

function printPdfBase64(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignore */
        }
      }, 300);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

type Pending =
  | { step: "confirm"; code: string; suggestion: PenjualanPartialSuggestion }
  | {
      step: "print";
      code: string;
      kodeKategori: string;
    }
  | null;

/**
 * Scan label (BA. Barang Jadi / BB. Furniture WIP / BD. Barang Dagang) untuk
 * memenuhi turnover. Bila pcs label melebihi sisa kebutuhan, tawarkan pecah
 * (partial) lalu cetak ulang label induk (pcs pada label fisik berkurang).
 */
export function PenjualanScanDialog({
  noBJJual,
  onScanned,
  onClose,
}: {
  noBJJual: string;
  /** Dipanggil setiap scan berhasil (data detail perlu dimuat ulang). */
  onScanned: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [pending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await scan(code);
  }

  /** Proses satu kode label (dari ketikan/scanner fisik atau kamera). */
  async function scan(raw: string) {
    const label = raw.trim().toUpperCase();
    if (!label || busy) return;
    setCode(label);
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await scanPenjualanAction(noBJJual, label);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.outcome.kind === "needsConfirmation") {
      setPending({ step: "confirm", code: label, suggestion: res.outcome.suggestion });
      return;
    }
    setInfo(`Label ${label} berhasil discan.`);
    setCode("");
    onScanned();
  }

  async function confirmPartial() {
    if (pending?.step !== "confirm") return;
    const label = pending.code;
    setBusy(true);
    setError(null);
    const res = await scanPenjualanAction(noBJJual, label, true);
    setBusy(false);
    if (!res.ok) {
      setPending(null);
      setError(res.error);
      return;
    }
    setCode("");
    onScanned();
    if (res.outcome.kind === "partialCreated" && res.outcome.kodeKategori) {
      setPending({
        step: "print",
        code: label,
        kodeKategori: res.outcome.kodeKategori,
      });
    } else {
      setPending(null);
      setInfo(`Label ${label} berhasil dipecah (partial).`);
    }
  }

  async function printParent() {
    if (pending?.step !== "print") return;
    setBusy(true);
    const res = await printPenjualanParentLabelAction(
      pending.kodeKategori,
      pending.code,
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      printPdfBase64(res.pdfBase64);
      setInfo(`Label ${pending.code} dicetak ulang.`);
    }
    setPending(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <div>
            <p className="text-sm font-bold">Scan Label</p>
            <p className="text-[11px] opacity-85">
              Scan label untuk memenuhi turnover · {noBJJual}
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

        {cameraOn && !pending && (
          <div className="space-y-2 px-5 pt-5">
            <CameraScanner paused={busy} onDetected={(t) => void scan(t)} />
            <p className="text-center text-[11px] text-gray-500">
              Arahkan kamera ke barcode/QR pada label. Hasil terbaca otomatis
              diproses.
            </p>
          </div>
        )}

        {pending?.step === "confirm" ? (
          <div className="space-y-3 p-5">
            <p className="text-sm font-bold text-amber-700">
              Pcs Label Melebihi Kebutuhan
            </p>
            <p className="text-xs text-gray-700">{pending.suggestion.message}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setError("Scan dibatalkan — pcs label melebihi sisa kebutuhan");
                }}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmPartial()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Ya, Pecah {pending.suggestion.pcsNeeded} pcs
              </button>
            </div>
          </div>
        ) : pending?.step === "print" ? (
          <div className="space-y-3 p-5">
            <p className="text-sm font-bold text-emerald-700">
              Partial Berhasil Dibuat
            </p>
            <p className="text-xs text-gray-700">
              Label {pending.code} berhasil dipecah (partial) untuk memenuhi
              turnover Penjualan ini. Pcs pada label fisiknya sekarang berkurang,
              jadi label perlu dicetak ulang supaya pcs yang tertera sesuai.
              Cetak sekarang?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={() => void printParent()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Cetak Sekarang
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Kode label (BA. Barang Jadi / BB. Furniture WIP / BD. Barang
                Dagang)
              </span>
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BA.0000000001 / BB.0000000001 / BD.0000000001"
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
        )}
      </div>
    </div>
  );
}
