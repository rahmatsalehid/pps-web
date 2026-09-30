"use client";

import { useEffect, useState } from "react";
import {
  getInTransitDetailAction,
} from "@/app/(app)/warehouse/in-transit/actions";
import type { GoodTransferDetail } from "@/services/good-transfer-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { InTransitLocationDialog } from "./in-transit-location-dialog";
import { InTransitScanDialog } from "./in-transit-scan-dialog";
import {
  itKategoriPrefix,
  itLokasiLabel,
} from "./in-transit-format";
import {
  ItCheckCircleIcon,
  ItCircleIcon,
  ItPinIcon,
  ItQrIcon,
} from "./in-transit-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const GREEN = "#0A7349";

export function InTransitDetail({
  noTransfer,
  onListRefresh,
}: {
  noTransfer: string;
  onListRefresh: () => void;
}) {
  const [detail, setDetail] = useState<GoodTransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [locError, setLocError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [scanTarget, setScanTarget] = useState<{
    blok: string;
    idLokasi: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getInTransitDetailAction(noTransfer);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setDetail(res.detail);
        setError(null);
      } else {
        setDetail(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noTransfer, reloadKey]);

  const scans = detail?.scans ?? [];
  const received = scans.filter((s) => s.isReceived).length;
  const allReceived = scans.length > 0 && received >= scans.length;
  const pendingScans = scans.some((s) => !s.isReceived);

  const openPicker = () => {
    const idWarehouseTujuan = detail?.header.idWarehouseTujuan ?? 0;
    if (!idWarehouseTujuan) {
      setLocError("Data warehouse tujuan tidak ditemukan");
      return;
    }
    setLocError(null);
    setShowPicker(true);
  };

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F3F5F8]">
      <div className="min-h-0 flex-1 overflow-auto p-4 pb-24">
        {loading && !detail && (
          <div className="flex h-40 items-center justify-center">
            <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && error && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-xs font-bold text-[#1E6FD9] underline"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {detail && (
          <div
            className="overflow-hidden rounded-[10px] border bg-white"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <span
                className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-white"
                style={{ backgroundColor: allReceived ? GREEN : PRIMARY }}
              >
                {allReceived ? (
                  <ItCheckCircleIcon style={{ width: 13, height: 13 }} />
                ) : (
                  <ItQrIcon style={{ width: 12, height: 12 }} />
                )}
              </span>
              <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1A1D23]">
                Label Dikirim
              </p>
              <p
                className="shrink-0 text-[11.5px] font-bold"
                style={{ color: allReceived ? GREEN : "#6B7280" }}
              >
                {received} / {scans.length} diterima
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${BORDER}` }} />

            {scans.length === 0 && (
              <p className="px-5 py-5 text-center text-[13px] text-gray-500">
                Belum ada label discan di sisi pengirim
              </p>
            )}

            {scans.map((scan, i) => (
              <div
                key={`${scan.id}-${i}`}
                className="flex items-center gap-2.5 px-3.5 py-2.5"
                style={{
                  borderTop: i === 0 ? undefined : `1px solid ${BORDER}`,
                  backgroundColor: scan.isReceived
                    ? "rgba(10,115,73,0.04)"
                    : undefined,
                }}
              >
                {scan.isReceived ? (
                  <ItCheckCircleIcon
                    className="shrink-0"
                    style={{ width: 18, height: 18, color: GREEN }}
                  />
                ) : (
                  <ItCircleIcon
                    className="shrink-0"
                    style={{ width: 18, height: 18, color: "#9CA3AF" }}
                  />
                )}
                <span
                  className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[10px] font-extrabold"
                  style={{ backgroundColor: "rgba(30,111,217,0.1)", color: PRIMARY }}
                >
                  {itKategoriPrefix(scan.kodeKategori)}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[12.5px] font-bold ${
                    scan.isReceived ? "text-gray-500 line-through" : "text-[#1A1D23]"
                  }`}
                  title={scan.labelCode}
                >
                  {scan.labelCode}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-[#1E6FD9]">
                  {scan.pcs} pcs
                </span>
                {scan.isReceived &&
                  scan.blokTujuan &&
                  scan.idLokasiTujuan != null && (
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-gray-600">
                      <ItPinIcon style={{ width: 12, height: 12 }} />
                      {itLokasiLabel(scan.blokTujuan, scan.idLokasiTujuan)}
                    </span>
                  )}
              </div>
            ))}
          </div>
        )}

        {locError && (
          <p
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {locError}
          </p>
        )}
      </div>

      {detail && pendingScans && !loading && (
        <div className="pointer-events-none absolute bottom-5 right-5">
          <button
            type="button"
            onClick={openPicker}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            <ItQrIcon style={{ width: 17, height: 17 }} />
            Scan Terima
          </button>
        </div>
      )}

      {showPicker && detail && (
        <InTransitLocationDialog
          idWarehouseTujuan={detail.header.idWarehouseTujuan}
          onSelect={(blok, idLokasi) => {
            setShowPicker(false);
            setScanTarget({ blok, idLokasi });
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {scanTarget && (
        <InTransitScanDialog
          noTransfer={noTransfer}
          blok={scanTarget.blok}
          idLokasi={scanTarget.idLokasi}
          scans={scans}
          onUpdated={() => setReloadKey((k) => k + 1)}
          onClose={() => {
            setScanTarget(null);
            onListRefresh();
          }}
        />
      )}
    </div>
  );
}
