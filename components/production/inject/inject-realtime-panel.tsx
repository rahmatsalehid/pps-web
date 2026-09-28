"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InjectBatchItem,
  InjectBatchLabelItem,
  InjectOutput,
  InjectOutputCategory,
  InjectPcsPerLabelItem,
  InjectPcsPerLabelResult,
  InjectProduction,
} from "@/services/inject-service";
import {
  discardInjectPcsPerLabelAction,
  getInjectBatchAction,
  getInjectPcsPerLabelAction,
  submitInjectBatchAction,
  terminateInjectAction,
} from "@/app/(app)/production/inject/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { InjectBucketDialog, type BucketSubmitFields } from "./inject-bucket-dialog";
import type { BucketContext } from "./inject-bucket-form";
import {
  computeBuckets,
  deriveBucketStates,
  formatCountdown,
  formatHM,
  type Bucket,
  type BucketState,
} from "./inject-realtime-utils";

const PRIMARY = "#0277BD";
const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

/** Info bucket berjalan untuk dialog Ganti Produksi (realtime). */
export type RealtimeGantiInfo = {
  hourStart: string;
  ctx: BucketContext;
};

const STATUS_STYLE: Record<
  BucketState["status"],
  { label: string; bg: string; fg: string; border: string }
> = {
  submitted: { label: "Tersimpan", bg: "#F0FDF4", fg: "#15803D", border: "#BBF7D0" },
  available: { label: "Input", bg: "#EFF6FF", fg: PRIMARY, border: "#BFDBFE" },
  locked: { label: "Belum waktunya", bg: "#F9FAFB", fg: "#6B7280", border: "#E5E7EB" },
  expired: { label: "Terlewat", bg: "#FEF2F2", fg: "#DC2626", border: "#FECACA" },
};

const CATEGORY_OF: {
  key: keyof BucketState["labels"];
  category: InjectOutputCategory;
  name: string;
}[] = [
  { key: "furnitureWip", category: "fwip", name: "Furniture WIP" },
  { key: "barangJadi", category: "bj", name: "Barang Jadi" },
  { key: "bonggolan", category: "bonggolan", name: "Bonggolan" },
  { key: "reject", category: "reject", name: "Reject" },
];

/**
 * Panel Output untuk produksi Inject realtime (InputMode = "realtime"):
 * bucket per jam dengan window input, carry-over antar jam, downtime,
 * terminate, dan label hasil tiap batch.
 */
export function InjectRealtimePanel({
  noProduksi,
  header,
  isLockedOrComplete,
  refreshKey,
  onOpenLabel,
  onSnack,
  onTerminated,
  onGantiInfo,
}: {
  noProduksi: string;
  header: InjectProduction;
  isLockedOrComplete: boolean;
  /** Naik bila label berubah dari luar (cetak/hapus) → muat ulang batch. */
  refreshKey: number;
  onOpenLabel: (output: InjectOutput) => void;
  onSnack: (msg: string, color?: string) => void;
  onTerminated: () => void;
  /** Dipanggil tiap render dengan info bucket berjalan (null bila tidak bisa Ganti). */
  onGantiInfo: (info: RealtimeGantiInfo | null) => void;
}) {
  const [pcs, setPcs] = useState<InjectPcsPerLabelResult | null>(null);
  const [batches, setBatches] = useState<InjectBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  // idJenis yang sudah dijawab operator di dialog target label awal.
  const [promptResolved, setPromptResolved] = useState<Set<number>>(new Set());
  const [promptBusy, setPromptBusy] = useState(false);
  const [dialog, setDialog] = useState<
    { kind: "bucket"; label: string } | { kind: "terminate" } | null
  >(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [p, b] = await Promise.all([
      getInjectPcsPerLabelAction(noProduksi),
      getInjectBatchAction(noProduksi),
    ]);
    setLoading(false);
    if (!p.ok) {
      setError(p.error);
      return;
    }
    setError(b.ok ? null : b.error);
    setPcs(p.data);
    if (b.ok) setBatches(b.items);
  }, [noProduksi]);

  // Tanya operator: lanjutkan sisa label produksi lalu atau reset ke standar
  // (hanya untuk jenis yang belum tersentuh di produksi ini).
  const promptQueue: InjectPcsPerLabelItem[] = useMemo(() => {
    const touched = new Set(
      batches.flatMap((x) => x.jenisItems.map((j) => j.idJenis)),
    );
    return (pcs?.items ?? []).filter(
      (i) =>
        i.pcsPerLabelAwal != null &&
        i.pcsPerLabelAwal > 0 &&
        !touched.has(i.idJenis) &&
        !promptResolved.has(i.idJenis),
    );
  }, [pcs, batches, promptResolved]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  // Tick tiap detik untuk countdown & perubahan status window.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const buckets: Bucket[] = useMemo(
    () => computeBuckets(header.tglProduksi, header.hourStart, header.hourEnd),
    [header.tglProduksi, header.hourStart, header.hourEnd],
  );

  const { states, consumedJenis } = useMemo(
    () =>
      deriveBucketStates({
        buckets,
        batches,
        pcs,
        isComplete: header.isComplete,
        now,
      }),
    [buckets, batches, pcs, header.isComplete, now],
  );

  const lastLabel = buckets.length > 0 ? buckets[buckets.length - 1].label : null;
  const canAct =
    !isLockedOrComplete &&
    lastLabel != null &&
    states.get(lastLabel)?.status !== "submitted";

  const outputs = header.outputs;

  const makeCtx = useCallback(
    (
      carryOverInByJenis: Record<number, number>,
      carryOverIn: number,
      isLast: boolean,
    ): BucketContext => ({
      outputs,
      carryInByJenis: carryOverInByJenis,
      carryInTotal: carryOverIn,
      pcs,
      consumed: consumedJenis,
      discarded,
      isLast,
    }),
    [outputs, pcs, consumedJenis, discarded],
  );

  // Bucket "berjalan" untuk terminate/ganti: available terakhir, atau sisa
  // dari bucket submitted terakhir.
  const running = useMemo(() => {
    const availLabel = [...buckets]
      .reverse()
      .find((b) => states.get(b.label)?.status === "available");
    if (availLabel) {
      const st = states.get(availLabel.label)!;
      return {
        hourStart: availLabel.hourStart,
        carryOverIn: st.carryOverIn,
        carryOverInByJenis: st.carryOverInByJenis,
      };
    }
    const lastSubmitted = [...buckets]
      .reverse()
      .find((b) => states.get(b.label)?.status === "submitted");
    if (lastSubmitted) {
      const st = states.get(lastSubmitted.label)!;
      return {
        hourStart: lastSubmitted.hourEnd,
        carryOverIn: st.carryOverOut,
        carryOverInByJenis: st.carryOverOutByJenis,
      };
    }
    return null;
  }, [buckets, states]);

  // Beri tahu workspace agar dialog Ganti bisa ikut mengirim batch bucket ini.
  const gantiHour = running?.hourStart ?? null;
  const gantiCarry = running?.carryOverIn ?? 0;
  const gantiCarryBy = running?.carryOverInByJenis;
  useEffect(() => {
    if (!canAct || !gantiHour) {
      onGantiInfo(null);
      return;
    }
    onGantiInfo({
      hourStart: gantiHour,
      ctx: makeCtx(gantiCarryBy ?? {}, gantiCarry, true),
    });
  }, [canAct, gantiHour, gantiCarry, gantiCarryBy, makeCtx, onGantiInfo]);

  async function handleBucketSubmit(
    label: string,
    fields: BucketSubmitFields,
  ): Promise<string | null> {
    const res = await submitInjectBatchAction({ noProduksi, ...fields });
    if (!res.ok) return res.error;
    const r = res.result;
    const created =
      r.furnitureWip.length +
      r.barangJadi.length +
      (r.bonggolan ? 1 : 0) +
      (r.reject ? 1 : 0);
    onSnack(
      fields.isDowntime
        ? "Downtime tercatat"
        : created > 0
          ? `${created} label tercipta`
          : "Data jam tersimpan",
    );
    setDialog(null);
    await load();
    return null;
  }

  async function handleTerminate(
    fields: BucketSubmitFields,
    hourEnd: string | null,
  ): Promise<string | null> {
    if (!hourEnd) return "Jam terminate wajib diisi";
    const res = await terminateInjectAction(noProduksi, {
      ...fields,
      hourEnd,
    });
    if (res.status !== "success") return res.message ?? "Gagal terminate";
    setDialog(null);
    onSnack("Produksi berhasil di-terminate", "#dc2626");
    onTerminated();
    return null;
  }

  async function resolvePrompt(reset: boolean) {
    const item = promptQueue[0];
    if (!item) return;
    if (reset) {
      setPromptBusy(true);
      const res = await discardInjectPcsPerLabelAction(noProduksi, item.idJenis);
      setPromptBusy(false);
      if (res.status !== "success") {
        onSnack(res.message ?? "Gagal reset target awal", "#dc2626");
      } else {
        setDiscarded((prev) => new Set(prev).add(item.idJenis));
      }
    }
    setPromptResolved((prev) => new Set(prev).add(item.idJenis));
  }

  function openLabel(
    category: InjectOutputCategory,
    l: InjectBatchLabelItem,
  ) {
    onOpenLabel({
      noProduksi,
      noLabel: l.code,
      category,
      idJenis: null,
      namaJenis: l.namaJenis || null,
      hasBeenPrinted: l.hasBeenPrinted,
      berat: l.berat,
      pcs: l.pcs,
    });
  }

  const totalLabels = batches.reduce(
    (s, b) =>
      s +
      b.labels.furnitureWip.length +
      b.labels.barangJadi.length +
      b.labels.bonggolan.length +
      b.labels.reject.length,
    0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-0">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white"
        style={{ borderColor: `${OUTPUT_TEAL}52` }}
      >
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-sm text-gray-400">
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Memuat bucket
              jam...
            </div>
          ) : error && !pcs ? (
            <div className="flex h-24 flex-col items-center justify-center gap-1 text-center text-sm text-gray-500">
              <span>Gagal memuat data realtime</span>
              <span className="text-xs text-red-500">{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : buckets.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-gray-400">
              Jam produksi belum diatur.
            </div>
          ) : (
            buckets.map((b) => {
              const st = states.get(b.label);
              if (!st) return null;
              const style = STATUS_STYLE[st.status];
              const isOpen = expanded[b.label] ?? st.status === "available";
              const isLast = b.label === lastLabel;
              const labelCount =
                st.labels.furnitureWip.length +
                st.labels.barangJadi.length +
                st.labels.bonggolan.length +
                st.labels.reject.length;
              return (
                <div
                  key={b.label}
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: style.border, backgroundColor: style.bg }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [b.label]: !isOpen }))
                    }
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <span className="text-xs font-extrabold" style={{ color: style.fg }}>
                      {b.label}
                    </span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[9px] font-extrabold"
                      style={{ color: style.fg, borderColor: style.border }}
                    >
                      {st.isOverdue ? "Terlambat" : style.label}
                    </span>
                    {st.isDowntime && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-700">
                        DOWNTIME
                      </span>
                    )}
                    {isLast && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                        TERAKHIR
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-500">
                      {st.status === "submitted" && !st.isDowntime
                        ? `${st.pcsInput} pcs · ${st.labelsCreated} label`
                        : st.status === "locked" && st.windowOpensAt
                          ? `Terbuka dalam ${formatCountdown(st.windowOpensAt, now)}`
                          : st.status === "available" && st.windowClosesAt
                            ? `Tertutup dalam ${formatCountdown(st.windowClosesAt, now)}`
                            : ""}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t px-3 py-2.5" style={{ borderColor: style.border }}>
                      {st.status === "locked" && (
                        <p className="text-[11px] text-gray-500">
                          Belum waktunya input untuk jam ini.
                        </p>
                      )}
                      {st.status === "expired" && (
                        <p className="text-[11px] text-red-600">
                          Jam ini sudah lewat dan tidak diinput.
                        </p>
                      )}
                      {st.status === "available" && (
                        <div className="flex flex-wrap items-center gap-2">
                          {st.carryOverIn > 0 && (
                            <span className="text-[11px] text-gray-600">
                              Carry-in: {st.carryOverIn} pcs
                            </span>
                          )}
                          {!isLockedOrComplete && (
                            <button
                              type="button"
                              onClick={() => setDialog({ kind: "bucket", label: b.label })}
                              className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                              style={{ backgroundColor: PRIMARY }}
                            >
                              Input Jam Ini
                            </button>
                          )}
                        </div>
                      )}
                      {st.status === "submitted" && (
                        <>
                          {st.isDowntime ? (
                            <p className="text-[11px] text-amber-700">
                              Mesin berhenti: {st.keterangan ?? "-"}
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-700">
                              <span>Carry-in {st.carryOverIn}</span>
                              <span>Input {st.pcsInput} pcs</span>
                              <span>Sisa {st.carryOverOut} pcs</span>
                              {st.berat != null && <span>Berat {st.berat} gr</span>}
                              {st.cycleTime != null && (
                                <span>Cycle {st.cycleTime} sec</span>
                              )}
                              {st.counter != null && <span>Counter {st.counter}</span>}
                            </div>
                          )}
                          {labelCount === 0 && !st.isDowntime && (
                            <p className="text-[11px] text-gray-400">
                              Belum ada label tercipta (pcs jadi carry-over).
                            </p>
                          )}
                          {CATEGORY_OF.map(({ key, category, name }) =>
                            st.labels[key].length === 0 ? null : (
                              <div key={key}>
                                <p className="mb-1 text-[10px] font-bold text-gray-500">
                                  {name}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {st.labels[key].map((l) => (
                                    <button
                                      key={l.code}
                                      type="button"
                                      onClick={() => openLabel(category, l)}
                                      className="rounded-md border bg-white px-2 py-1 text-left hover:shadow-sm"
                                      style={{ borderColor: BORDER }}
                                      title="Lihat detail / cetak label"
                                    >
                                      <span className="block text-[10px] font-bold text-gray-800">
                                        {l.code}
                                      </span>
                                      <span className="block text-[9px] text-gray-500">
                                        {l.pcs != null
                                          ? `${l.pcs} pcs`
                                          : l.berat != null
                                            ? `${l.berat} kg`
                                            : ""}
                                        {l.hasBeenPrinted > 0 ? " · Printed" : ""}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ),
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div
          className="shrink-0 space-y-1 border-t px-3 py-2"
          style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
        >
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
              {batches.length} jam tersimpan | {totalLabels} label
              {pcs?.counterCurrent != null ? ` | counter ${pcs.counterCurrent}` : ""}
            </p>
            {canAct && running && (
              <button
                type="button"
                onClick={() => setDialog({ kind: "terminate" })}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                title="Akhiri produksi di tengah jam"
              >
                Terminate
              </button>
            )}
          </div>
        </div>
      </div>

      {dialog?.kind === "bucket" &&
        (() => {
          const st = states.get(dialog.label);
          const bucket = buckets.find((b) => b.label === dialog.label);
          if (!st || !bucket) return null;
          return (
            <InjectBucketDialog
              mode="bucket"
              title={`Input Jam ${bucket.label}`}
              subtitle={`${header.namaMesin} | ${noProduksi}`}
              hourStart={bucket.hourStart}
              ctx={makeCtx(
                st.carryOverInByJenis,
                st.carryOverIn,
                bucket.label === lastLabel,
              )}
              onClose={() => setDialog(null)}
              onSubmit={(fields) => handleBucketSubmit(bucket.label, fields)}
            />
          );
        })()}

      {dialog?.kind === "terminate" && running && (
        <InjectBucketDialog
          mode="terminate"
          title="Terminate Produksi"
          subtitle={`${header.namaMesin} | ${noProduksi} | mulai ${running.hourStart}`}
          hourStart={running.hourStart}
          defaultHourEnd={formatHM(now)}
          ctx={makeCtx(running.carryOverInByJenis, running.carryOverIn, true)}
          onClose={() => setDialog(null)}
          onSubmit={handleTerminate}
        />
      )}

      {promptQueue[0] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">
              Target pcs label awal
            </p>
            <p className="mt-2 text-xs text-gray-600">
              {promptQueue[0].namaBarang} masih punya sisa dari produksi
              sebelumnya di mesin ini. Label pertama produksi ini ditargetkan{" "}
              <b>{promptQueue[0].pcsPerLabelAwal} pcs</b> (standar{" "}
              {promptQueue[0].pcsPerLabel} pcs).
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={promptBusy}
                onClick={() => void resolvePrompt(true)}
                className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
              >
                Reset ke standar
              </button>
              <button
                type="button"
                disabled={promptBusy}
                onClick={() => void resolvePrompt(false)}
                className="flex-1 rounded-full px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                Lanjutkan sisa ({promptQueue[0].pcsPerLabelAwal} pcs)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
