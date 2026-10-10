"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeReturAction,
  decideReturAction,
  generateReturLabelAction,
  getReturDetailAction,
  undoReturScanAction,
} from "@/app/(app)/warehouse/retur-v3/actions";
import type {
  ReturDetail,
  ReturItem,
  ReturTurnover,
} from "@/services/retur-v3-service";
import {
  CheckCircleIcon,
  Loader2Icon,
  LockIcon,
  QrCodeIcon,
  RotateCcwIcon,
  TruckIcon,
  X,
  XIcon,
} from "@/components/dashboard/icons";
import {
  AutoRenewIcon,
  BlockIcon,
  CheckIcon,
  ChevronUpIcon,
  HourglassIcon,
  PrintIcon,
} from "./retur-v3-icons";
import { KategoriChip } from "./retur-v3-create-dialog";
import { ReturV3ScanDialog } from "./retur-v3-scan-dialog";
import { ReturV3PrintDialog } from "./retur-v3-print-dialog";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const SUCCESS = "#0A7349";
const MUTED = "#6B7280";
const WARNING = "#F59E0B";

export function ReturV3DetailPanel({
  noRetur,
  canUpdate,
  canDecide,
  onChanged,
}: {
  noRetur: string;
  canUpdate: boolean;
  canDecide: boolean;
  /** Header list perlu dimuat ulang (keputusan/scan/kirim mengubah status). */
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ReturDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [decideFor, setDecideFor] = useState<"DIGANTI" | "TIDAK_DIGANTI" | null>(
    null,
  );
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<ReturItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState<Set<number>>(new Set());
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getReturDetailAction(noRetur);
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
  }, [noRetur, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function handleDecide(decision: "DIGANTI" | "TIDAK_DIGANTI") {
    setBusy(true);
    const res = await decideReturAction(noRetur, decision);
    setBusy(false);
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    setDecideFor(null);
    reload();
    onChanged();
  }

  async function doGenerate(
    item: ReturItem,
    body: { berat?: number; idReject?: number },
  ) {
    setGenerating((prev) => new Set(prev).add(item.idItem));
    const res = await generateReturLabelAction(noRetur, item.idItem, body);
    setGenerating((prev) => {
      const next = new Set(prev);
      next.delete(item.idItem);
      return next;
    });
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    setRejectItem(null);
    reload();
  }

  async function handleUndo(idTurnover: number) {
    const res = await undoReturScanAction(noRetur, idTurnover);
    if (!res.ok) {
      showNotice(res.error);
      return;
    }
    reload();
    onChanged();
  }

  async function handleComplete() {
    setBusy(true);
    const res = await completeReturAction(noRetur);
    setBusy(false);
    if (!res.ok) {
      setCompleteOpen(false);
      showNotice(res.error);
      return;
    }
    setCompleteOpen(false);
    reload();
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
          onClick={reload}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (!detail) return null;

  const { header, items, turnover, outputs } = detail;
  const turnoverById = new Map<number, ReturTurnover>(
    turnover.map((t) => [t.idItem, t]),
  );
  const step1Complete =
    items.length > 0 &&
    items.every((i) => i.hasGeneratedLabel) &&
    outputs.length > 0 &&
    outputs.every((o) => o.hasBeenPrinted);
  const allItemsFulfilled =
    items.length > 0 &&
    items.every((i) => turnoverById.get(i.idItem)?.isFulfilled === true);
  const canComplete =
    header.isDiganti && !header.isComplete && allItemsFulfilled;

  const showCompleteFab =
    header.isDiganti && step1Complete && !header.isComplete && canComplete && canUpdate;
  const showScanFab =
    header.isDiganti && step1Complete && !header.isComplete && !canComplete && canUpdate;
  const showPrintFab =
    outputs.length > 0 && !header.isPending && !showScanFab && !showCompleteFab;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-24">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-extrabold text-gray-900">
                {header.noRetur}
              </h2>
              <StatusChip status={header.statusRetur} />
            </div>
            <p className="truncate text-xs text-gray-500">
              {[header.namaPembeli, fmtDate(header.tanggal)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>

        {header.isPending && (
          <PendingSection
            items={items}
            canDecide={canDecide}
            busy={busy}
            onDecide={(d) => setDecideFor(d)}
          />
        )}

        {!header.isPending && (
          <GenerateSection
            key={`gen-${step1Complete}`}
            items={items}
            outputs={outputs}
            stepNumber={header.isDiganti ? 1 : null}
            defaultOpen={!step1Complete}
            canUpdate={canUpdate}
            generating={generating}
            onGenerate={(item) => {
              if (item.kategoriInput === "REJECT") {
                setRejectItem(item);
                return;
              }
              void doGenerate(item, {});
            }}
            onPrint={() => setPrintOpen(true)}
          />
        )}

        {header.isDiganti && (
          <>
            {step1Complete ? (
              <TurnoverSection
                items={items}
                turnoverById={turnoverById}
                stepNumber={2}
                allFulfilled={allItemsFulfilled}
                canUndo={canUpdate && !header.isComplete}
                onUndo={(id) => void handleUndo(id)}
              />
            ) : (
              <LockedStepPlaceholder
                stepNumber={2}
                title="Item yang Dipickup"
                message="Selesaikan generate & cetak label di langkah 1 dulu untuk lanjut ke langkah ini."
              />
            )}

            {!step1Complete ? (
              <LockedStepPlaceholder
                stepNumber={3}
                title="Pengiriman"
                message="Selesaikan generate & cetak label di langkah 1, lalu penggantian item di langkah 2."
              />
            ) : allItemsFulfilled ? (
              <KirimSection stepNumber={3} headerComplete={header.isComplete} canComplete={canComplete} />
            ) : (
              <LockedStepPlaceholder
                stepNumber={3}
                title="Pengiriman"
                message="Selesaikan penggantian item di langkah 2 dulu untuk lanjut ke langkah ini."
              />
            )}
          </>
        )}
      </div>

      {(showPrintFab || showCompleteFab || showScanFab) && (
        <div
          className="absolute bottom-5 right-5 flex flex-col items-end gap-3"
          aria-hidden={false}
        >
          {showPrintFab && (
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: PRIMARY }}
              title="Cetak label"
              aria-label="Cetak label"
            >
              <PrintIcon className="h-6 w-6" />
            </button>
          )}
          {showCompleteFab && (
            <button
              type="button"
              onClick={() => setCompleteOpen(true)}
              disabled={busy}
              className="inline-flex h-14 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: SUCCESS }}
            >
              {busy ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <TruckIcon className="h-5 w-5" />
              )}
              Kirim
            </button>
          )}
          {showScanFab && (
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex h-14 items-center gap-2 rounded-full px-6 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: PRIMARY }}
            >
              <QrCodeIcon className="h-5 w-5" />
              Scan
            </button>
          )}
        </div>
      )}

      {decideFor && (
        <ConfirmDialog
          title="Konfirmasi Keputusan"
          message={`Tetapkan keputusan retur ini sebagai "${decideFor === "DIGANTI" ? "DIGANTI" : "TIDAK DIGANTI"}"? Keputusan ini tidak bisa diubah kembali ke Pending.`}
          confirmLabel="Ya, Tetapkan"
          busy={busy}
          onCancel={() => setDecideFor(null)}
          onConfirm={() => void handleDecide(decideFor)}
        />
      )}

      {completeOpen && (
        <ConfirmDialog
          title="Kirim Retur Ini?"
          message="Aksi ini akan otomatis men-generate data surat jalan ke ERP Ascend. Aksi ini tidak dapat dibatalkan."
          confirmLabel="Ya, Kirim"
          confirmColor={WARNING}
          busy={busy}
          onCancel={() => setCompleteOpen(false)}
          onConfirm={() => void handleComplete()}
        />
      )}

      {rejectItem && (
        <RejectGenerateDialog
          item={rejectItem}
          busy={generating.has(rejectItem.idItem)}
          onCancel={() => setRejectItem(null)}
          onGenerate={(body) => void doGenerate(rejectItem, body)}
        />
      )}

      {scanOpen && (
        <ReturV3ScanDialog
          noRetur={noRetur}
          onScanned={() => {
            reload();
            onChanged();
          }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {printOpen && (
        <ReturV3PrintDialog
          outputs={outputs}
          onPrinted={reload}
          onClose={() => setPrintOpen(false)}
        />
      )}

      {notice && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <p className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {notice}
          </p>
        </div>
      )}
    </div>
  );
}

function PendingSection({
  items,
  canDecide,
  busy,
  onDecide,
}: {
  items: ReturItem[];
  canDecide: boolean;
  busy: boolean;
  onDecide: (d: "DIGANTI" | "TIDAK_DIGANTI") => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: BORDER }}>
      <div className="px-3.5 py-3">
        <p className="text-[13.5px] font-bold text-[#1A1D23]">Item Retur</p>
      </div>
      <div className="border-t" style={{ borderColor: BORDER }}>
        {items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[13px] text-gray-500">
            Belum ada item
          </p>
        ) : (
          items.map((it, i) => (
            <div
              key={it.idItem}
              className="flex items-center gap-2 border-b px-3.5 py-2 last:border-b-0"
              style={{ borderColor: BORDER }}
            >
              <span className="w-5 shrink-0 text-[13px] font-bold text-[#6B7280]">
                {i + 1}.
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1A1D23]">
                {namaOf(it)}
              </p>
              <p className="shrink-0 text-xs font-semibold text-[#1A1D23]">
                {it.pcs} pcs
              </p>
              <KategoriChip kategoriInput={it.kategoriInput} />
            </div>
          ))
        )}
      </div>

      {canDecide && (
        <div className="flex items-center gap-2.5 border-t p-3.5" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={() => onDecide("TIDAK_DIGANTI")}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
            style={{ color: "#E65100", border: "1px solid #FFB74D" }}
          >
            <BlockIcon className="h-4 w-4" />
            Tidak Diganti
          </button>
          <button
            type="button"
            onClick={() => onDecide("DIGANTI")}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            <AutoRenewIcon className="h-4 w-4" />
            Diganti
          </button>
        </div>
      )}

      {!canDecide && (
        <div className="p-3.5">
          <div
            className="flex items-start gap-2.5 rounded-lg px-3.5 py-3"
            style={{ backgroundColor: "#FFF3E0", border: "1px solid #FFE0B2" }}
          >
            <HourglassIcon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: "#F57C00" }} />
            <p className="text-[12.5px] font-semibold leading-relaxed text-[#EF6C00]">
              Menunggu persetujuan — keputusan Diganti / Tidak Diganti.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerateSection({
  items,
  outputs,
  stepNumber,
  defaultOpen,
  canUpdate,
  generating,
  onGenerate,
  onPrint,
}: {
  items: ReturItem[];
  outputs: ReturDetail["outputs"];
  stepNumber: number | null;
  defaultOpen: boolean;
  canUpdate: boolean;
  generating: Set<number>;
  onGenerate: (item: ReturItem) => void;
  onPrint: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const outputByCode = new Map(outputs.map((o) => [o.labelCode, o]));

  return (
    <div className="overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: BORDER }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        {stepNumber !== null && <StepBadge number={stepNumber} complete={false} />}
        <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1A1D23]">
          Generate Label
        </p>
        {outputs.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onPrint();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onPrint();
              }
            }}
            className="rounded p-1 text-[#1E6FD9] hover:bg-blue-50"
            title="Cetak label"
          >
            <PrintIcon className="h-[19px] w-[19px]" />
          </span>
        )}
        <ChevronUpIcon
          className={`h-5 w-5 text-gray-400 transition ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: BORDER }}>
          {items.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[13px] text-gray-500">
              Belum ada item
            </p>
          ) : (
            items.map((it, i) => {
              const output = it.generatedLabelCode
                ? outputByCode.get(it.generatedLabelCode)
                : undefined;
              const busy = generating.has(it.idItem);
              return (
                <div
                  key={it.idItem}
                  className="flex items-center gap-2 border-b px-3.5 py-2.5 last:border-b-0"
                  style={{ borderColor: BORDER }}
                >
                  <span className="w-5 shrink-0 text-[13px] font-bold text-[#6B7280]">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#1A1D23]">
                      {namaOf(it)}
                    </p>
                    <p className="text-[11.5px] text-[#6B7280]">{it.pcs} pcs</p>
                  </div>
                  <KategoriChip kategoriInput={it.kategoriInput} />
                  <div className="flex shrink-0 items-center gap-1.5 pl-2">
                    {it.generatedLabelCode ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-bold"
                        style={{ backgroundColor: `${SUCCESS}1A`, color: SUCCESS }}
                      >
                        {it.generatedLabelCode}
                        <PrintCountBadge count={output?.printCount ?? 0} />
                      </span>
                    ) : canUpdate ? (
                      <button
                        type="button"
                        onClick={() => onGenerate(it)}
                        disabled={busy}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11.5px] font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {busy ? (
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Generate Label
                      </button>
                    ) : (
                      <span className="text-[11px] italic text-gray-400">
                        Menunggu
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TurnoverSection({
  items,
  turnoverById,
  stepNumber,
  allFulfilled,
  canUndo,
  onUndo,
}: {
  items: ReturItem[];
  turnoverById: Map<number, ReturTurnover>;
  stepNumber: number;
  allFulfilled: boolean;
  canUndo: boolean;
  onUndo: (idTurnover: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2 px-3.5 py-3">
        <StepBadge number={stepNumber} complete={allFulfilled} />
        <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1A1D23]">
          Item yang Dipickup
        </p>
      </div>
      <div className="border-t" style={{ borderColor: BORDER }}>
        {items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[13px] text-gray-500">
            Belum ada item
          </p>
        ) : (
          items.map((it, i) => {
            const row = turnoverById.get(it.idItem);
            const target = row?.pcsAsal ?? it.pcs;
            const scanned = row?.scannedPcs ?? 0;
            const fulfilled = row?.isFulfilled === true;
            return (
              <div
                key={it.idItem}
                className="border-b px-3.5 py-2.5 last:border-b-0"
                style={{ borderColor: BORDER }}
              >
                <div className="rounded-lg p-2" style={{ backgroundColor: "#F3F5F8" }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold"
                      style={{
                        backgroundColor: fulfilled
                          ? SUCCESS
                          : "rgba(30,111,217,0.12)",
                        color: fulfilled ? "#fff" : PRIMARY,
                      }}
                    >
                      {fulfilled ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#1A1D23]">
                      {row?.namaJenisAsal ?? namaOf(it)}
                    </p>
                    <p
                      className="shrink-0 text-[11.5px] font-bold"
                      style={{ color: fulfilled ? SUCCESS : MUTED }}
                    >
                      {scanned}/{target} pcs
                    </p>
                  </div>
                  {row && row.scans.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.scans.map((s) => (
                        <span
                          key={s.idTurnover}
                          className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10.5px] font-semibold text-gray-700"
                          style={{ borderColor: BORDER }}
                        >
                          <span className={s.noPartial ? "text-gray-400" : undefined}>
                            {s.labelCode} ({s.pcs})
                          </span>
                          {canUndo && (
                            <button
                              type="button"
                              onClick={() => onUndo(s.idTurnover)}
                              className="text-[#EF5350] hover:text-red-600"
                              title="Batalkan scan"
                              aria-label={`Batalkan scan ${s.labelCode}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function KirimSection({
  stepNumber,
  headerComplete,
  canComplete,
}: {
  stepNumber: number;
  headerComplete: boolean;
  canComplete: boolean;
}) {
  const info = headerComplete
    ? { icon: TruckIcon, color: SUCCESS, text: "Sudah dikirim." }
    : canComplete
      ? {
          icon: CheckCircleIcon,
          color: SUCCESS,
          text: "Semua item terpenuhi — tekan tombol Kirim di kanan bawah.",
        }
      : {
          icon: QrCodeIcon,
          color: MUTED,
          text: "Scan label lewat tombol Scan di kanan bawah sampai semua item terpenuhi.",
        };

  return (
    <div className="overflow-hidden rounded-[10px] border bg-white" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2 px-3.5 py-3">
        <StepBadge number={stepNumber} complete={headerComplete} />
        <p className="min-w-0 flex-1 text-[13.5px] font-bold text-[#1A1D23]">
          Pengiriman
        </p>
      </div>
      <div className="flex items-start gap-2 border-t px-3.5 py-3" style={{ borderColor: BORDER }}>
        <span className="mt-0.5 inline-flex shrink-0" style={{ color: info.color }}>
          <info.icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold leading-relaxed" style={{ color: info.color }}>
          {info.text}
        </p>
      </div>
    </div>
  );
}

function LockedStepPlaceholder({
  stepNumber,
  title,
  message,
}: {
  stepNumber: number;
  title: string;
  message: string;
}) {
  return (
    <div
      className="rounded-[10px] px-3.5 py-3.5"
      style={{ backgroundColor: "#FAFAFA", border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-xs font-extrabold"
          style={{ backgroundColor: "#E0E0E0", color: "#757575" }}
        >
          {stepNumber}
        </span>
        <LockIcon className="h-4 w-4 text-gray-400" />
        <p className="text-[13px] font-bold text-gray-500">{title}</p>
      </div>
      <p className="mt-1.5 pl-8 text-[11.5px] leading-relaxed text-gray-500">
        {message}
      </p>
    </div>
  );
}

function StepBadge({ number, complete }: { number: number; complete: boolean }) {
  return (
    <span
      className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-xs font-extrabold text-white"
      style={{ backgroundColor: complete ? SUCCESS : PRIMARY }}
    >
      {complete ? <CheckIcon className="h-3.5 w-3.5" /> : number}
    </span>
  );
}

function PrintCountBadge({ count }: { count: number }) {
  const printed = count > 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
      style={{
        backgroundColor: printed ? `${PRIMARY}1A` : "rgba(0,0,0,0.06)",
        color: printed ? PRIMARY : "#9CA3AF",
      }}
    >
      <PrintIcon className="h-3 w-3" />
      {printed ? `${count}x` : "0x"}
    </span>
  );
}

function RejectGenerateDialog({
  item,
  busy,
  onCancel,
  onGenerate,
}: {
  item: ReturItem;
  busy: boolean;
  onCancel: () => void;
  onGenerate: (body: { berat?: number; idReject?: number }) => void;
}) {
  const [berat, setBerat] = useState("");
  const [idReject, setIdReject] = useState<number | null>(null);
  const [rejects, setRejects] = useState<{ id: number; nama: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { getReturMastersAction } = await import(
        "@/app/(app)/warehouse/retur-v3/actions"
      );
      const res = await getReturMastersAction();
      if (cancelled) return;
      if (res.ok) setRejects(res.masters.reject);
      else setRejects([]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function submit() {
    const parsed = parseFloat(berat.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Berat harus lebih dari 0");
      return;
    }
    if (!idReject) {
      setError("Pilih jenis reject");
      return;
    }
    onGenerate({ berat: parsed, idReject });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <div>
            <p className="text-[16px] font-extrabold text-[#1A1D23]">
              Generate Label Reject
            </p>
            <p className="text-xs text-gray-500">
              {namaOf(item)} · {item.pcs} pcs
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 pt-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Berat (kg)
            </span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={berat}
              onChange={(e) => setBerat(e.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: BORDER }}
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Jenis Reject
            </span>
            {rejects === null ? (
              <div
                className="flex h-11 items-center gap-2 rounded-xl border px-3 text-sm text-gray-400"
                style={{ borderColor: BORDER }}
              >
                <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
              </div>
            ) : (
              <select
                value={idReject ?? ""}
                onChange={(e) =>
                  setIdReject(e.target.value ? Number(e.target.value) : null)
                }
                className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                style={{ borderColor: BORDER }}
              >
                <option value="">Pilih jenis reject</option>
                {rejects.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Generate Label
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor = PRIMARY,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-700">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: confirmColor }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const info = statusInfo(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${info.bg}1A`, color: info.fg }}
    >
      <info.icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

function statusInfo(status: string): {
  label: string;
  bg: string;
  fg: string;
  icon: typeof BlockIcon;
} {
  switch (String(status).toUpperCase()) {
    case "DIGANTI":
      return { label: "Diganti", bg: "#2196F3", fg: "#1976D2", icon: AutoRenewIcon };
    case "TIDAK_DIGANTI":
      return { label: "Tidak Diganti", bg: "#FF9800", fg: "#E64A19", icon: BlockIcon };
    default:
      return { label: "Pending", bg: "#FFC107", fg: "#FFA000", icon: HourglassIcon };
  }
}

function namaOf(it: ReturItem): string {
  if (it.namaJenis?.trim()) return it.namaJenis;
  if (it.isReject && it.namaReject?.trim()) return it.namaReject;
  return `Jenis #${it.idJenis}`;
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
