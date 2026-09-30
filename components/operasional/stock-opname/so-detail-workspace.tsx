"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignSoAccessAction,
  completeSoAction,
  getSoBlokAction,
  getSoCompleteSummaryAction,
  getSoLaporanPdfAction,
  getSoLokasiAction,
  getSoScanSummaryAction,
  revokeSoAccessAction,
} from "@/app/(app)/operasional/stock-opname/actions";
import type {
  SoAccessUser,
  SoBlok,
  SoBlokPage,
  SoCompleteSummary,
  SoLokasi,
  SoLokasiPage,
  SoScanSummary,
} from "@/services/stock-opname-v2-service";
import { UNKNOWN_BLOK } from "@/services/stock-opname-v2-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { SoLabelPanel } from "./so-label-panel";
import { SoConfirmDialog } from "./so-confirm-dialog";
import { SoCompleteSummaryDialog } from "./so-complete-summary-dialog";
import { SoScanSummaryDialog } from "./so-scan-summary-dialog";
import { SoWorkerPickerDialog } from "./so-worker-picker-dialog";
import { printPdfBase64 } from "./print-pdf";
import { soFormatDateTime, soFormatQty, soWeightUnit } from "./so-format";
import {
  SoAlertIcon,
  SoBoltIcon,
  SoCheckCircleIcon,
  SoInboxIcon,
  SoLeaderboardIcon,
  SoLocationOffIcon,
  SoPauseCircleIcon,
  SoPdfIcon,
  SoPlayCircleIcon,
  SoRefreshIcon,
} from "./so-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const GREEN = "#0A7349";
const WARNING = "#B45309";
const WARNING_BG = "#FFF7ED";
const INK = "#1A1D23";

export function SoDetailWorkspace({
  stockOpnameNo,
  canManage,
}: {
  stockOpnameNo: string;
  canManage: boolean;
}) {
  const [blokPage, setBlokPage] = useState<SoBlokPage | null>(null);
  const [blokLoading, setBlokLoading] = useState(true);
  const [blokError, setBlokError] = useState<string | null>(null);
  const [blokReloadKey, setBlokReloadKey] = useState(0);

  const [selectedBlok, setSelectedBlok] = useState<string | null>(null);
  const [lokasiPage, setLokasiPage] = useState<SoLokasiPage | null>(null);
  const [lokasiLoading, setLokasiLoading] = useState(false);
  const [lokasiError, setLokasiError] = useState<string | null>(null);
  const [lokasiReloadKey, setLokasiReloadKey] = useState(0);

  const [selectedLokasi, setSelectedLokasi] = useState<SoLokasi | null>(null);

  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);
  const flashTimer = useRef<number | null>(null);

  const [completeSummary, setCompleteSummary] =
    useState<SoCompleteSummary | null>(null);
  const [completeFallbackOpen, setCompleteFallbackOpen] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [scanSummary, setScanSummary] = useState<SoScanSummary | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [laporanBusy, setLaporanBusy] = useState(false);

  const [workerPickerOpen, setWorkerPickerOpen] = useState(false);
  const [busyLocationIds, setBusyLocationIds] = useState<number[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<SoLokasi | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const categoryCode = blokPage?.categoryCode ?? "";
  const isComplete = blokPage?.isComplete ?? false;
  const unit = soWeightUnit(categoryCode);
  const totalLabelCount = (blokPage?.data ?? []).reduce(
    (sum, b) => sum + b.labelCount,
    0,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBlokLoading(true);
      const res = await getSoBlokAction(stockOpnameNo);
      if (cancelled) return;
      setBlokLoading(false);
      if (res.ok) {
        setBlokPage(res.page);
        setBlokError(null);
      } else {
        setBlokPage(null);
        setBlokError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stockOpnameNo, blokReloadKey]);

  useEffect(() => {
    if (!selectedBlok) return;
    let cancelled = false;
    void (async () => {
      setLokasiLoading(true);
      const res = await getSoLokasiAction(stockOpnameNo, selectedBlok);
      if (cancelled) return;
      setLokasiLoading(false);
      if (res.ok) {
        setLokasiPage(res.page);
        setLokasiError(null);
      } else {
        setLokasiPage(null);
        setLokasiError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stockOpnameNo, selectedBlok, lokasiReloadKey]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const showFlash = useCallback((text: string, ok: boolean) => {
    setFlash({ text, ok });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  const refreshBlok = useCallback(() => setBlokReloadKey((k) => k + 1), []);
  const refreshLokasi = useCallback(
    () => setLokasiReloadKey((k) => k + 1),
    [],
  );

  const selectBlok = useCallback((blok: string) => {
    if (blok === selectedBlok) return;
    setSelectedBlok(blok);
    setSelectedLokasi(null);
    setLokasiPage(null);
    setLokasiError(null);
  }, [selectedBlok]);

  const openComplete = useCallback(async () => {
    setCompleteError(null);
    const res = await getSoCompleteSummaryAction(stockOpnameNo);
    if (res.ok) {
      setCompleteSummary(res.summary);
    } else {
      setCompleteSummary(null);
      setCompleteFallbackOpen(true);
    }
  }, [stockOpnameNo]);

  const confirmComplete = useCallback(async () => {
    if (completeBusy) return;
    setCompleteBusy(true);
    setCompleteError(null);
    const res = await completeSoAction(stockOpnameNo);
    setCompleteBusy(false);
    if (!res.ok) {
      setCompleteError(res.error);
      return;
    }
    setCompleteSummary(null);
    setCompleteFallbackOpen(false);
    showFlash(`${stockOpnameNo} berhasil ditandai selesai`, true);
    refreshBlok();
    refreshLokasi();
  }, [completeBusy, stockOpnameNo, showFlash, refreshBlok, refreshLokasi]);

  const openScanSummary = useCallback(async () => {
    if (scanLoading) return;
    setScanLoading(true);
    const res = await getSoScanSummaryAction(stockOpnameNo);
    setScanLoading(false);
    if (!res.ok) {
      showFlash(`Gagal memuat ringkasan scan: ${res.error}`, false);
      return;
    }
    setScanSummary(res.summary);
  }, [scanLoading, stockOpnameNo, showFlash]);

  const printLaporan = useCallback(async () => {
    if (laporanBusy) return;
    setLaporanBusy(true);
    const res = await getSoLaporanPdfAction(stockOpnameNo);
    setLaporanBusy(false);
    if (!res.ok) {
      showFlash(`Gagal memuat laporan: ${res.error}`, false);
      return;
    }
    printPdfBase64(res.base64);
  }, [laporanBusy, stockOpnameNo, showFlash]);

  const assignWorker = useCallback(
    async (user: SoAccessUser) => {
      if (!selectedBlok || !selectedLokasi) return;
      const locationId = selectedLokasi.locationId;
      setWorkerPickerOpen(false);
      setBusyLocationIds((prev) => [...prev, locationId]);
      const res = await assignSoAccessAction({
        stockOpnameNo,
        blok: selectedBlok,
        idLokasi: locationId,
        idUsername: user.idUsername,
      });
      setBusyLocationIds((prev) => prev.filter((id) => id !== locationId));
      if (!res.ok) {
        showFlash(`Gagal menugaskan user: ${res.error}`, false);
        return;
      }
      showFlash(`${user.username} ditugaskan ke ${selectedBlok}${locationId}`, true);
      refreshLokasi();
      refreshBlok();
    },
    [selectedBlok, selectedLokasi, stockOpnameNo, showFlash, refreshLokasi, refreshBlok],
  );

  const confirmRevoke = useCallback(async () => {
    const lokasi = revokeTarget;
    if (!lokasi || !selectedBlok || revokeBusy) return;
    setRevokeBusy(true);
    setRevokeError(null);
    let failed: string | null = null;
    for (const user of lokasi.allowedUsers) {
      const res = await revokeSoAccessAction({
        stockOpnameNo,
        blok: selectedBlok,
        idLokasi: lokasi.locationId,
        idUsername: user.idUsername,
      });
      if (!res.ok) {
        failed = res.error;
        break;
      }
    }
    setRevokeBusy(false);
    if (failed) {
      setRevokeError(failed);
      return;
    }
    setRevokeTarget(null);
    if (selectedLokasi?.locationId === lokasi.locationId) {
      setSelectedLokasi(null);
    }
    showFlash(
      `User dilepas dari ${selectedBlok}${lokasi.locationId}`,
      true,
    );
    refreshLokasi();
    refreshBlok();
  }, [
    revokeTarget,
    selectedBlok,
    revokeBusy,
    stockOpnameNo,
    selectedLokasi,
    showFlash,
    refreshLokasi,
    refreshBlok,
  ]);

  const assignForLokasi = useCallback((lokasi: SoLokasi) => {
    setSelectedLokasi(lokasi);
    setWorkerPickerOpen(true);
  }, []);

  const sortedBlok = [...(blokPage?.data ?? [])].sort((a, b) => {
    const aUnknown = a.blok === UNKNOWN_BLOK;
    const bUnknown = b.blok === UNKNOWN_BLOK;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    return a.blok.localeCompare(b.blok);
  });

  const sortedLokasi = [...(lokasiPage?.data ?? [])].sort((a, b) => {
    const aUnknown = a.locationId === 0;
    const bUnknown = b.locationId === 0;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      {flash && (
        <div
          className="shrink-0 border-b px-4 py-2 text-[13px] font-semibold"
          style={
            flash.ok
              ? {
                  backgroundColor: "#ECFDF5",
                  borderColor: "#A7F3D0",
                  color: "#047857",
                }
              : {
                  backgroundColor: "#FEF2F2",
                  borderColor: "#FECACA",
                  color: "#B91C1C",
                }
          }
        >
          {flash.text}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <aside
          className="flex w-[200px] shrink-0 flex-col border-r bg-white"
          style={{ borderColor: BORDER }}
        >
          <div
            className="shrink-0 px-3.5 pb-2.5 pt-2.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center gap-1.5">
              <p
                className="min-w-0 flex-1 truncate text-center text-[11px] font-bold text-gray-600"
                title={stockOpnameNo}
              >
                {stockOpnameNo}
              </p>
              <button
                type="button"
                onClick={() => {
                  refreshBlok();
                  if (selectedBlok) refreshLokasi();
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Muat ulang"
              >
                <SoRefreshIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {isComplete && (
              <>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <SoCheckCircleIcon
                    style={{ width: 14, height: 14, color: GREEN }}
                  />
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: GREEN }}
                    title={
                      soFormatDateTime(blokPage?.completedAt) ?? "Sudah ditandai selesai"
                    }
                  >
                    Selesai
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void openScanSummary()}
                  disabled={scanLoading}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 disabled:opacity-70"
                  style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
                >
                  {scanLoading ? (
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SoLeaderboardIcon style={{ width: 15, height: 15 }} />
                  )}
                  <span className="truncate text-[11px] font-bold">
                    Ringkasan Scan
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void printLaporan()}
                  disabled={laporanBusy}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1.5 disabled:opacity-70"
                  style={{ color: "#374151" }}
                >
                  {laporanBusy ? (
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SoPdfIcon style={{ width: 15, height: 15 }} />
                  )}
                  <span className="truncate text-[11px] font-bold">
                    Cetak Laporan
                  </span>
                </button>
              </>
            )}

            {!isComplete && (
              <button
                type="button"
                onClick={() => void openComplete()}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5"
                style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
              >
                <SoCheckCircleIcon style={{ width: 15, height: 15 }} />
                <span className="truncate text-[11px] font-bold">
                  Tandai Selesai
                </span>
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {blokLoading && !blokPage && (
              <div className="flex h-full items-center justify-center">
                <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {!blokLoading && blokError && (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                <SoAlertIcon
                  className="text-red-300"
                  style={{ width: 32, height: 32 }}
                />
                <p className="text-[11px] font-semibold text-red-700">
                  {blokError}
                </p>
                <button
                  type="button"
                  onClick={refreshBlok}
                  className="text-[11px] font-bold text-[#1E6FD9] underline"
                >
                  Coba Lagi
                </button>
              </div>
            )}
            {!blokLoading && !blokError && sortedBlok.length === 0 && (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                Belum ada blok
              </div>
            )}
            {sortedBlok.map((blok) => (
              <BlokRow
                key={blok.blok}
                blok={blok}
                selected={selectedBlok === blok.blok}
                onSelect={() => selectBlok(blok.blok)}
              />
            ))}
          </div>
        </aside>

        <aside
          className="flex w-[320px] shrink-0 flex-col border-r bg-white"
          style={{ borderColor: BORDER }}
        >
          {!selectedBlok ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-gray-400">
              Pilih blok di sebelah kiri
            </div>
          ) : (
            <>
              <div
                className="shrink-0 px-3.5 pb-3 pt-3.5"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <p
                  className="truncate text-sm font-bold"
                  style={{
                    color: selectedBlok === UNKNOWN_BLOK ? WARNING : INK,
                  }}
                >
                  {selectedBlok === UNKNOWN_BLOK
                    ? "Tanpa Blok"
                    : `Blok ${selectedBlok}`}
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <HeaderStat
                    label="LOKASI"
                    value={String(sortedLokasi.length)}
                  />
                  <span className="h-6 w-px" style={{ backgroundColor: BORDER }} />
                  <HeaderStat
                    label="LABEL"
                    value={String(
                      (lokasiPage?.data ?? []).reduce(
                        (sum, l) => sum + l.labelCount,
                        0,
                      ),
                    )}
                  />
                  <span className="h-6 w-px" style={{ backgroundColor: BORDER }} />
                  <HeaderStat
                    label={unit === "pcs" ? "PCS" : "BERAT"}
                    value={soFormatQty(
                      (lokasiPage?.data ?? []).reduce(
                        (sum, l) => sum + l.totalWeight,
                        0,
                      ),
                    )}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {lokasiLoading && !lokasiPage && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}
                {!lokasiLoading && lokasiError && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <SoAlertIcon
                      className="text-red-300"
                      style={{ width: 32, height: 32 }}
                    />
                    <p className="text-xs font-semibold text-red-700">
                      {lokasiError}
                    </p>
                    <button
                      type="button"
                      onClick={refreshLokasi}
                      className="text-xs font-bold text-[#1E6FD9] underline"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}
                {!lokasiLoading && !lokasiError && sortedLokasi.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                    <SoInboxIcon style={{ width: 40, height: 40 }} />
                    <p className="text-xs text-gray-500">Belum ada lokasi</p>
                  </div>
                )}
                {sortedLokasi.map((lokasi) => (
                  <LokasiRow
                    key={lokasi.locationId}
                    blok={selectedBlok}
                    lokasi={lokasi}
                    selected={selectedLokasi?.locationId === lokasi.locationId}
                    canManage={canManage}
                    isComplete={isComplete}
                    busy={busyLocationIds.includes(lokasi.locationId)}
                    onSelect={() => setSelectedLokasi(lokasi)}
                    onAssign={() => assignForLokasi(lokasi)}
                    onRevoke={() => {
                      setRevokeError(null);
                      setRevokeTarget(lokasi);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </aside>

        {selectedLokasi && selectedBlok ? (
          <SoLabelPanel
            key={`${selectedBlok}-${selectedLokasi.locationId}`}
            stockOpnameNo={stockOpnameNo}
            blok={selectedBlok}
            locationId={selectedLokasi.locationId}
            isUnknown={selectedLokasi.locationId === 0}
            categoryCode={categoryCode}
            canManage={canManage && !isComplete}
            onChanged={() => {
              refreshBlok();
              refreshLokasi();
            }}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center bg-white text-[13px] text-gray-400">
            Pilih lokasi di sebelah kiri
          </div>
        )}
      </div>

      {completeSummary && (
        <SoCompleteSummaryDialog
          summary={completeSummary}
          weightUnit={unit}
          busy={completeBusy}
          error={completeError}
          onConfirm={() => void confirmComplete()}
          onClose={() => setCompleteSummary(null)}
        />
      )}

      {completeFallbackOpen && !completeSummary && (
        <SoConfirmDialog
          title="Tandai Selesai"
          message="Yakin ingin menandai stock opname ini selesai? Setelah selesai, scan label tidak dapat dilakukan lagi."
          confirmLabel="Selesai"
          tone="green"
          busy={completeBusy}
          error={completeError}
          onConfirm={() => void confirmComplete()}
          onCancel={() => setCompleteFallbackOpen(false)}
        />
      )}

      {scanSummary && (
        <SoScanSummaryDialog
          summary={scanSummary}
          totalLabelCount={totalLabelCount}
          onClose={() => setScanSummary(null)}
        />
      )}

      {workerPickerOpen && selectedBlok && selectedLokasi && (
        <SoWorkerPickerDialog
          onPick={(user) => void assignWorker(user)}
          onClose={() => setWorkerPickerOpen(false)}
        />
      )}

      {revokeTarget && (
        <SoConfirmDialog
          title="Lepas User"
          message={`Yakin ingin melepas ${revokeTarget.allowedUsers
            .map((u) => u.fullName || u.username)
            .join(", ") || "user"} dari lokasi ini?`}
          confirmLabel="Lepas"
          tone="warning"
          icon={<SoPauseCircleIcon style={{ width: 18, height: 18 }} />}
          busy={revokeBusy}
          error={revokeError}
          onConfirm={() => void confirmRevoke()}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}

function BlokRow({
  blok,
  selected,
  onSelect,
}: {
  blok: SoBlok;
  selected: boolean;
  onSelect: () => void;
}) {
  const isUnknown = blok.blok === UNKNOWN_BLOK;
  const baseColor = isUnknown ? WARNING : PRIMARY;
  const complete = blok.labelCount > 0 && blok.scannedCount >= blok.labelCount;
  const progressColor = complete ? GREEN : baseColor;
  const backgroundColor = selected
    ? `${baseColor}0D`
    : complete
      ? "#E9F6EF"
      : isUnknown
        ? WARNING_BG
        : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-1.5 border-l-[3px] px-2.5 py-3 text-left transition"
      style={{
        borderColor: selected ? baseColor : "transparent",
        backgroundColor,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {isUnknown && (
        <SoLocationOffIcon
          className="shrink-0"
          style={{
            width: 14,
            height: 14,
            color: selected ? baseColor : WARNING,
          }}
        />
      )}
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
        <span style={{ color: selected ? baseColor : isUnknown ? WARNING : INK }}>
          {isUnknown
            ? `Tanpa Blok (${blok.locationCount}) `
            : `Blok ${blok.blok} (${blok.locationCount}) `}
        </span>
        <span style={{ color: progressColor }}>
          {blok.scannedCount}/{blok.labelCount}
        </span>
      </span>
      {blok.workingLocationCount > 0 && (
        <span
          className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
          title={`${blok.workingLocationCount} lokasi sedang dikerjakan`}
        >
          <SoBoltIcon style={{ width: 11, height: 11 }} />
          <span className="text-[10px] font-bold">
            {blok.workingLocationCount}
          </span>
        </span>
      )}
    </button>
  );
}

function LokasiRow({
  blok,
  lokasi,
  selected,
  canManage,
  isComplete,
  busy,
  onSelect,
  onAssign,
  onRevoke,
}: {
  blok: string;
  lokasi: SoLokasi;
  selected: boolean;
  canManage: boolean;
  isComplete: boolean;
  busy: boolean;
  onSelect: () => void;
  onAssign: () => void;
  onRevoke: () => void;
}) {
  const isUnknown = lokasi.locationId === 0;
  const baseColor = isUnknown ? WARNING : PRIMARY;
  const complete = lokasi.labelCount > 0 && lokasi.scannedCount >= lokasi.labelCount;
  const progressColor = complete ? GREEN : baseColor;
  const showAssignControl = canManage && !isUnknown;
  const hasUsers = lokasi.allowedUsers.length > 0;

  const backgroundColor = selected
    ? `${baseColor}0D`
    : complete
      ? `${GREEN}0F`
      : isUnknown
        ? WARNING_BG
        : undefined;

  const borderColor = selected
    ? baseColor
    : complete
      ? GREEN
      : "transparent";

  return (
    <div
      className="flex items-stretch border-l-[3px]"
      style={{
        borderColor,
        backgroundColor,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-2 pr-2 text-left"
      >
        {isUnknown ? (
          <SoLocationOffIcon
            className="shrink-0"
            style={{ width: 14, height: 14, color: baseColor }}
          />
        ) : complete ? (
          <span
            className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: GREEN }}
          >
            <span className="text-[10px] font-bold leading-none text-white">
              ✓
            </span>
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
          {isUnknown ? (
            <span style={{ color: selected ? baseColor : WARNING }}>
              Lokasi Tidak Diketahui
            </span>
          ) : (
            <>
              <span
                style={{
                  color: selected
                    ? baseColor
                    : complete
                      ? GREEN
                      : INK,
                }}
              >
                {`${blok}${lokasi.locationId} `}
              </span>
              <span style={{ color: progressColor }}>
                ({lokasi.scannedCount}/{lokasi.labelCount})
              </span>
              {!complete && (
                <span
                  className="text-[10.5px]"
                  style={{
                    color: lokasi.allowedUsers.length > 0 ? INK : "#9CA3AF",
                    fontWeight: lokasi.allowedUsers.length > 0 ? 700 : 500,
                  }}
                >
                  {lokasi.allowedUsers.length > 0
                    ? `  ·  ${lokasi.allowedUsers
                        .map((u) => u.fullName || u.username)
                        .join(", ")}`
                    : "  ·  Belum ditugaskan"}
                </span>
              )}
            </>
          )}
        </span>
        {complete && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.2px] text-white"
            style={{ backgroundColor: GREEN }}
          >
            Selesai
          </span>
        )}
      </button>

      {showAssignControl && (
        <div
          className="flex w-9 shrink-0 items-center justify-center border-l"
          style={{ borderColor: BORDER }}
        >
          {busy ? (
            <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <button
              type="button"
              onClick={hasUsers ? onRevoke : onAssign}
              disabled={isComplete}
              className="rounded-full p-0.5 disabled:cursor-not-allowed"
              title={
                isComplete
                  ? "Stock opname sudah selesai"
                  : hasUsers
                    ? "Lepas User"
                    : "Tugaskan User"
              }
              aria-label={
                isComplete
                  ? "Stock opname sudah selesai"
                  : hasUsers
                    ? "Lepas User"
                    : "Tugaskan User"
              }
            >
              {hasUsers ? (
                <SoPauseCircleIcon
                  style={{
                    width: 20,
                    height: 20,
                    color: isComplete ? "#D1D5DB" : WARNING,
                  }}
                />
              ) : (
                <SoPlayCircleIcon
                  style={{
                    width: 20,
                    height: 20,
                    color: isComplete ? "#D1D5DB" : GREEN,
                  }}
                />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-bold uppercase tracking-[0.4px] text-gray-500">
        {label}
      </p>
      <p className="truncate text-[13px] font-bold text-[#1A1D23]">{value}</p>
    </div>
  );
}
