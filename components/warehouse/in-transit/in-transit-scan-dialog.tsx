"use client";

import { useEffect, useRef, useState } from "react";
import { acceptInTransitScanAction } from "@/app/(app)/warehouse/in-transit/actions";
import type { GoodTransferScan } from "@/services/good-transfer-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { CameraScanner } from "@/components/warehouse/good-transfer/camera-scanner";
import {
  ItCheckCircleIcon,
  ItCircleIcon,
  ItCloseIcon,
  ItQrIcon,
} from "./in-transit-icons";

const PRIMARY = "#1E6FD9";

export function InTransitScanDialog({
  noTransfer,
  blok,
  idLokasi,
  scans,
  onUpdated,
  onClose,
}: {
  noTransfer: string;
  blok: string;
  idLokasi: number;
  scans: GoodTransferScan[];
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"kamera" | "manual">("manual");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const received = scans.filter((s) => s.isReceived).length;

  useEffect(() => {
    if (tab === "manual") inputRef.current?.focus();
  }, [tab]);

  async function handleCode(raw: string) {
    const label = raw.trim().toUpperCase();
    if (!label || busy) return;
    const found = scans.find((s) => s.labelCode === label);
    if (!found) {
      setInfo(null);
      setError(
        `Label ${label} bukan bagian dari transfer ${noTransfer}`,
      );
      return;
    }
    if (found.isReceived) {
      setInfo(null);
      setError(`Label ${label} sudah diterima sebelumnya`);
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await acceptInTransitScanAction({
      labelCode: label,
      blokTujuan: blok,
      idLokasiTujuan: idLokasi,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInfo(`Label ${label} berhasil diterima.`);
    setCode("");
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[560px] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div
          className="flex items-center gap-3 px-5 py-3.5 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
            <ItQrIcon style={{ width: 18, height: 18 }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">
              Scan Terima — {noTransfer}
            </p>
          </div>
          <p className="shrink-0 text-xs font-semibold text-white/75">
            {received}/{scans.length} diterima
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 shrink-0 rounded-md bg-white/15 p-1.5 hover:bg-white/25"
            aria-label="Tutup"
          >
            <ItCloseIcon style={{ width: 17, height: 17 }} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="hidden w-[220px] shrink-0 flex-col overflow-auto border-r bg-[#F5F7FA] sm:flex"
            style={{ borderColor: "#E2E6EA" }}
          >
            <p className="px-3 pb-1.5 pt-3 text-[13px] font-bold tracking-[0.2px] text-[#1E6FD9]/80">
              Label di Transfer
            </p>
            <div className="flex flex-col gap-1.5 px-3 pb-3">
              {scans.length === 0 && (
                <p className="text-[11px] text-gray-500">Tidak ada label</p>
              )}
              {scans.map((scan, i) => (
                <div key={`${scan.id}-${i}`} className="flex items-center gap-1.5">
                  {scan.isReceived ? (
                    <ItCheckCircleIcon
                      className="shrink-0"
                      style={{ width: 15, height: 15, color: "#0A7349" }}
                    />
                  ) : (
                    <ItCircleIcon
                      className="shrink-0"
                      style={{ width: 15, height: 15, color: "#9CA3AF" }}
                    />
                  )}
                  <span
                    className={`min-w-0 truncate text-[11px] font-semibold ${
                      scan.isReceived
                        ? "text-[#1A1D23] line-through"
                        : "text-gray-600"
                    }`}
                    title={scan.labelCode}
                  >
                    {scan.labelCode}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0" style={{ backgroundColor: PRIMARY }}>
              <TabButton
                active={tab === "kamera"}
                label="Scan Kamera"
                onClick={() => setTab("kamera")}
              />
              <TabButton
                active={tab === "manual"}
                label="Input Manual"
                onClick={() => setTab("manual")}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === "kamera" ? (
                <div className="space-y-2">
                  <CameraScanner paused={busy} onDetected={(t) => void handleCode(t)} />
                  <p className="text-center text-[11px] text-gray-500">
                    Arahkan kamera ke barcode/QR pada label. Hasil terbaca otomatis
                    diproses.
                  </p>
                </div>
              ) : (
                <form
                  className="mx-auto flex max-w-sm flex-col gap-3 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleCode(code);
                  }}
                >
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-600">
                      Kode Label
                    </span>
                    <input
                      ref={inputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="A.0000000001"
                      autoComplete="off"
                      className="h-11 w-full rounded-xl border bg-[#F8F9FB] px-3 font-mono text-sm outline-none transition focus:border-[#1E6FD9]"
                      style={{ borderColor: "#E2E6EA" }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || !code.trim()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                    Tandai Diterima
                  </button>
                </form>
              )}

              {info && (
                <p className="mx-auto mt-3 max-w-sm rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {info}
                </p>
              )}
              {error && (
                <p
                  className="mx-auto mt-3 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${
        active ? "border-b-[3px] border-white text-white" : "text-white/65"
      }`}
    >
      {label}
    </button>
  );
}
