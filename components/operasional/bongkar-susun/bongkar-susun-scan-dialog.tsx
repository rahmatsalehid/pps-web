"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, QrCodeIcon, X } from "@/components/dashboard/icons";
import { CameraScanner } from "./camera-scanner";
import { AddBoxIcon, KeyboardIcon, LabelIcon } from "./bongkar-susun-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";

type AcceptedLabel = { prefix: string; label: string };

/**
 * Dialog scan/input label untuk Bongkar Susun — panel kiri daftar label yang
 * diterima, panel kanan tab kamera / input manual. `onLookup` mengembalikan
 * null bila label berhasil ditambahkan, atau string error.
 */
export function BongkarSusunScanDialog({
  onLookup,
  manualHint,
  headerSubtitle,
  acceptedLabels,
  onClose,
}: {
  onLookup: (code: string) => Promise<string | null>;
  manualHint: string;
  headerSubtitle?: string;
  acceptedLabels: AcceptedLabel[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"camera" | "manual">("camera");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === "manual") inputRef.current?.focus();
  }, [tab]);

  async function lookup(raw: string) {
    const label = raw.trim();
    if (!label || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const err = await onLookup(label);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo(`Label ${label} berhasil ditambahkan.`);
    setCode("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/15 p-1.5">
              <QrCodeIcon className="h-5 w-5" />
            </span>
            <p className="text-sm font-bold">Scan / Input Label</p>
          </div>
          <div className="flex items-center gap-2">
            {headerSubtitle && (
              <span className="text-[11px] text-white/75">{headerSubtitle}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white/15 p-1 hover:bg-white/25"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          <aside
            className="hidden w-40 shrink-0 border-r p-3.5 sm:block"
            style={{ borderColor: BORDER, backgroundColor: "#F5F7FA" }}
          >
            <p
              className="flex items-center gap-1.5 text-xs font-bold"
              style={{ color: `${PRIMARY}CC` }}
            >
              <LabelIcon className="h-3.5 w-3.5" /> Label diterima
            </p>
            <div className="mt-2.5 space-y-1.5">
              {acceptedLabels.map((e) => (
                <div key={e.prefix} className="flex items-center gap-1.5">
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-extrabold"
                    style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
                  >
                    {e.prefix}
                  </span>
                  <span className="truncate text-[11px] text-[#4A5568]">
                    {e.label}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex" style={{ backgroundColor: PRIMARY }}>
              <button
                type="button"
                onClick={() => setTab("camera")}
                className="flex flex-1 flex-col items-center gap-1 border-b-[3px] px-3 py-2.5 text-xs font-bold"
                style={{
                  borderColor: tab === "camera" ? "#fff" : "transparent",
                  color: tab === "camera" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <QrCodeIcon className="h-4 w-4" />
                Scan Kamera
              </button>
              <button
                type="button"
                onClick={() => setTab("manual")}
                className="flex flex-1 flex-col items-center gap-1 border-b-[3px] px-3 py-2.5 text-xs font-bold"
                style={{
                  borderColor: tab === "manual" ? "#fff" : "transparent",
                  color: tab === "manual" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <KeyboardIcon className="h-4 w-4" />
                Input Manual
              </button>
            </div>

            <div className="h-[360px] overflow-auto">
              {tab === "camera" ? (
                <div className="space-y-2 p-4">
                  <CameraScanner paused={busy} onDetected={(t) => void lookup(t)} />
                  <p className="text-center text-[11px] text-gray-500">
                    Arahkan kamera ke barcode/QR pada label. Hasil terbaca otomatis
                    diproses.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void lookup(code);
                  }}
                  className="space-y-3.5 p-5"
                >
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Kode Label
                    </span>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder={manualHint}
                        autoComplete="off"
                        className="h-12 w-full rounded-xl border bg-[#F8F9FB] px-4 text-center text-[15px] font-bold outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
                        style={{ borderColor: BORDER }}
                      />
                      {code && (
                        <button
                          type="button"
                          onClick={() => setCode("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
                          aria-label="Bersihkan"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
                  <button
                    type="submit"
                    disabled={busy || !code.trim()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {busy ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : (
                      <AddBoxIcon className="h-4 w-4" />
                    )}
                    Tambah Label
                  </button>
                </form>
              )}
            </div>

            {tab === "camera" && (error || info) && (
              <div className="px-4 pb-4">
                {error && (
                  <p
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                {info && !error && (
                  <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    {info}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
