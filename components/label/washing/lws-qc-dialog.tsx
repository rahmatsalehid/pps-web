"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LwsHeader, LwsSavePayload } from "@/services/label-washing-service";
import { LwsScienceIcon } from "./lws-icons";

type Props = {
  header: LwsHeader;
  onClose: () => void;
  onSubmit: (
    header: LwsSavePayload["header"],
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function Field({
  label,
  suffix,
  children,
  error,
}: {
  label: string;
  suffix: string;
  children: ReactNode;
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

function parseDec(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = raw.trim().replace(",", ".");
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Angka tidak valid" };
  if (n < 0) return { ok: false, error: "Tidak boleh negatif" };
  return { ok: true, value: n };
}

function toText(v: number | null): string {
  return v == null ? "" : v.toFixed(3);
}

export function LwsQcDialog({ header, onClose, onSubmit }: Props) {
  const [d1, setD1] = useState(() => toText(header.Density));
  const [d2, setD2] = useState(() => toText(header.Density2));
  const [d3, setD3] = useState(() => toText(header.Density3));
  const [m1, setM1] = useState(() => toText(header.Moisture));
  const [m2, setM2] = useState(() => toText(header.Moisture2));
  const [m3, setM3] = useState(() => toText(header.Moisture3));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    const fields = {
      d1: parseDec(d1),
      d2: parseDec(d2),
      d3: parseDec(d3),
      m1: parseDec(m1),
      m2: parseDec(m2),
      m3: parseDec(m3),
    } as const;
    for (const [k, r] of Object.entries(fields)) {
      if (!r.ok) next[k] = r.error;
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await onSubmit({
      Density: fields.d1.ok ? fields.d1.value : null,
      Density2: fields.d2.ok ? fields.d2.value : null,
      Density3: fields.d3.ok ? fields.d3.value : null,
      Moisture: fields.m1.ok ? fields.m1.value : null,
      Moisture2: fields.m2.ok ? fields.m2.value : null,
      Moisture3: fields.m3.ok ? fields.m3.value : null,
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
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-[#EBECF0] bg-[#E9F6F5] px-5 py-3.5">
          <span className="rounded-lg bg-white/70 p-2 text-[#00897B]">
            <LwsScienceIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-[#172B4D]">Quality Control</p>
            <p className="truncate text-[12px] font-semibold text-[#44546F]">{header.NoWashing}</p>
          </div>
        </div>

        <div className="max-h-[calc(90vh-140px)] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.3px] text-[#44546F]">
              Density
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Density 1" suffix="g/cm3" error={errors.d1}>
                <input value={d1} onChange={(e) => setD1(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <Field label="Density 2" suffix="g/cm3" error={errors.d2}>
                <input value={d2} onChange={(e) => setD2(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <Field label="Density 3" suffix="g/cm3" error={errors.d3}>
                <input value={d3} onChange={(e) => setD3(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
            </div>
          </div>

          <div className="h-px bg-[#EBECF0]" />

          <div>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.3px] text-[#44546F]">
              Moisture
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Moisture 1" suffix="g/cm3" error={errors.m1}>
                <input value={m1} onChange={(e) => setM1(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <Field label="Moisture 2" suffix="g/cm3" error={errors.m2}>
                <input value={m2} onChange={(e) => setM2(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <Field label="Moisture 3" suffix="g/cm3" error={errors.m3}>
                <input value={m3} onChange={(e) => setM3(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
            </div>
          </div>

          {errors.form && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
              {errors.form}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EBECF0] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#DCDFE4] px-4 py-2.5 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F4F5F7] disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1565C0] px-5 py-2.5 text-[13px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
            SIMPAN
          </button>
        </div>
      </form>
    </div>
  );
}
