"use client";

import { useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LbPallet, LbQcHeader } from "@/services/label-bahan-baku-service";
import { LbScienceIcon } from "./lb-icons";

type Props = {
  pallet: LbPallet;
  onClose: () => void;
  onSubmit: (header: LbQcHeader) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function normTenggelam(v: number | null): string {
  if (v == null) return "";
  if (Math.abs(v - 5) < 1e-9 || Math.abs(v - 0.05) < 1e-9) return "5";
  if (Math.abs(v - 10) < 1e-9 || Math.abs(v - 0.1) < 1e-9) return "10";
  return "";
}

function normDensity(v: number | null): string {
  return v == null ? "" : v.toFixed(3);
}

function parseDensity(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = raw.trim().replace(",", ".");
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Angka tidak valid" };
  if (n < 0) return { ok: false, error: "Tidak boleh negatif" };
  return { ok: true, value: n };
}

function Field({
  label,
  suffix,
  children,
  error,
}: {
  label: string;
  suffix: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">{label}</span>
      <span className="relative block">
        {children}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#6B778C]">
          {suffix}
        </span>
      </span>
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-600">{error}</span>}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 pr-14 text-[15px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white";

export function LbQcDialog({ pallet, onClose, onSubmit }: Props) {
  const [tenggelam, setTenggelam] = useState(() => normTenggelam(pallet.Tenggelam));
  const [d1, setD1] = useState(() => normDensity(pallet.Density));
  const [d2, setD2] = useState(() => normDensity(pallet.Density2));
  const [d3, setD3] = useState(() => normDensity(pallet.Density3));
  const [errors, setErrors] = useState<{
    tenggelam?: string;
    d1?: string;
    d2?: string;
    d3?: string;
    form?: string;
  }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!tenggelam) next.tenggelam = "Pilih tenggelam";
    const r1 = parseDensity(d1);
    const r2 = parseDensity(d2);
    const r3 = parseDensity(d3);
    if (!r1.ok) next.d1 = r1.error;
    if (!r2.ok) next.d2 = r2.error;
    if (!r3.ok) next.d3 = r3.error;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await onSubmit({
      IdJenisPlastik: pallet.IdJenisPlastik ?? null,
      IdWarehouse: pallet.IdWarehouse ?? null,
      IdStatus: pallet.IdStatus ?? null,
      Keterangan: pallet.Keterangan ?? "",
      Tenggelam: Number(tenggelam),
      Density: r1.ok ? r1.value : null,
      Density2: r2.ok ? r2.value : null,
      Density3: r3.ok ? r3.value : null,
      Moisture: pallet.Moisture ?? null,
      MeltingIndex: pallet.MeltingIndex ?? null,
      Elasticity: pallet.Elasticity ?? null,
    });
    setBusy(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#DCDFE4] bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[#DCDFE4] bg-[#E9F2FF] px-4 py-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border text-[#1565C0]"
            style={{
              backgroundColor: "rgba(21,101,192,0.12)",
              borderColor: "rgba(21,101,192,0.24)",
            }}
          >
            <LbScienceIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-bold leading-tight text-[#172B4D]">Quality Control</p>
            <p className="text-[13px] font-semibold text-[#44546F]">= {pallet.NoPallet}</p>
          </div>
        </div>

        <div className="p-4">
          {errors.form && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
              {errors.form}
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#172B4D]">
            <LbScienceIcon className="h-4 w-4 text-[#1565C0]" />
            QC Bahan Baku
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Tenggelam" suffix="%" error={errors.tenggelam}>
              <select
                value={tenggelam}
                onChange={(e) => setTenggelam(e.target.value)}
                className={`${inputCls} appearance-none pr-14`}
              >
                <option value="">Pilih tenggelam</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </Field>
            <Field label="Density 1" suffix="g/cm3" error={errors.d1}>
              <input
                inputMode="decimal"
                value={d1}
                onChange={(e) => setD1(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0.000"
                className={inputCls}
              />
            </Field>
            <Field label="Density 2" suffix="g/cm3" error={errors.d2}>
              <input
                inputMode="decimal"
                value={d2}
                onChange={(e) => setD2(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0.000"
                className={inputCls}
              />
            </Field>
            <Field label="Density 3" suffix="g/cm3" error={errors.d3}>
              <input
                inputMode="decimal"
                value={d3}
                onChange={(e) => setD3(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0.000"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EBECF0] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[#DCDFE4] px-4 py-2 text-[13px] font-semibold text-[#44546F] hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#1565C0" }}
          >
            {busy && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
            Simpan QC
          </button>
        </div>
      </form>
    </div>
  );
}
