"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSortirRejectAction,
  getSrLabelInfoAction,
  getSrMastersAction,
} from "@/app/(app)/operasional/sortir-reject/actions";
import {
  srIsRejectPrefixInput,
  srLabelGroup,
  type SrLabelInfo,
  type SrMasters,
  type SrOutputType,
} from "@/services/sortir-reject-service";
import {
  CheckCircleIcon,
  Loader2Icon,
  QrCodeIcon,
  X,
} from "@/components/dashboard/icons";
import {
  AddBoxIcon,
  AlertIcon,
  InboxIcon,
  OutputIcon,
  ScaleIcon,
  WarehouseIcon,
} from "./sortir-reject-icons";
import { SortirRejectScanDialog } from "./sortir-reject-scan-dialog";
import { formatNum } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";

const ACCEPTED_LABELS = [
  { prefix: "BB", label: "Furniture WIP" },
  { prefix: "BA", label: "Barang Jadi" },
];

type SrOutputEntry = {
  id: string;
  type: SrOutputType;
  idJenis: number;
  namaJenis: string;
  pcs: number;
  berat: number;
};

export function SortirRejectCreateWorkspace() {
  const router = useRouter();
  const [inputs, setInputs] = useState<SrLabelInfo[]>([]);
  const [outputs, setOutputs] = useState<SrOutputEntry[]>([]);
  const [outputMode, setOutputMode] = useState<SrOutputType | null>(null);
  const [masters, setMasters] = useState<SrMasters | null>(null);
  const [mastersError, setMastersError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successNo, setSuccessNo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getSrMastersAction();
      if (cancelled) return;
      if (res.ok) setMasters(res.masters);
      else setMastersError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPcsInput = useMemo(
    () => inputs.reduce((s, l) => s + l.pcs, 0),
    [inputs],
  );
  const totalPcsOutput = useMemo(
    () =>
      outputs
        .filter((o) => o.type === "barangJadi")
        .reduce((s, o) => s + o.pcs, 0),
    [outputs],
  );
  const totalBeratReject = useMemo(
    () =>
      outputs
        .filter((o) => o.type === "reject")
        .reduce((s, o) => s + o.berat, 0),
    [outputs],
  );
  const remainingPcs = totalPcsInput - totalPcsOutput;
  const hasRejectOutput = outputs.some((o) => o.type === "reject");
  const isRejectPrefixInput = srIsRejectPrefixInput(inputs);
  const canChangeOutputMode = !isRejectPrefixInput;
  const allOutputsSameType =
    outputs.length === 0 || outputs.every((o) => o.type === outputs[0].type);
  const allOutputsValid =
    outputs.length > 0 &&
    outputs.every((o) =>
      o.type === "reject" ? o.idJenis > 0 && o.berat > 0 : o.idJenis > 0 && o.pcs > 0,
    );
  const isBalanced =
    outputs.length > 0 &&
    allOutputsSameType &&
    allOutputsValid &&
    (hasRejectOutput || (inputs.length > 0 && remainingPcs === 0));

  const lookupLabel = useCallback(
    async (raw: string): Promise<string | null> => {
      const code = raw.trim().toUpperCase();
      if (!code) return "Kode label kosong";
      if (inputs.some((l) => l.labelCode === code)) {
        return `Label ${code} sudah ditambahkan`;
      }
      if (inputs.length > 0) {
        const existingGroup = srLabelGroup(inputs[0].labelCode);
        const newGroup = srLabelGroup(code);
        if (existingGroup !== newGroup) {
          return `Tidak bisa mencampur label ${existingGroup} dan ${newGroup} dalam satu transaksi`;
        }
      }
      const res = await getSrLabelInfoAction(code);
      if (!res.ok) return res.error;
      const next = [...inputs, res.info];
      setInputs(next);
      if (srIsRejectPrefixInput(next)) {
        setOutputMode("reject");
        setOutputs((prev) => prev.filter((o) => o.type === "reject"));
      }
      return null;
    },
    [inputs],
  );

  const removeInput = useCallback(
    (labelCode: string) => {
      const next = inputs.filter((l) => l.labelCode !== labelCode);
      setInputs(next);
      if (next.length === 0 && outputs.length === 0) setOutputMode(null);
    },
    [inputs, outputs.length],
  );

  const removeOutput = useCallback(
    (id: string) => {
      const next = outputs.filter((o) => o.id !== id);
      setOutputs(next);
      if (next.length === 0 && inputs.length === 0) setOutputMode(null);
    },
    [outputs, inputs.length],
  );

  const addOutput = useCallback((type: SrOutputType) => {
    const actual: SrOutputType =
      type === "reject" ? "reject" : type;
    setOutputMode((prev) => prev ?? actual);
    setOutputs((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${prev.length}`,
        type: actual,
        idJenis: 0,
        namaJenis: "",
        pcs: 0,
        berat: 0,
      },
    ]);
  }, []);

  const requestAddOutput = useCallback(() => {
    const preset = isRejectPrefixInput ? "reject" : outputMode;
    if (preset) {
      addOutput(preset);
      return;
    }
    setTypeDialogOpen(true);
  }, [addOutput, isRejectPrefixInput, outputMode]);

  const clearOutputMode = useCallback(() => {
    if (!canChangeOutputMode) return;
    if (outputs.length > 0) {
      setClearConfirmOpen(true);
      return;
    }
    setOutputMode(null);
  }, [canChangeOutputMode, outputs.length]);

  const setOutputJenis = useCallback(
    (id: string, idJenis: number, namaJenis: string) => {
      setOutputs((prev) =>
        prev.map((o) => (o.id === id ? { ...o, idJenis, namaJenis } : o)),
      );
    },
    [],
  );

  const setOutputValue = useCallback(
    (id: string, field: "pcs" | "berat", value: number) => {
      setOutputs((prev) =>
        prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
      );
    },
    [],
  );

  const submit = useCallback(
    async (idWarehouse: number) => {
      if (!isBalanced || submitting) return;
      setSubmitting(true);
      setSubmitError(null);
      const payload = {
        idWarehouse,
        inputs: inputs.map((l) => l.labelCode),
        outputs: outputs.map((o) =>
          o.type === "reject"
            ? { idJenis: o.idJenis, berat: o.berat }
            : { idJenis: o.idJenis, pcs: o.pcs },
        ),
      };
      const res = await createSortirRejectAction(payload);
      setSubmitting(false);
      if (!res.ok) {
        setSubmitError(res.error);
        setWarehouseOpen(false);
        return;
      }
      setWarehouseOpen(false);
      setSuccessNo(res.noSortir);
    },
    [isBalanced, submitting, inputs, outputs],
  );

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex flex-col gap-3 lg:h-0 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch">
        <section className="lg:h-full lg:min-h-0 lg:w-[260px] xl:w-[320px]">
          <InputsCard
            inputs={inputs}
            onRemove={removeInput}
            onScan={() => setScanOpen(true)}
          />
        </section>

        <OutputsPanel
          outputs={outputs}
          masters={masters}
          outputMode={outputMode}
          canChangeOutputMode={canChangeOutputMode}
          remainingPcs={remainingPcs}
          onAdd={requestAddOutput}
          onClear={clearOutputMode}
          onRemove={removeOutput}
          onJenis={setOutputJenis}
          onValue={setOutputValue}
        />

        <div className="flex flex-col gap-3 lg:w-[260px] lg:overflow-y-auto xl:w-[300px]">
          {(inputs.length > 0 || outputs.length > 0) && (
            <PcsSummaryCard
              hasRejectOutput={hasRejectOutput}
              totalPcsInput={totalPcsInput}
              totalPcsOutput={totalPcsOutput}
              totalBeratReject={totalBeratReject}
              remainingPcs={remainingPcs}
            />
          )}
          <SubmitCard
            submitting={submitting}
            isBalanced={isBalanced}
            allOutputsValid={allOutputsValid}
            inputCount={inputs.length}
            outputCount={outputs.length}
            hasContent={inputs.length > 0 || outputs.length > 0}
            onSubmit={() => {
              setSubmitError(null);
              setWarehouseOpen(true);
            }}
          />
        </div>
      </div>

      {scanOpen && (
        <SortirRejectScanDialog
          onLookup={lookupLabel}
          manualHint="BA / BB / BF.0000000001"
          headerSubtitle={
            inputs.length > 0 ? srLabelGroup(inputs[0].labelCode) : undefined
          }
          acceptedLabels={ACCEPTED_LABELS}
          onClose={() => setScanOpen(false)}
        />
      )}

      {typeDialogOpen && (
        <OutputTypeDialog
          onPick={(type) => {
            setTypeDialogOpen(false);
            addOutput(type);
          }}
          onClose={() => setTypeDialogOpen(false)}
        />
      )}

      {clearConfirmOpen && (
        <ClearOutputConfirmDialog
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => {
            setClearConfirmOpen(false);
            setOutputMode(null);
            setOutputs([]);
          }}
        />
      )}

      {warehouseOpen && (
        <WarehousePickerDialog
          masters={masters}
          loadError={mastersError}
          busy={submitting}
          error={submitError}
          onCancel={() => {
            if (!submitting) setWarehouseOpen(false);
          }}
          onPick={(idWarehouse) => void submit(idWarehouse)}
        />
      )}

      {successNo && (
        <SuccessDialog
          title="Berhasil Submit"
          message={`Data berhasil dibuat dengan nomor ${successNo}`}
          onClose={() => router.push("/operasional/sortir-reject")}
        />
      )}
    </div>
  );
}

function InputsCard({
  inputs,
  onRemove,
  onScan,
}: {
  inputs: SrLabelInfo[];
  onRemove: (labelCode: string) => void;
  onScan: () => void;
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
        <span className="text-sm font-bold text-[#1A1D23]">Label Input</span>
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
              </div>
              <span className="shrink-0 text-[13px] font-bold text-[#1A1D23]">
                {formatNum(lbl.pcs)} pcs
              </span>
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

function OutputsPanel({
  outputs,
  masters,
  outputMode,
  canChangeOutputMode,
  remainingPcs,
  onAdd,
  onClear,
  onRemove,
  onJenis,
  onValue,
}: {
  outputs: SrOutputEntry[];
  masters: SrMasters | null;
  outputMode: SrOutputType | null;
  canChangeOutputMode: boolean;
  remainingPcs: number;
  onAdd: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onJenis: (id: string, idJenis: number, namaJenis: string) => void;
  onValue: (id: string, field: "pcs" | "berat", value: number) => void;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white"
      style={{
        border: `1px solid ${GREEN}4D`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
        <span
          className="grid place-items-center rounded-lg p-1.5"
          style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
        >
          <OutputIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[#1A1D23]">Label Output</span>
        {outputs.length > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
          >
            {outputs.length} label
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-[10px] px-3.5 py-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: GREEN }}
        >
          <AddBoxIcon className="h-4 w-4" />
          Tambah
        </button>
        {outputMode != null && canChangeOutputMode && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-[10px] bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
      <div className="h-px" style={{ backgroundColor: BORDER }} />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {outputs.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-gray-400">
            <AddBoxIcon className="h-12 w-12 text-gray-300" />
            <p className="text-[13px]">
              Tekan &quot;Tambah Output&quot; untuk mulai
            </p>
          </div>
        ) : (
          outputs.map((entry, index) => (
            <OutputCard
              key={entry.id}
              entry={entry}
              index={index}
              masters={masters}
              remainingPcs={remainingPcs}
              onRemove={() => onRemove(entry.id)}
              onJenis={(idJenis, namaJenis) =>
                onJenis(entry.id, idJenis, namaJenis)
              }
              onValue={(field, value) => onValue(entry.id, field, value)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OutputCard({
  entry,
  index,
  masters,
  remainingPcs,
  onRemove,
  onJenis,
  onValue,
}: {
  entry: SrOutputEntry;
  index: number;
  masters: SrMasters | null;
  remainingPcs: number;
  onRemove: () => void;
  onJenis: (idJenis: number, namaJenis: string) => void;
  onValue: (field: "pcs" | "berat", value: number) => void;
}) {
  const isReject = entry.type === "reject";
  const valid =
    entry.idJenis > 0 && (isReject ? entry.berat > 0 : entry.pcs > 0);
  const typeLabel = isReject ? "Reject" : "Barang Jadi";
  const qtyLabel = isReject
    ? entry.berat > 0
      ? `${formatNum(entry.berat, 2)} kg`
      : ""
    : entry.pcs > 0
      ? `${formatNum(entry.pcs)} pcs`
      : "";
  const jenisOptions = isReject
    ? masters?.rejectTypes ?? []
    : masters?.barangJadi ?? [];
  const fieldStyle = isReject
    ? { borderColor: valid ? BORDER : "#FCA5A5" }
    : { borderColor: valid ? BORDER : "#FCA5A5" };

  return (
    <div
      className="mb-3 overflow-hidden rounded-xl bg-white"
      style={{
        border: `1px solid ${valid ? BORDER : "#FCA5A5"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{
          backgroundColor: valid ? "#F0FDF4" : "#FEF2F2",
          borderBottom: `1px solid ${valid ? "#D1FAE5" : "#FECACA"}`,
        }}
      >
        <span
          className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: valid ? GREEN : "#F87171" }}
        >
          {typeLabel} #{index + 1}
        </span>
        {qtyLabel && (
          <span
            className="text-xs font-bold"
            style={{ color: valid ? GREEN : "#B91C1C" }}
          >
            {qtyLabel}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md bg-red-50 p-1 text-red-400 hover:bg-red-100"
          aria-label={`Hapus output ${index + 1}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3 p-3.5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#1A1D23]">
            Jenis
          </span>
          <select
            value={entry.idJenis}
            onChange={(e) => {
              const val = Number(e.target.value);
              const found = jenisOptions.find((j) => j.id === val);
              if (found) onJenis(found.id, found.nama);
            }}
            className="h-9 w-full rounded-lg border px-2.5 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={{
              ...fieldStyle,
              backgroundColor: "#F8F9FB",
            }}
          >
            <option value={0}>
              {masters ? "PILIH JENIS" : "MEMUAT…"}
            </option>
            {jenisOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </select>
        </label>

        {isReject ? (
          <QuantityField
            key={`berat-${entry.id}`}
            fieldKey={`berat-${entry.id}`}
            label="Berat"
            suffix="kg"
            value={entry.berat}
            max={0}
            onValue={(v) => onValue("berat", v)}
          />
        ) : (
          <QuantityField
            key={`pcs-${entry.id}`}
            fieldKey={`pcs-${entry.id}`}
            label="Pcs"
            value={entry.pcs}
            max={remainingPcs > 0 ? remainingPcs + entry.pcs : 0}
            integerOnly
            onValue={(v) => onValue("pcs", v)}
          />
        )}
      </div>
    </div>
  );
}

function QuantityField({
  fieldKey,
  label,
  suffix,
  value,
  max,
  integerOnly,
  onValue,
}: {
  fieldKey: string;
  label: string;
  suffix?: string;
  value: number;
  max: number;
  integerOnly?: boolean;
  onValue: (v: number) => void;
}) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const text = texts[fieldKey] ?? (value > 0 ? stripNumber(value) : "");

  function commit(raw: string) {
    const cleaned = integerOnly
      ? raw.replace(/[^0-9]/g, "")
      : raw.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned.replace(",", "."));
    setTexts((prev) => ({ ...prev, [fieldKey]: cleaned }));
    onValue(Number.isFinite(parsed) ? parsed : 0);
  }

  function applyMax() {
    if (!(max > 0)) return;
    const v = integerOnly ? Math.round(max) : Math.round(max * 1000) / 1000;
    setTexts((prev) => ({ ...prev, [fieldKey]: stripNumber(v) }));
    onValue(v);
  }

  return (
    <div className="relative">
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => commit(e.target.value)}
        placeholder={suffix ? `${label} (${suffix})` : label}
        className="h-9 w-full rounded-lg border px-2.5 pr-14 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
        style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
      />
      {max > 0 && (
        <button
          type="button"
          onClick={applyMax}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-bold"
          style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
        >
          Max
        </button>
      )}
    </div>
  );
}

function PcsSummaryCard({
  hasRejectOutput,
  totalPcsInput,
  totalPcsOutput,
  totalBeratReject,
  remainingPcs,
}: {
  hasRejectOutput: boolean;
  totalPcsInput: number;
  totalPcsOutput: number;
  totalBeratReject: number;
  remainingPcs: number;
}) {
  const over = remainingPcs < 0;
  const balanced = hasRejectOutput || remainingPcs === 0;
  const progress = hasRejectOutput
    ? 1
    : totalPcsInput > 0
      ? Math.min(
          Math.max(
            (totalPcsInput - Math.min(Math.max(remainingPcs, 0), totalPcsInput)) /
              totalPcsInput,
            0,
          ),
          1,
        )
      : 0;
  const barColor = over ? "#DC2626" : balanced ? GREEN : PRIMARY;
  const statusText = hasRejectOutput
    ? `${formatNum(totalPcsInput)} pcs -> ${formatNum(totalBeratReject, 2)} kg`
    : balanced
      ? "Seimbang"
      : over
        ? `Lebih ${formatNum(-remainingPcs)} pcs`
        : `Sisa ${formatNum(remainingPcs)} pcs`;
  const statusColor = balanced ? GREEN : over ? "#DC2626" : "#C2410C";

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
        <span className="text-sm font-bold text-[#1A1D23]">
          {hasRejectOutput ? "Konversi ke Reject" : "Alokasi Pcs"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1A1D23]">
          {hasRejectOutput ? "Input -> Reject" : "Barang Jadi"}
        </span>
        <span className="shrink-0 text-[11px] font-bold" style={{ color: statusColor }}>
          {statusText}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-gray-100"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded transition-all"
          style={{ width: `${progress * 100}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-500">
        {hasRejectOutput
          ? `Input: ${formatNum(totalPcsInput)} pcs  -  Reject: ${formatNum(totalBeratReject, 2)} kg`
          : `Input: ${formatNum(totalPcsInput)} pcs  -  Output: ${formatNum(totalPcsOutput)} pcs`}
      </p>
    </div>
  );
}

function SubmitCard({
  submitting,
  isBalanced,
  allOutputsValid,
  inputCount,
  outputCount,
  hasContent,
  onSubmit,
}: {
  submitting: boolean;
  isBalanced: boolean;
  allOutputsValid: boolean;
  inputCount: number;
  outputCount: number;
  hasContent: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = isBalanced && !submitting;
  return (
    <div
      className="rounded-xl bg-white p-3.5"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex gap-2">
        <StatBox value={inputCount} label="Input" color="#1565C0" />
        <StatBox value={outputCount} label="Output" color={GREEN} />
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

      {!isBalanced && hasContent && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">
          <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {!allOutputsValid
              ? "Setiap output wajib memiliki jenis dan qty > 0"
              : "Total pcs output belum seimbang dengan input"}
          </span>
        </div>
      )}
    </div>
  );
}

function StatBox({
  value,
  label,
  color,
}: {
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
        {label === "Input" ? "↓" : "↑"}
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

function OutputTypeDialog({
  onPick,
  onClose,
}: {
  onPick: (type: SrOutputType) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ backgroundColor: GREEN }}
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/15 p-1.5">
              <OutputIcon className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold">Pilih Output</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/15 p-1 hover:bg-white/25"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-3 p-5">
          <button
            type="button"
            onClick={() => onPick("barangJadi")}
            className="flex h-[126px] flex-1 flex-col items-start justify-end rounded-xl border p-3.5 text-left"
            style={{
              backgroundColor: `${GREEN}14`,
              borderColor: `${GREEN}40`,
            }}
          >
            <InboxIcon className="h-6 w-6" style={{ color: GREEN }} />
            <span className="mt-auto text-sm font-extrabold" style={{ color: GREEN }}>
              Barang Jadi
            </span>
            <span className="mt-1 text-[11px] text-gray-600">
              Jenis barang jadi dan pcs
            </span>
          </button>
          <button
            type="button"
            onClick={() => onPick("reject")}
            className="flex h-[126px] flex-1 flex-col items-start justify-end rounded-xl border p-3.5 text-left"
            style={{
              backgroundColor: "#FEE2E280",
              borderColor: "#FCA5A5",
            }}
          >
            <AlertIcon className="h-6 w-6 text-red-500" />
            <span className="mt-auto text-sm font-extrabold text-red-500">
              Reject
            </span>
            <span className="mt-1 text-[11px] text-gray-600">
              Jenis reject dan berat
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ClearOutputConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-orange-50 p-2 text-orange-700">
            <AlertIcon className="h-5 w-5" />
          </span>
          <p className="text-base font-extrabold text-[#1A1D23]">
            Clear pilihan output?
          </p>
        </div>
        <p className="mt-3.5 text-[13px] leading-relaxed text-gray-600">
          Mode output dan semua output yang sudah dibuat akan dihapus. Setelah itu
          pilih Barang Jadi atau Reject lagi saat tambah output.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border text-sm font-bold text-[#374151] hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function WarehousePickerDialog({
  masters,
  loadError,
  busy,
  error,
  onCancel,
  onPick,
}: {
  masters: SrMasters | null;
  loadError: string | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onPick: (idWarehouse: number) => void;
}) {
  const [selected, setSelected] = useState<number | "">("");
  const loading = !masters && !loadError;
  const ready = selected !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/15 p-1.5">
              <WarehouseIcon className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold">Pilih Warehouse</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md bg-white/15 p-1 hover:bg-white/25 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
              Warehouse
            </span>
            {loading ? (
              <span className="inline-flex items-center gap-2 py-3 text-sm text-gray-500">
                <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat
                warehouse…
              </span>
            ) : (
              <select
                value={selected}
                onChange={(e) =>
                  setSelected(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={busy}
                className="h-12 w-full appearance-none rounded-xl border bg-[#F8F9FB] px-3.5 text-sm text-[#1A1D23] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9] disabled:opacity-60"
                style={{ borderColor: BORDER }}
              >
                <option value="">PILIH WAREHOUSE</option>
                {masters?.warehouses.map((w) => (
                  <option key={w.idWarehouse} value={w.idWarehouse}>
                    {w.namaWarehouse}
                  </option>
                ))}
              </select>
            )}
          </label>

          {loadError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {loadError}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => ready && onPick(selected)}
            disabled={!ready || busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
            style={{ backgroundColor: ready && !busy ? GREEN : undefined }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Konfirmasi &amp; Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessDialog({
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

function stripNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}
