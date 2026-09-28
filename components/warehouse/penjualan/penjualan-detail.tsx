"use client";

import { useCallback, useEffect, useState } from "react";
import { getPenjualanDetailAction } from "@/app/(app)/warehouse/penjualan/actions";
import {
  kategoriLabel,
  type PenjualanDetail,
  type PenjualanLine,
} from "@/services/penjualan-service";
import {
  CheckCircleIcon,
  Loader2Icon,
  QrCodeIcon,
  RotateCcwIcon,
} from "@/components/dashboard/icons";
import { PenjualanScanDialog } from "./penjualan-scan-dialog";

const PRIMARY = "#1E6FD9";
const SUCCESS = "#0A7349";
const BORDER = "#E2E6EA";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function LineCard({ line, index }: { line: PenjualanLine; index: number }) {
  const target = line.pcsRequired;
  const scanned = line.pcsScanned;
  const pct = target > 0 ? Math.min(100, Math.round((scanned / target) * 100)) : 0;
  const nama = line.namaJenis?.trim()
    ? line.namaJenis
    : `${kategoriLabel(line.kodeKategori)} #${line.idJenis}`;

  return (
    <div
      className="rounded-xl border bg-white p-3.5"
      style={{ borderColor: line.isComplete ? "#A7F3D0" : BORDER }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: line.isComplete ? SUCCESS : "#9CA3AF" }}
        >
          {line.isComplete ? <CheckCircleIcon className="h-3.5 w-3.5" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">{nama}</p>
          <p className="text-[11px] text-gray-500">
            {kategoriLabel(line.kodeKategori)}
          </p>
        </div>
        <p
          className="shrink-0 text-sm font-extrabold"
          style={{ color: line.isComplete ? SUCCESS : "#1A1D23" }}
        >
          {scanned}/{target} pcs
        </p>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: line.isComplete ? SUCCESS : PRIMARY,
          }}
        />
      </div>

      {line.scans.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-lg bg-gray-50 p-2">
          {line.scans.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700"
              style={{ borderColor: BORDER }}
              title={s.noPartial ? `Partial ${s.noPartial}` : undefined}
            >
              {s.noLabel} ({s.pcs})
              {s.noPartial && (
                <span className="rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-700">
                  PARTIAL
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Panel kanan: detail Penjualan (turnover per jenis + label yang discan). */
export function PenjualanDetailPanel({
  noBJJual,
  canScan,
  onCompleted,
  onChanged,
}: {
  noBJJual: string;
  canScan: boolean;
  /** Semua turnover terpenuhi setelah scan → daftar perlu dimuat ulang. */
  onCompleted: () => void;
  /** Ada scan berhasil (progres berubah). */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<PenjualanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await getPenjualanDetailAction(noBJJual);
    setLoading(false);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
    return res.ok ? res.detail : null;
  }, [noBJJual]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPenjualanDetailAction(noBJJual);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setDetail(res.detail);
        setError(null);
      } else {
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noBJJual]);

  async function handleScanned() {
    const fresh = await load();
    onChanged();
    if (fresh && fresh.lines.length > 0 && fresh.lines.every((l) => l.isComplete)) {
      onCompleted();
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
        <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat detail…
      </div>
    );
  }
  if (error && !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-red-600">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (!detail) return null;

  const { header, lines } = detail;
  const allFulfilled = lines.length > 0 && lines.every((l) => l.isComplete);
  const showScan = canScan && !allFulfilled && !header.isComplete;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-base font-extrabold text-gray-900">
            Detail Penjualan
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border bg-white p-4" style={{ borderColor: BORDER }}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-gray-900">{header.noBJJual}</p>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: header.isComplete ? "#ECFDF5" : "#FFFBEB",
                color: header.isComplete ? SUCCESS : "#B45309",
              }}
            >
              {header.isComplete ? "Complete" : "Belum Complete"}
            </span>
          </div>
          <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gray-500">Tanggal</dt>
              <dd className="font-semibold text-gray-800">{fmtDate(header.tanggal)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gray-500">Pembeli</dt>
              <dd className="font-semibold text-gray-800">
                {header.namaPembeli || `Pembeli #${header.idPembeli}`}
              </dd>
            </div>
            {header.invoiceType && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">Invoice</dt>
                <dd className="font-semibold text-gray-800">{header.invoiceType}</dd>
              </div>
            )}
            {header.remark && (
              <div className="flex gap-2 sm:col-span-2">
                <dt className="w-16 shrink-0 text-gray-500">Remark</dt>
                <dd className="text-gray-800">{header.remark}</dd>
              </div>
            )}
            {header.isComplete && header.dateComplete && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">Selesai</dt>
                <dd className="font-semibold text-gray-800">
                  {fmtDate(header.dateComplete)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <p className="pt-1 text-sm font-bold text-gray-800">Item yang Dipickup</p>
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-gray-400" style={{ borderColor: BORDER }}>
            Belum ada item
          </p>
        ) : (
          <div className="space-y-2.5">
            {lines.map((l, i) => (
              <LineCard key={`${l.kodeKategori}-${l.idJenis}`} line={l} index={i + 1} />
            ))}
          </div>
        )}

        <p
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{
            backgroundColor: allFulfilled ? "#ECFDF5" : "#EFF6FF",
            color: allFulfilled ? SUCCESS : "#1D4ED8",
          }}
        >
          {allFulfilled
            ? "Semua item turnover sudah terpenuhi — Penjualan ini complete."
            : canScan
              ? "Scan label lewat tombol Scan sampai semua item terpenuhi."
              : "Anda tidak punya akses scan (penjualan:create)."}
        </p>
      </div>

      {showScan && (
        <div className="flex shrink-0 justify-end border-t bg-white px-4 py-3" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow"
            style={{ backgroundColor: PRIMARY }}
          >
            <QrCodeIcon className="h-4 w-4" /> Scan
          </button>
        </div>
      )}

      {scanOpen && (
        <PenjualanScanDialog
          noBJJual={noBJJual}
          onScanned={() => void handleScanned()}
          onClose={() => setScanOpen(false)}
        />
      )}
    </div>
  );
}
