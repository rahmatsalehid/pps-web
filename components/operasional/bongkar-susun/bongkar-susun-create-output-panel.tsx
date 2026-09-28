"use client";

import { useState } from "react";
import { PlusIcon, X } from "@/components/dashboard/icons";
import {
  AddBoxIcon,
  PlaylistAddIcon,
} from "./bongkar-susun-icons";
import { formatNum } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";

export type BsSakEntry = { id: string; noSak: number; berat: number };

export type BsOutputEntry = {
  id: string;
  idJenis: number;
  namaJenis: string;
  saks: BsSakEntry[];
  berat: number;
};

export type BsOutputApi = {
  add: () => void;
  remove: (id: string) => void;
  setJenis: (id: string, idJenis: number, namaJenis: string) => void;
  setBerat: (id: string, berat: number) => void;
  addSak: (id: string) => void;
  addSakBulk: (id: string, count: number, beratPerSak: number) => void;
  removeSak: (id: string, sakId: string) => void;
  setSakBerat: (id: string, sakId: string, berat: number) => void;
};

export function BsCreateOutputPanel({
  outputs,
  api,
  jenisOptions,
  remainingByJenis,
  hasSaks,
  isPcsCategory,
  inputsEmpty,
  allJenisAllocated,
}: {
  outputs: BsOutputEntry[];
  api: BsOutputApi;
  jenisOptions: { idJenis: number; namaJenis: string }[];
  remainingByJenis: Record<number, number>;
  hasSaks: boolean;
  isPcsCategory: boolean;
  inputsEmpty: boolean;
  allJenisAllocated: boolean;
}) {
  const canAdd = !inputsEmpty && !allJenisAllocated;
  const [bulkFor, setBulkFor] = useState<BsOutputEntry | null>(null);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white"
      style={{ border: `1px solid ${GREEN}4D`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
        <span
          className="grid place-items-center rounded-lg p-1.5"
          style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
        >
          <AddBoxIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-[#1A1D23]">Output</span>
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
          onClick={api.add}
          disabled={!canAdd}
          title={
            !inputsEmpty && allJenisAllocated
              ? "Semua jenis sudah terpenuhi"
              : "Tambah Output"
          }
          className="inline-flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-xs font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
          style={canAdd ? { backgroundColor: GREEN } : undefined}
        >
          <PlusIcon className="h-4 w-4" />
          Tambah Output
        </button>
      </div>
      <div className="h-px" style={{ backgroundColor: BORDER }} />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {outputs.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-gray-400">
            <AddBoxIcon className="h-12 w-12 text-gray-300" />
            <p className="text-[13px]">
              {inputsEmpty
                ? "Masukkan label input terlebih dahulu"
                : 'Tekan "Tambah Output" untuk mulai'}
            </p>
          </div>
        ) : (
          outputs.map((out, index) => (
            <BsOutputCard
              key={out.id}
              entry={out}
              index={index}
              api={api}
              jenisOptions={jenisOptions}
              remainingByJenis={remainingByJenis}
              hasSaks={hasSaks}
              isPcsCategory={isPcsCategory}
              onBulk={() => setBulkFor(out)}
            />
          ))
        )}
      </div>

      {bulkFor && (
        <BsBulkSakDialog
          currentSakCount={bulkFor.saks.length}
          onCancel={() => setBulkFor(null)}
          onConfirm={(count, berat) => {
            api.addSakBulk(bulkFor.id, count, berat);
            setBulkFor(null);
          }}
        />
      )}
    </div>
  );
}

function BsOutputCard({
  entry,
  index,
  api,
  jenisOptions,
  remainingByJenis,
  hasSaks,
  isPcsCategory,
  onBulk,
}: {
  entry: BsOutputEntry;
  index: number;
  api: BsOutputApi;
  jenisOptions: { idJenis: number; namaJenis: string }[];
  remainingByJenis: Record<number, number>;
  hasSaks: boolean;
  isPcsCategory: boolean;
  onBulk: () => void;
}) {
  const remaining = remainingByJenis[entry.idJenis] ?? 0;
  const total = entry.saks.length
    ? entry.saks.reduce((s, x) => s + x.berat, 0)
    : entry.berat;
  const isValid = hasSaks
    ? entry.saks.length > 0 && entry.saks.every((s) => s.berat > 0)
    : entry.berat > 0;
  // Sembunyikan jenis yang sudah seimbang, kecuali jenis yang sedang dipakai.
  const options = jenisOptions.filter((j) => {
    const rem = remainingByJenis[j.idJenis] ?? 0;
    return Math.abs(rem) >= 0.001 || entry.idJenis === j.idJenis;
  });

  const fieldStyle = {
    borderColor: BORDER,
    backgroundColor: "#F8F9FB",
  };

  return (
    <div
      className="mb-3 overflow-hidden rounded-xl bg-white"
      style={{
        border: `1px solid ${isValid ? BORDER : "#FCA5A5"}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{
          backgroundColor: isValid ? "#F0FDF4" : "#FEF2F2",
          borderBottom: `1px solid ${isValid ? "#D1FAE5" : "#FECACA"}`,
        }}
      >
        <span
          className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: isValid ? GREEN : "#F87171" }}
        >
          Output #{index + 1}
        </span>
        {total > 0 && (
          <span
            className="text-xs font-bold"
            style={{ color: isValid ? GREEN : "#B91C1C" }}
          >
            {isPcsCategory && !hasSaks
              ? `${Math.round(total).toLocaleString("id-ID")} pcs`
              : `${formatNum(total)} kg`}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => api.remove(entry.id)}
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
              const found = options.find((j) => j.idJenis === val);
              if (found) api.setJenis(entry.id, found.idJenis, found.namaJenis);
            }}
            className="h-9 w-full rounded-lg border px-2.5 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={fieldStyle}
          >
            {options.map((j) => (
              <option key={j.idJenis} value={j.idJenis}>
                {j.namaJenis}
              </option>
            ))}
          </select>
        </label>

        {hasSaks ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold text-[#1A1D23]">Sak</span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => api.addSak(entry.id)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold"
                style={{ backgroundColor: `${PRIMARY}14`, color: PRIMARY }}
              >
                <PlusIcon className="h-3.5 w-3.5" /> 1 Sak
              </button>
              <button
                type="button"
                onClick={onBulk}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold"
                style={{ backgroundColor: `${GREEN}14`, color: GREEN }}
              >
                <PlaylistAddIcon className="h-3.5 w-3.5" /> Massal
              </button>
            </div>

            {entry.saks.length === 0 ? (
              <div
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700"
              >
                Wajib minimal 1 sak
              </div>
            ) : (
              entry.saks.map((sak) => (
                <SakRow
                  key={sak.id}
                  sakId={sak.id}
                  noSak={sak.noSak}
                  berat={sak.berat}
                  max={remaining + sak.berat}
                  onBerat={(v) => api.setSakBerat(entry.id, sak.id, v)}
                  onRemove={() => api.removeSak(entry.id, sak.id)}
                />
              ))
            )}
          </div>
        ) : (
          <QuantityField
            key={entry.id}
            fieldKey={entry.id}
            label={isPcsCategory ? "Pcs" : "Berat (kg)"}
            value={entry.berat}
            max={remaining + entry.berat}
            integerOnly={isPcsCategory}
            onValue={(v) => api.setBerat(entry.id, v)}
          />
        )}
      </div>
    </div>
  );
}

function SakRow({
  sakId,
  noSak,
  berat,
  max,
  onBerat,
  onRemove,
}: {
  sakId: string;
  noSak: number;
  berat: number;
  max: number;
  onBerat: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="w-[60px] shrink-0 rounded-lg py-2 text-center text-[11px] font-bold"
        style={{ backgroundColor: `${PRIMARY}0F`, color: PRIMARY, border: `1px solid ${PRIMARY}33` }}
      >
        Sak {noSak}
      </span>
      <QuantityField
        fieldKey={`sak-${sakId}`}
        label="Berat (kg)"
        value={berat}
        max={max}
        onValue={onBerat}
        grow
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-lg bg-red-50 p-1.5 text-red-400 hover:bg-red-100"
        aria-label={`Hapus sak ${noSak}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function QuantityField({
  fieldKey,
  label,
  value,
  max,
  integerOnly,
  onValue,
  grow,
}: {
  fieldKey: string;
  label: string;
  value: number;
  max: number;
  integerOnly?: boolean;
  onValue: (v: number) => void;
  grow?: boolean;
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
    <div className={grow ? "min-w-0 flex-1" : "w-full"}>
      <div className="relative">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => commit(e.target.value)}
          placeholder={label}
          className="h-9 w-full rounded-lg border px-2.5 pr-14 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
          style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
        />
        {max > 0 && (
          <button
            type="button"
            onClick={applyMax}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            Max
          </button>
        )}
      </div>
    </div>
  );
}

function BsBulkSakDialog({
  currentSakCount,
  onCancel,
  onConfirm,
}: {
  currentSakCount: number;
  onCancel: () => void;
  onConfirm: (count: number, beratPerSak: number) => void;
}) {
  const [jumlah, setJumlah] = useState("");
  const [berat, setBerat] = useState("");
  const [jumlahError, setJumlahError] = useState<string | null>(null);
  const [beratError, setBeratError] = useState<string | null>(null);

  const count = parseInt(jumlah, 10) || 0;
  const perSak = parseFloat(berat.replace(",", ".")) || 0;
  const preview = count > 0 && perSak > 0;
  const nextNo = currentSakCount + 1;

  function confirm() {
    const c = parseInt(jumlah, 10);
    const b = parseFloat(berat.replace(",", "."));
    const cOk = Number.isFinite(c) && c > 0;
    const bOk = Number.isFinite(b) && b > 0;
    setJumlahError(cOk ? null : "Masukkan jumlah sak yang valid");
    setBeratError(bOk ? null : "Masukkan berat yang valid");
    if (!cOk || !bOk) return;
    onConfirm(c, b);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span
            className="rounded-xl p-2"
            style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
          >
            <PlaylistAddIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-[#1A1D23]">
              Tambah Sak Massal
            </p>
            <p className="text-[11px] text-gray-500">Buat banyak sak sekaligus</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Jumlah Sak
            </span>
            <input
              autoFocus
              inputMode="numeric"
              value={jumlah}
              onChange={(e) => {
                setJumlah(e.target.value.replace(/[^0-9]/g, ""));
                setJumlahError(null);
              }}
              placeholder="contoh: 20"
              className="h-11 w-full rounded-xl border bg-[#F8F9FB] px-3 text-sm outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
              style={{ borderColor: jumlahError ? "#F87171" : BORDER }}
            />
            {jumlahError && (
              <span className="mt-1 block text-[11px] text-red-600">
                {jumlahError}
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Berat per Sak (kg)
            </span>
            <input
              inputMode="decimal"
              value={berat}
              onChange={(e) => {
                setBerat(e.target.value.replace(/[^0-9.]/g, ""));
                setBeratError(null);
              }}
              placeholder="contoh: 10"
              className="h-11 w-full rounded-xl border bg-[#F8F9FB] px-3 text-sm outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
              style={{ borderColor: beratError ? "#F87171" : BORDER }}
            />
            {beratError && (
              <span className="mt-1 block text-[11px] text-red-600">
                {beratError}
              </span>
            )}
          </label>

          {preview && (
            <div
              className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-[#1A1D23]"
            >
              <span className="font-bold text-[#0A7349]">{count} sak</span> akan
              dibuat (No.{" "}
              <span className="font-bold">
                {nextNo}–{nextNo + count - 1}
              </span>
              ), masing-masing{" "}
              <span className="font-bold text-[#0A7349]">
                {formatNum(perSak, 2)} kg
              </span>{" "}
              <span className="text-gray-500">
                • Total {formatNum(count * perSak, 2)} kg
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: GREEN }}
          >
            Buat Sak
          </button>
        </div>
      </div>
    </div>
  );
}

function stripNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value
    .toFixed(3)
    .replace(/\.?0+$/, "");
}
