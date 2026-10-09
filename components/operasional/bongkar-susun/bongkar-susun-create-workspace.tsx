"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBongkarSusunAction,
  getBsLabelInfoAction,
} from "@/app/(app)/operasional/bongkar-susun/actions";
import {
  bsCategoryLabelWithCode,
  bsHasSaks,
  bsIsPcsCategory,
  bsPartialUnit,
  bsSupportsPartialInput,
  type BsLabelInfo,
} from "@/services/bongkar-susun-service";
import { CheckCircleIcon, Loader2Icon, QrCodeIcon, X } from "@/components/dashboard/icons";
import { InboxIcon, ListIcon, ScaleIcon } from "./bongkar-susun-icons";
import {
  BsCreateOutputPanel,
  type BsOutputApi,
  type BsOutputEntry,
  type BsSakEntry,
} from "./bongkar-susun-create-output-panel";
import { BongkarSusunScanDialog } from "./bongkar-susun-scan-dialog";
import { BongkarSusunSakDialog } from "./bongkar-susun-sak-dialog";
import { formatNum } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";
const TOLERANCE = 0.001;

const ACCEPTED_LABELS = [
  { prefix: "A", label: "Bahan Baku" },
  { prefix: "B", label: "Washing" },
  { prefix: "D", label: "Broker" },
  { prefix: "M", label: "Bonggolan" },
  { prefix: "V", label: "Gilingan" },
  { prefix: "F", label: "Crusher" },
  { prefix: "BB", label: "Furniture WIP" },
  { prefix: "BA", label: "Barang Jadi" },
  { prefix: "H", label: "Mixer" },
  { prefix: "BF", label: "Reject" },
];

export function BongkarSusunCreateWorkspace() {
  const router = useRouter();
  const [rawInputs, setInputs] = useState<BsLabelInfo[]>([]);
  // Qty partial per label (kategori: mixer, reject, furniture WIP, barang jadi).
  const [partialPcs, setPartialPcs] = useState<Record<string, number>>({});
  const [partialTarget, setPartialTarget] = useState<BsLabelInfo | null>(null);
  const [outputs, setOutputs] = useState<BsOutputEntry[]>([]);
  const inputs = useMemo(
    () =>
      rawInputs.map((l) => {
        const p = partialPcs[l.labelCode];
        return p != null && p < l.totalBerat
          ? { ...l, totalBerat: p, isPartial: true }
          : l;
      }),
    [rawInputs, partialPcs],
  );
  const [scanOpen, setScanOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNo, setSuccessNo] = useState<string | null>(null);
  const [sakTarget, setSakTarget] = useState<BsLabelInfo | null>(null);

  const category = inputs.length > 0 ? inputs[0].category : null;
  const hasSaks = bsHasSaks(category);
  const isPcsCategory = bsIsPcsCategory(category);
  const isGilingan = category === "gilingan";
  const unit = isPcsCategory ? "pcs" : "kg";

  const jenisOptions = useMemo(() => {
    const seen = new Set<number>();
    const result: { idJenis: number; namaJenis: string }[] = [];
    for (const lbl of inputs) {
      if (!seen.has(lbl.idJenis)) {
        seen.add(lbl.idJenis);
        result.push({ idJenis: lbl.idJenis, namaJenis: lbl.namaJenis });
      }
    }
    return result;
  }, [inputs]);

  const inputBeratByJenis = useMemo(() => {
    const m: Record<number, number> = {};
    for (const lbl of inputs) m[lbl.idJenis] = (m[lbl.idJenis] ?? 0) + lbl.totalBerat;
    return m;
  }, [inputs]);

  const outputBeratByJenis = useMemo(() => {
    const m: Record<number, number> = {};
    for (const out of outputs) {
      const total = out.saks.length
        ? out.saks.reduce((s, x) => s + x.berat, 0)
        : out.berat;
      m[out.idJenis] = (m[out.idJenis] ?? 0) + total;
    }
    return m;
  }, [outputs]);

  const remainingByJenis = useMemo(() => {
    const m: Record<number, number> = {};
    for (const [key, value] of Object.entries(inputBeratByJenis)) {
      const id = Number(key);
      m[id] = value - (outputBeratByJenis[id] ?? 0);
    }
    return m;
  }, [inputBeratByJenis, outputBeratByJenis]);

  const allOutputsValid =
    outputs.length > 0 &&
    outputs.every((out) =>
      hasSaks
        ? out.saks.length > 0 && out.saks.every((s) => s.berat > 0)
        : out.berat > 0,
    );

  const allJenisAllocated =
    inputs.length > 0 &&
    Object.keys(remainingByJenis).length > 0 &&
    Object.values(remainingByJenis).every((r) => Math.abs(r) < TOLERANCE);

  const isBalanced =
    inputs.length > 0 &&
    outputs.length > 0 &&
    allOutputsValid &&
    Object.values(remainingByJenis).every((r) => Math.abs(r) <= TOLERANCE);

  const lookupLabel = useCallback(
    async (raw: string): Promise<string | null> => {
      const code = raw.trim();
      if (!code) return "Kode label kosong";
      if (inputs.some((l) => l.labelCode === code)) {
        return `Label ${code} sudah ditambahkan`;
      }
      const res = await getBsLabelInfoAction(code);
      if (!res.ok) return res.error;
      const info = res.info;

      if (inputs.length > 0 && category && info.category !== category) {
        return (
          "Semua label harus kategori sama " +
          `(${bsCategoryLabelWithCode(category)} vs ${bsCategoryLabelWithCode(info.category)})`
        );
      }
      if (info.category === "bahanBaku" && inputs.length > 0) {
        const existingNo = inputs[0].noBahanBaku;
        if (
          existingNo &&
          info.noBahanBaku &&
          info.noBahanBaku !== existingNo
        ) {
          return (
            `Label bahan baku harus dari nomor yang sama (${existingNo}). ` +
            `Label ${info.labelCode} tidak diizinkan.`
          );
        }
      }

      setInputs((prev) => [...prev, info]);
      return null;
    },
    [inputs, category],
  );

  const removeInput = useCallback((labelCode: string) => {
    setPartialPcs((prev) => {
      const rest = { ...prev };
      delete rest[labelCode];
      return rest;
    });
    setInputs((prev) => {
      const next = prev.filter((l) => l.labelCode !== labelCode);
      if (next.length === 0) setOutputs([]);
      return next;
    });
  }, []);

  const addOutput = useCallback(() => {
    if (jenisOptions.length === 0) return;
    const first =
      jenisOptions.find((j) => Math.abs(remainingByJenis[j.idJenis] ?? 0) > TOLERANCE) ??
      jenisOptions[0];
    const id = `${Date.now()}_${outputs.length}`;
    const entry: BsOutputEntry = {
      id,
      idJenis: first.idJenis,
      namaJenis: first.namaJenis,
      saks: [],
      berat: 0,
    };
    if (hasSaks) entry.saks.push({ id: `${id}_sak_0`, noSak: 1, berat: 0 });
    setOutputs((prev) => [...prev, entry]);
  }, [jenisOptions, remainingByJenis, outputs.length, hasSaks]);

  const api: BsOutputApi = useMemo(
    () => ({
      add: addOutput,
      remove: (id) => setOutputs((prev) => prev.filter((o) => o.id !== id)),
      setJenis: (id, idJenis, namaJenis) =>
        setOutputs((prev) =>
          prev.map((o) => (o.id === id ? { ...o, idJenis, namaJenis } : o)),
        ),
      setBerat: (id, berat) =>
        setOutputs((prev) => prev.map((o) => (o.id === id ? { ...o, berat } : o))),
      addSak: (id) =>
        setOutputs((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const nextNo =
              o.saks.length === 0
                ? 1
                : Math.max(...o.saks.map((s) => s.noSak)) + 1;
            const sak: BsSakEntry = {
              id: `${id}_sak_${o.saks.length}_${Date.now()}`,
              noSak: nextNo,
              berat: 0,
            };
            return { ...o, saks: [...o.saks, sak] };
          }),
        ),
      addSakBulk: (id, count, beratPerSak) =>
        setOutputs((prev) =>
          prev.map((o) => {
            if (o.id !== id || count <= 0) return o;
            const base =
              o.saks.length === 0
                ? 1
                : Math.max(...o.saks.map((s) => s.noSak)) + 1;
            const added: BsSakEntry[] = Array.from({ length: count }, (_, i) => ({
              id: `${id}_sak_bulk_${Date.now()}_${i}`,
              noSak: base + i,
              berat: beratPerSak,
            }));
            return { ...o, saks: [...o.saks, ...added] };
          }),
        ),
      removeSak: (id, sakId) =>
        setOutputs((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const saks = o.saks
              .filter((s) => s.id !== sakId)
              .map((s, i) => ({ ...s, noSak: i + 1 }));
            return { ...o, saks };
          }),
        ),
      setSakBerat: (id, sakId, berat) =>
        setOutputs((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  saks: o.saks.map((s) => (s.id === sakId ? { ...s, berat } : s)),
                }
              : o,
          ),
        ),
    }),
    [addOutput],
  );

  const submit = useCallback(
    async (note: string) => {
      if (!isBalanced || submitting) return;
      setSubmitting(true);
      setSubmitError(null);
      const outputsPayload = outputs.map((out) => {
        if (hasSaks) {
          return {
            idJenis: out.idJenis,
            saks: out.saks.map((s) => ({ noSak: s.noSak, berat: s.berat })),
          };
        }
        if (isGilingan) return { idGilingan: out.idJenis, berat: out.berat };
        if (isPcsCategory) return { idJenis: out.idJenis, pcs: Math.round(out.berat) };
        return { idJenis: out.idJenis, berat: out.berat };
      });
      const partialInputs = inputs.filter(
        (l) => bsSupportsPartialInput(l.category) && partialPcs[l.labelCode] != null,
      );
      const res = await createBongkarSusunAction({
        note,
        inputs: inputs.map((l) => l.labelCode),
        ...(partialInputs.length > 0 && {
          inputsPartial: partialInputs.map((l) => ({
            labelCode: l.labelCode,
            qty:
              bsPartialUnit(l.category) === "kg"
                ? Math.round(l.totalBerat * 1000) / 1000
                : Math.round(l.totalBerat),
          })),
        }),
        outputs: outputsPayload,
      });
      setSubmitting(false);
      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }
      setNoteOpen(false);
      setSuccessNo(res.noBongkarSusun);
    },
    [isBalanced, submitting, outputs, hasSaks, isGilingan, isPcsCategory, inputs, partialPcs],
  );

  const unitLabel = unit === "pcs" ? "Alokasi Pcs" : "Alokasi Berat";

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex flex-col gap-3 lg:h-0 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch">
        <section className="lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-1">
          <InputsCard
            inputs={inputs}
            onRemove={removeInput}
            onScan={() => setScanOpen(true)}
            onSakDetail={(lbl) => setSakTarget(lbl)}
            onPartial={(lbl) =>
              setPartialTarget(rawInputs.find((r) => r.labelCode === lbl.labelCode) ?? null)
            }
          />
        </section>

        <BsCreateOutputPanel
          outputs={outputs}
          api={api}
          jenisOptions={jenisOptions}
          remainingByJenis={remainingByJenis}
          hasSaks={hasSaks}
          isPcsCategory={isPcsCategory}
          inputsEmpty={inputs.length === 0}
          allJenisAllocated={allJenisAllocated}
        />

        <div className="flex flex-col gap-3 lg:w-[260px] lg:overflow-y-auto xl:w-[300px]">
          {Object.keys(inputBeratByJenis).length > 0 && (
            <AlokasiCard
              inputBeratByJenis={inputBeratByJenis}
              remainingByJenis={remainingByJenis}
              jenisNames={Object.fromEntries(
                jenisOptions.map((j) => [j.idJenis, j.namaJenis]),
              )}
              unit={unit}
              unitLabel={unitLabel}
            />
          )}
          <SubmitCard
            submitting={submitting}
            isBalanced={isBalanced}
            allOutputsValid={allOutputsValid}
            inputCount={inputs.length}
            outputCount={outputs.length}
            hasInputs={inputs.length > 0}
            onSubmit={() => {
              setSubmitError(null);
              setNoteOpen(true);
            }}
          />
        </div>
      </div>

      {scanOpen && (
        <BongkarSusunScanDialog
          onLookup={lookupLabel}
          manualHint="B.0000000001"
          headerSubtitle={category ? bsCategoryLabelWithCode(category) : undefined}
          acceptedLabels={ACCEPTED_LABELS}
          onClose={() => setScanOpen(false)}
        />
      )}

      {noteOpen && (
        <BsNoteDialog
          busy={submitting}
          error={submitError}
          onCancel={() => {
            if (!submitting) setNoteOpen(false);
          }}
          onSubmit={(note) => void submit(note)}
        />
      )}

      {successNo && (
        <BsSuccessDialog
          title="Berhasil Submit"
          message={`Data berhasil dibuat dengan nomor ${successNo}`}
          onClose={() => router.push("/operasional/bongkar-susun")}
        />
      )}

      {partialTarget && (
        <BsPartialQtyDialog
          label={partialTarget}
          current={partialPcs[partialTarget.labelCode]}
          onCancel={() => setPartialTarget(null)}
          onConfirm={(qty) => {
            const code = partialTarget.labelCode;
            setPartialPcs((prev) => {
              if (qty >= partialTarget.totalBerat) {
                const rest = { ...prev };
                delete rest[code];
                return rest;
              }
              return { ...prev, [code]: qty };
            });
            // Output yang sudah dibuat bisa melebihi sisa baru — user menyesuaikan.
            setPartialTarget(null);
          }}
        />
      )}

      {sakTarget && (
        <BongkarSusunSakDialog
          labelCode={sakTarget.labelCode}
          namaJenis={sakTarget.namaJenis}
          jumlahSak={sakTarget.jumlahSak}
          totalBerat={sakTarget.totalBerat}
          saks={sakTarget.saks}
          onClose={() => setSakTarget(null)}
        />
      )}
    </div>
  );
}

function InputsCard({
  inputs,
  onRemove,
  onScan,
  onSakDetail,
  onPartial,
}: {
  inputs: BsLabelInfo[];
  onRemove: (labelCode: string) => void;
  onScan: () => void;
  onSakDetail: (lbl: BsLabelInfo) => void;
  onPartial: (lbl: BsLabelInfo) => void;
}) {
  return (
    <div
      className="flex h-full min-h-[260px] flex-col overflow-hidden rounded-xl bg-white"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
        <span
          className="grid place-items-center rounded-lg p-1.5"
          style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
        >
          <InboxIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[#1A1D23]">Input</span>
        {inputs.length > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            {inputs.length} label
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onScan}
          className="inline-flex items-center gap-1 rounded-[10px] px-3.5 py-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <QrCodeIcon className="h-4 w-4" />
          Scan
        </button>
      </div>
      <div className="h-px" style={{ backgroundColor: BORDER }} />

      <div className="min-h-0 flex-1 overflow-auto">
        {inputs.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-gray-400">
            <InboxIcon className="h-10 w-10 text-gray-300" />
            <p className="text-[13px]">Belum ada label di-scan</p>
          </div>
        ) : (
          inputs.map((lbl) => (
            <div
              key={lbl.labelCode}
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#1A1D23]">
                  {lbl.labelCode}
                </p>
                <p className="truncate text-[11px] text-gray-500">{lbl.namaJenis}</p>
                {bsSupportsPartialInput(lbl.category) && lbl.isPartial && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-700">
                      PARTIAL
                    </span>
                  </div>
                )}
                {bsSupportsPartialInput(lbl.category) && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPartial(lbl)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
                    >
                      Partial
                    </button>
                  </div>
                )}
                {lbl.saks.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded bg-[#E3F2FD] px-1.5 py-0.5 text-[10px] font-semibold text-[#1565C0]">
                      {lbl.jumlahSak} sak • {formatNum(lbl.totalBerat)} kg
                    </span>
                    <button
                      type="button"
                      onClick={() => onSakDetail(lbl)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
                    >
                      <ListIcon className="h-3 w-3" /> Detail
                    </button>
                  </div>
                )}
              </div>
              {!lbl.saks.length && (
                <span className="shrink-0 text-[13px] font-bold text-[#1A1D23]">
                  {bsIsPcsCategory(lbl.category)
                    ? `${Math.round(lbl.totalBerat)} pcs`
                    : `${formatNum(lbl.totalBerat)} kg`}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(lbl.labelCode)}
                className="shrink-0 rounded-md bg-red-50 p-1 text-red-400 hover:bg-red-100"
                aria-label={`Hapus ${lbl.labelCode}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AlokasiCard({
  inputBeratByJenis,
  remainingByJenis,
  jenisNames,
  unit,
  unitLabel,
}: {
  inputBeratByJenis: Record<number, number>;
  remainingByJenis: Record<number, number>;
  jenisNames: Record<number, string>;
  unit: string;
  unitLabel: string;
}) {
  return (
    <div
      className="rounded-xl bg-white p-3.5"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid place-items-center rounded-lg p-1.5"
          style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
        >
          <ScaleIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[#1A1D23]">{unitLabel}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {Object.entries(inputBeratByJenis).map(([key, total]) => {
          const id = Number(key);
          const rem = remainingByJenis[id] ?? total;
          const balanced = Math.abs(rem) < TOLERANCE;
          const over = rem < -TOLERANCE;
          const progress =
            total > 0
              ? Math.min(Math.max((total - Math.min(Math.max(rem, 0), total)) / total, 0), 1)
              : 0;
          const barColor = over ? "#DC2626" : balanced ? GREEN : PRIMARY;
          return (
            <div key={id}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1A1D23]">
                  {jenisNames[id] ?? `Jenis ${id}`}
                </span>
                <span
                  className="shrink-0 text-[11px] font-bold"
                  style={{
                    color: balanced ? GREEN : over ? "#DC2626" : "#C2410C",
                  }}
                >
                  {balanced
                    ? "✓ Seimbang"
                    : over
                      ? `⚠ Lebih ${formatNum(-rem)} ${unit}`
                      : `Sisa ${formatNum(rem)} ${unit}`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-gray-100">
                <div
                  className="h-full rounded"
                  style={{ width: `${progress * 100}%`, backgroundColor: barColor }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-gray-500">
                Total input: {formatNum(total)} {unit}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmitCard({
  submitting,
  isBalanced,
  allOutputsValid,
  inputCount,
  outputCount,
  hasInputs,
  onSubmit,
}: {
  submitting: boolean;
  isBalanced: boolean;
  allOutputsValid: boolean;
  inputCount: number;
  outputCount: number;
  hasInputs: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = isBalanced && !submitting;
  return (
    <div
      className="rounded-xl bg-white p-3.5"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex gap-2">
        <StatBox icon="in" value={inputCount} label="Input" color="#1565C0" />
        <StatBox icon="out" value={outputCount} label="Output" color={GREEN} />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold tracking-wide disabled:bg-gray-200 disabled:text-gray-400"
        style={
          canSubmit
            ? {
                backgroundColor: GREEN,
                color: "#fff",
                boxShadow: "0 3px 8px rgba(10,115,73,0.3)",
              }
            : undefined
        }
      >
        {submitting ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircleIcon className="h-4 w-4" />
        )}
        {submitting ? "Menyimpan..." : "Submit Transaksi"}
      </button>

      {!isBalanced && hasInputs && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">
          <span aria-hidden>⚠</span>
          <span>
            {!allOutputsValid
              ? "Setiap output wajib memiliki minimal 1 sak dengan berat > 0"
              : "Berat output belum seimbang dengan input"}
          </span>
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: "in" | "out";
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-2"
      style={{ backgroundColor: `${color}0F` }}
    >
      <span className="text-xs" style={{ color }} aria-hidden>
        {icon === "in" ? "↓" : "↑"}
      </span>
      <span>
        <span className="block text-[15px] font-extrabold" style={{ color }}>
          {value}
        </span>
        <span className="block text-[10px]" style={{ color: `${color}B3` }}>
          {label}
        </span>
      </span>
    </div>
  );
}

function BsNoteDialog({
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span
            className="grid place-items-center rounded-lg p-2"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M5 3h14v13l-5 5H5V3Z" />
              <path d="M14 21v-5h5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-[#1A1D23]">Catatan Transaksi</p>
            <p className="text-[11px] text-gray-500">Opsional</p>
          </div>
        </div>

        <textarea
          autoFocus
          rows={2}
          maxLength={400}
          placeholder="Tulis catatan..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-3 w-full resize-none rounded-xl border bg-[#F8F9FB] p-3 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
          style={{ borderColor: BORDER }}
        />

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 flex-1 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note.trim())}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function BsPartialQtyDialog({
  label,
  current,
  onCancel,
  onConfirm,
}: {
  label: BsLabelInfo;
  current: number | undefined;
  onCancel: () => void;
  onConfirm: (qty: number) => void;
}) {
  const unit = bsPartialUnit(label.category);
  const isKg = unit === "kg";
  const max = isKg
    ? Math.round(label.totalBerat * 1000) / 1000
    : Math.round(label.totalBerat);
  const [value, setValue] = useState(String(current ?? max));
  const qty = isKg ? parseFloat(value) : parseInt(value, 10);
  const valid = Number.isFinite(qty) && qty > 0 && qty <= max;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-sm font-bold text-[#1A1D23]">Input Partial</p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          {label.labelCode} • {label.namaJenis} • sisa {max} {unit}
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {isKg ? "Berat yang dibongkar (kg)" : "Pcs yang dibongkar"}
          </span>
          <input
            autoFocus
            inputMode={isKg ? "decimal" : "numeric"}
            value={value}
            onChange={(e) =>
              setValue(
                e.target.value.replace(/[^0-9.]/g, "").replace(/\.(.*)\./g, ".$1"),
              )
            }
            className="h-11 w-full rounded-xl border bg-[#F8F9FB] px-3 text-sm outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={{ borderColor: value && !valid ? "#F87171" : BORDER }}
          />
          {value && !valid && (
            <span className="mt-1 block text-[11px] text-red-600">
              {isKg
                ? `Berat harus lebih dari 0 dan maksimal ${max} kg`
                : `Pcs harus 1–${max}`}
            </span>
          )}
        </label>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 flex-1 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(qty)}
            className="h-10 flex-1 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function BsSuccessDialog({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center px-5 pb-2 pt-6 text-center">
          <span
            className="grid h-12 w-12 place-items-center rounded-full"
            style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
          >
            <CheckCircleIcon className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-[#1A1D23]">{title}</p>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
        </div>
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
