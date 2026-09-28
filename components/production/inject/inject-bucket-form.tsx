"use client";

import { useEffect, useState } from "react";
import type {
  InjectBatchSubmitPayload,
  InjectOutputJenis,
  InjectPcsPerLabelResult,
  RejectTypeItem,
} from "@/services/inject-service";
import {
  getBonggolanTypesAction,
  getRejectTypesAction,
} from "@/app/(app)/production/inject/actions";
import {
  initialPplForJenis,
  pplForJenis,
  splitIntoLabels,
} from "./inject-realtime-utils";

const BORDER = "#E2E6EA";

const inputCls =
  "h-9 w-full rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1";

export type BucketFormValue = {
  pcsByJenis: Record<number, string>;
  berat: string;
  cycle: string;
  counter: string;
  bonggolanId: number | "";
  bonggolanBerat: string;
  rejectId: number | "";
  rejectBerat: string;
};

export function emptyBucketForm(counterCurrent?: number | null): BucketFormValue {
  return {
    pcsByJenis: {},
    berat: "",
    cycle: "",
    counter: counterCurrent != null ? String(counterCurrent) : "",
    bonggolanId: "",
    bonggolanBerat: "",
    rejectId: "",
    rejectBerat: "",
  };
}

/** Konteks bucket yang dibutuhkan untuk validasi & perhitungan label. */
export type BucketContext = {
  outputs: InjectOutputJenis[];
  carryInByJenis: Record<number, number>;
  carryInTotal: number;
  pcs: InjectPcsPerLabelResult | null;
  consumed: ReadonlySet<number>;
  discarded: ReadonlySet<number>;
  /** Bucket terakhir → semua sisa dijadikan label & boleh isi bonggolan/reject. */
  isLast: boolean;
};

function toNum(v: string): number | null {
  const n = Number.parseFloat(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function carryInFor(ctx: BucketContext, idJenis: number): number {
  const v = ctx.carryInByJenis[idJenis];
  if (v != null) return v;
  return ctx.outputs.length === 1 ? ctx.carryInTotal : 0;
}

export type BucketPreview = {
  items: {
    idJenis: number;
    pcsInput: number;
    carryOverIn: number;
    carryOverOut: number;
  }[];
  labelsCreated: number;
  totalCarryOut: number;
  totalPcsInput: number;
};

/** Hitung item batch + jumlah label yang akan tercipta (sama dengan tablet). */
export function computeBucketPreview(
  form: BucketFormValue,
  ctx: BucketContext,
): BucketPreview {
  const items: BucketPreview["items"] = [];
  let labelsCreated = 0;
  let totalCarryOut = 0;
  let totalPcsInput = 0;

  for (const jenis of ctx.outputs) {
    const pcsInput = Math.max(
      0,
      Number.parseInt(form.pcsByJenis[jenis.idJenis] ?? "", 10) || 0,
    );
    const carryOverIn = carryInFor(ctx, jenis.idJenis);
    if (pcsInput <= 0 && carryOverIn <= 0) continue;

    const total = carryOverIn + pcsInput;
    const ppl = pplForJenis(ctx.pcs, jenis.idJenis);
    let carryOverOut: number;
    if (ctx.isLast) {
      carryOverOut = 0;
      labelsCreated += Math.floor(total / ppl) + (total % ppl > 0 ? 1 : 0);
    } else {
      const split = splitIntoLabels({
        totalPcs: total,
        standardPpl: ppl,
        initialPpl: initialPplForJenis(ctx.pcs, jenis.idJenis, ctx.discarded),
        alreadyConsumedInitial: ctx.consumed.has(jenis.idJenis),
      });
      carryOverOut = split.carryOverOut;
      labelsCreated += split.labelsCreated;
    }
    totalCarryOut += carryOverOut;
    totalPcsInput += pcsInput;
    items.push({ idJenis: jenis.idJenis, pcsInput, carryOverIn, carryOverOut });
  }
  return { items, labelsCreated, totalCarryOut, totalPcsInput };
}

export type BucketValidation = {
  error: string | null;
  /** Nilai di luar standar mesin — perlu konfirmasi operator. */
  warnings: string[];
  fields?: Pick<
    InjectBatchSubmitPayload,
    "berat" | "cycleTime" | "counter" | "items" | "bonggolan" | "reject"
  >;
};

export function validateBucketForm(
  form: BucketFormValue,
  ctx: BucketContext,
): BucketValidation {
  const preview = computeBucketPreview(form, ctx);
  if (preview.items.length === 0) {
    return { error: "Isi pcs minimal untuk satu jenis output", warnings: [] };
  }
  const berat = toNum(form.berat);
  const cycleTime = toNum(form.cycle);
  const counter = Number.parseInt(form.counter.trim(), 10);
  if (berat == null || berat < 0) {
    return { error: "Berat harus diisi", warnings: [] };
  }
  if (cycleTime == null || cycleTime < 0) {
    return { error: "Cycle Time harus diisi", warnings: [] };
  }
  if (!Number.isFinite(counter) || counter < 0) {
    return { error: "Counter harus diisi", warnings: [] };
  }
  const minCounter = ctx.pcs?.counterCurrent ?? null;
  if (minCounter != null && counter < minCounter) {
    return {
      error: `Counter tidak boleh kurang dari ${minCounter} (odometer saat ini)`,
      warnings: [],
    };
  }

  let bonggolan: InjectBatchSubmitPayload["bonggolan"];
  let reject: InjectBatchSubmitPayload["reject"];
  if (ctx.isLast) {
    const bb = toNum(form.bonggolanBerat);
    if (bb != null && bb > 0) {
      if (form.bonggolanId === "") {
        return { error: "Pilih jenis bonggolan", warnings: [] };
      }
      bonggolan = { idBonggolan: Number(form.bonggolanId), berat: bb };
    }
    const rb = toNum(form.rejectBerat);
    if (rb != null && rb > 0) {
      if (form.rejectId === "") {
        return { error: "Pilih jenis reject", warnings: [] };
      }
      reject = { idReject: Number(form.rejectId), berat: rb };
    }
  }

  const warnings: string[] = [];
  const sb = ctx.pcs?.standarBerat ?? null;
  const sc = ctx.pcs?.standarCycleTime ?? null;
  if (sb != null && berat !== sb) {
    warnings.push(`Berat: ${berat} gr (standar: ${sb} gr)`);
  }
  if (sc != null && cycleTime !== sc) {
    warnings.push(`Cycle Time: ${cycleTime} sec (standar: ${sc} sec)`);
  }

  return {
    error: null,
    warnings,
    fields: {
      berat,
      cycleTime,
      counter,
      items: preview.items,
      ...(bonggolan ? { bonggolan } : {}),
      ...(reject ? { reject } : {}),
    },
  };
}

/** Form isian satu bucket jam: pcs per jenis, berat, cycle time, counter. */
export function BucketForm({
  value,
  onChange,
  ctx,
}: {
  value: BucketFormValue;
  onChange: (v: BucketFormValue) => void;
  ctx: BucketContext;
}) {
  const [bonggolanTypes, setBonggolanTypes] = useState<
    { idBonggolan: number; nama: string }[]
  >([]);
  const [rejectTypes, setRejectTypes] = useState<RejectTypeItem[]>([]);

  useEffect(() => {
    if (!ctx.isLast) return;
    let cancelled = false;
    void (async () => {
      const [b, r] = await Promise.all([
        getBonggolanTypesAction(),
        getRejectTypesAction(),
      ]);
      if (cancelled) return;
      if (b.ok) setBonggolanTypes(b.items);
      if (r.ok) setRejectTypes(r.types);
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.isLast]);

  const set = (patch: Partial<BucketFormValue>) => onChange({ ...value, ...patch });
  const preview = computeBucketPreview(value, ctx);
  const standarBerat = ctx.pcs?.standarBerat ?? null;
  const standarCycle = ctx.pcs?.standarCycleTime ?? null;
  const minCounter = ctx.pcs?.counterCurrent ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {ctx.outputs.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Jenis output belum dikonfigurasi (Master Input Output) untuk cetakan
            dan warna ini.
          </p>
        )}
        {ctx.outputs.map((jenis) => {
          const carryIn = carryInFor(ctx, jenis.idJenis);
          const ppl = pplForJenis(ctx.pcs, jenis.idJenis);
          const awal = initialPplForJenis(ctx.pcs, jenis.idJenis, ctx.discarded);
          return (
            <div
              key={jenis.idJenis}
              className="rounded-lg border p-2.5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="text-xs font-bold text-gray-800">{jenis.namaJenis}</p>
                <p className="text-[10px] text-gray-500">
                  {ppl} pcs/label
                  {awal != null && !ctx.consumed.has(jenis.idJenis)
                    ? ` · label pertama ${awal} pcs`
                    : ""}
                  {carryIn > 0 ? ` · carry-in ${carryIn} pcs` : ""}
                </p>
              </div>
              <input
                value={value.pcsByJenis[jenis.idJenis] ?? ""}
                onChange={(e) =>
                  set({
                    pcsByJenis: {
                      ...value.pcsByJenis,
                      [jenis.idJenis]: e.target.value.replace(/[^0-9]/g, ""),
                    },
                  })
                }
                inputMode="numeric"
                placeholder="Pcs jam ini"
                className={`${inputCls} mt-1.5`}
                style={{ borderColor: BORDER }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-gray-500">
            Berat (gr){standarBerat != null ? ` · std ${standarBerat}` : ""}
          </span>
          <input
            value={value.berat}
            onChange={(e) => set({ berat: e.target.value.replace(/[^0-9.,]/g, "") })}
            inputMode="decimal"
            className={inputCls}
            style={{ borderColor: BORDER }}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-gray-500">
            Cycle Time (sec){standarCycle != null ? ` · std ${standarCycle}` : ""}
          </span>
          <input
            value={value.cycle}
            onChange={(e) => set({ cycle: e.target.value.replace(/[^0-9.,]/g, "") })}
            inputMode="decimal"
            className={inputCls}
            style={{ borderColor: BORDER }}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-gray-500">
            Counter{minCounter != null ? ` · min ${minCounter}` : ""}
          </span>
          <input
            value={value.counter}
            onChange={(e) => set({ counter: e.target.value.replace(/[^0-9]/g, "") })}
            inputMode="numeric"
            className={inputCls}
            style={{ borderColor: BORDER }}
          />
        </label>
      </div>

      {ctx.isLast && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border p-2.5" style={{ borderColor: BORDER }}>
            <p className="mb-1 text-[11px] font-bold text-gray-700">
              Bonggolan (opsional)
            </p>
            <select
              value={value.bonggolanId}
              onChange={(e) =>
                set({
                  bonggolanId: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className={inputCls}
              style={{ borderColor: BORDER }}
            >
              <option value="">— Jenis bonggolan —</option>
              {bonggolanTypes.map((t) => (
                <option key={t.idBonggolan} value={t.idBonggolan}>
                  {t.nama}
                </option>
              ))}
            </select>
            <input
              value={value.bonggolanBerat}
              onChange={(e) =>
                set({ bonggolanBerat: e.target.value.replace(/[^0-9.,]/g, "") })
              }
              inputMode="decimal"
              placeholder="Berat (kg)"
              className={`${inputCls} mt-1.5`}
              style={{ borderColor: BORDER }}
            />
          </div>
          <div className="rounded-lg border p-2.5" style={{ borderColor: BORDER }}>
            <p className="mb-1 text-[11px] font-bold text-gray-700">
              Reject (opsional)
            </p>
            <select
              value={value.rejectId}
              onChange={(e) =>
                set({ rejectId: e.target.value === "" ? "" : Number(e.target.value) })
              }
              className={inputCls}
              style={{ borderColor: BORDER }}
            >
              <option value="">— Jenis reject —</option>
              {rejectTypes.map((t) => (
                <option key={t.idReject} value={t.idReject}>
                  {t.namaReject}
                </option>
              ))}
            </select>
            <input
              value={value.rejectBerat}
              onChange={(e) =>
                set({ rejectBerat: e.target.value.replace(/[^0-9.,]/g, "") })
              }
              inputMode="decimal"
              placeholder="Berat (kg)"
              className={`${inputCls} mt-1.5`}
              style={{ borderColor: BORDER }}
            />
          </div>
        </div>
      )}

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        {preview.items.length === 0
          ? "Isi pcs untuk melihat estimasi label."
          : `${preview.labelsCreated} label akan tercipta · sisa ${preview.totalCarryOut} pcs carry-over${
              ctx.isLast ? " (bucket terakhir: semua sisa dijadikan label)" : ""
            }`}
      </p>
    </div>
  );
}
