"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getGoodTransferDetailAction,
  kirimGoodTransferAction,
  undoGoodTransferScanAction,
} from "@/app/(app)/warehouse/good-transfer/actions";
import {
  kategoriLabel,
  type GoodTransferDetail,
  type GoodTransferLine,
  type GoodTransferScan,
} from "@/services/good-transfer-service";
import {
  BoxIcon,
  CheckCircleIcon,
  HistoryIcon,
  Loader2Icon,
  PackageIcon,
  QrCodeIcon,
  RotateCcwIcon,
  TruckIcon,
  XIcon,
} from "@/components/dashboard/icons";
import { GoodTransferScanDialog } from "./good-transfer-scan-dialog";

const PRIMARY = "#1E6FD9";
const SUCCESS = "#0A7349";
const MUTED = "#6B7280";
const BORDER = "#E2E6EA";

export function GoodTransferDetailPanel({
  noTransfer,
  canUpdate,
  onChanged,
}: {
  noTransfer: string;
  canUpdate: boolean;
  /** Data list perlu dimuat ulang (scan/kirim/undo mengubah status). */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<GoodTransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [kirimOpen, setKirimOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const load = useCallback(async () => {
    const res = await getGoodTransferDetailAction(noTransfer);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
    return res.ok ? res.detail : null;
  }, [noTransfer]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getGoodTransferDetailAction(noTransfer);
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
  }, [noTransfer]);

  async function handleScanned() {
    await load();
    onChanged();
  }

  async function handleUndo(idScan: number) {
    const res = await undoGoodTransferScanAction(idScan);
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    await load();
    onChanged();
  }

  async function handleKirim() {
    setBusy(true);
    const res = await kirimGoodTransferAction(noTransfer);
    setBusy(false);
    setKirimOpen(false);
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    await load();
    onChanged();
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
        <XIcon className="h-10 w-10 text-red-300" />
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

  const header = detail.header;
  const locked = header.status !== "IN_TRANSIT";
  const allComplete =
    detail.lines.length > 0 && detail.lines.every((l) => l.isComplete);
  const totalRequired = detail.lines.reduce((a, l) => a + l.pcsRequired, 0);
  const totalScanned = detail.lines.reduce((a, l) => a + l.pcsScanned, 0);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-24">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-gray-900">
              Goods Transfer
            </h2>
            <p className="truncate text-xs font-semibold text-gray-500">
              {header.noTransfer}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Section: Permintaan */}
        <div
          className="overflow-hidden rounded-[10px] border bg-white"
          style={{ borderColor: BORDER }}
        >
          <div className="flex items-center gap-2 px-3.5 py-3">
            <span
              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-white"
              style={{ backgroundColor: allComplete ? SUCCESS : PRIMARY }}
            >
              {allComplete ? (
                <CheckCircleIcon className="h-3.5 w-3.5" />
              ) : (
                <QrCodeIcon className="h-3 w-3" />
              )}
            </span>
            <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1A1D23]">
              Permintaan
            </p>
            {detail.lines.length > 0 && (
              <p
                className="shrink-0 text-[11.5px] font-bold"
                style={{ color: allComplete ? SUCCESS : MUTED }}
              >
                {totalScanned} / {totalRequired} pcs
              </p>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {detail.lines.length === 0 ? (
              <p className="px-3.5 py-5 text-center text-[13px] text-gray-500">
                Belum ada baris permintaan dari Ascend
              </p>
            ) : (
              <div>
                {detail.lines.map((l, i) => (
                  <LineTile
                    key={`${l.kodeKategori}-${l.idJenis}`}
                    line={l}
                    number={i + 1}
                    canUndo={canUpdate && !locked}
                    onUndo={(id) => void handleUndo(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <StatusBanner
          fulfillStatus={header.fulfillStatus}
          allComplete={allComplete}
        />
      </div>

      {/* Aksi (pengganti FAB tablet) */}
      {!locked && canUpdate && (
        <div
          className="flex shrink-0 justify-end border-t bg-white px-4 py-3"
          style={{ borderColor: BORDER }}
        >
          {allComplete ? (
            <button
              type="button"
              onClick={() => setKirimOpen(true)}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow disabled:opacity-60"
              style={{ backgroundColor: SUCCESS }}
            >
              <TruckIcon className="h-4 w-4" /> Kirim
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow"
              style={{ backgroundColor: PRIMARY }}
            >
              <QrCodeIcon className="h-4 w-4" /> Scan
            </button>
          )}
        </div>
      )}

      {kirimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">Tandai Kirim?</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-700">
              Semua permintaan sudah terpenuhi. Setelah ditandai kirim, transfer
              terkunci — label tidak bisa discan atau dibatalkan lagi.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setKirimOpen(false)}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleKirim()}
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#F59E0B" }}
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Ya, Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {scanOpen && (
        <GoodTransferScanDialog
          noTransfer={noTransfer}
          onScanned={() => void handleScanned()}
          onClose={() => setScanOpen(false)}
        />
      )}

      {notice && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <p className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}

function LineTile({
  line,
  number,
  canUndo,
  onUndo,
}: {
  line: GoodTransferLine;
  number: number;
  canUndo: boolean;
  onUndo: (idScan: number) => void;
}) {
  const nama = line.namaJenis?.trim()
    ? line.namaJenis
    : `${kategoriLabel(line.kodeKategori)} #${line.idJenis}`;

  return (
    <div className="px-3.5 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="rounded-lg bg-[#F3F5F8] p-2">
        <div className="flex items-center gap-2">
          <span
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
            style={{
              backgroundColor: line.isComplete ? SUCCESS : `${PRIMARY}1F`,
              color: line.isComplete ? "#fff" : PRIMARY,
            }}
          >
            {line.isComplete ? (
              <CheckCircleIcon className="h-3.5 w-3.5" />
            ) : (
              number
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#1A1D23]">
            {nama}
          </p>
          <p
            className="shrink-0 text-[11.5px] font-bold"
            style={{ color: line.isComplete ? SUCCESS : MUTED }}
          >
            {line.pcsScanned}/{line.pcsRequired} pcs
          </p>
        </div>
        {line.scans.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {line.scans.map((s) => (
              <ScanChip
                key={s.id}
                scan={s}
                canUndo={canUndo}
                onUndo={onUndo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScanChip({
  scan,
  canUndo,
  onUndo,
}: {
  scan: GoodTransferScan;
  canUndo: boolean;
  onUndo: (idScan: number) => void;
}) {
  const undoable = canUndo && !scan.isReceived;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10.5px] font-semibold text-gray-700"
      style={{ borderColor: BORDER }}
    >
      <span
        style={{ color: scan.isReceived ? SUCCESS : PRIMARY }}
        className="inline-flex"
      >
        {scan.isReceived ? (
          <CheckCircleIcon className="h-3.5 w-3.5" />
        ) : (
          <TruckIcon className="h-3.5 w-3.5" />
        )}
      </span>
      <span
        className={scan.isReceived ? "text-gray-400 line-through" : undefined}
      >
        {scan.labelCode} ({scan.pcs})
      </span>
      {undoable && (
        <button
          type="button"
          onClick={() => onUndo(scan.id)}
          className="ml-0.5 text-red-400 hover:text-red-600"
          title="Batalkan scan"
          aria-label={`Batalkan scan ${scan.labelCode}`}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

function StatusBanner({
  fulfillStatus,
  allComplete,
}: {
  fulfillStatus: string;
  allComplete: boolean;
}) {
  const b = bannerInfo(fulfillStatus, allComplete);
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-3.5 py-3"
      style={{
        backgroundColor: `${b.color}14`,
        border: `1px solid ${b.color}4D`,
      }}
    >
      <span
        className="mt-0.5 inline-flex shrink-0"
        style={{ color: b.color }}
      >
        <b.icon className="h-[18px] w-[18px]" />
      </span>
      <p className="text-xs font-semibold leading-relaxed" style={{ color: b.color }}>
        {b.text}
      </p>
    </div>
  );
}

function bannerInfo(
  fulfillStatus: string,
  allComplete: boolean,
): { color: string; text: string; icon: typeof BoxIcon } {
  switch (fulfillStatus) {
    case "RECEIVED":
      return {
        color: SUCCESS,
        text: "Semua label sudah diterima di warehouse tujuan.",
        icon: PackageIcon,
      };
    case "SHIPPED":
      return {
        color: PRIMARY,
        text: "Transfer sudah ditandai kirim — menunggu penerimaan di tujuan. Scan terkunci.",
        icon: TruckIcon,
      };
    case "CANCELLED":
      return {
        color: MUTED,
        text: "Transfer dibatalkan.",
        icon: XIcon,
      };
    case "REJECTED":
      return {
        color: "#DC2626",
        text: "Transfer ditolak di tujuan.",
        icon: XIcon,
      };
    default:
      if (allComplete) {
        return {
          color: SUCCESS,
          text: "Semua permintaan sudah terpenuhi — tekan tombol Kirim di kanan bawah.",
          icon: CheckCircleIcon,
        };
      }
      return {
        color: MUTED,
        text: "Scan label lewat tombol Scan di kanan bawah. Nomor label & pcs yang tercatat muncul sebagai chip di tiap baris.",
        icon: HistoryIcon,
      };
  }
}
