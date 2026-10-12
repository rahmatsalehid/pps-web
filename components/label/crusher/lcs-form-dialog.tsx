"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type {
  LcsHeader,
  LcsJenis,
  LcsOutputItem,
  LcsProcessOption,
} from "@/services/label-crusher-service";
import { fromYmd, toYmd } from "./lcs-format";
import { LcsOutputPanel } from "./lcs-output-panel";
import { LcsWeightIcon } from "./lcs-icons";

type Props = {
  header: LcsHeader | null;
  jenis: LcsJenis[];
  fetchingJenis: boolean;
  onClose: () => void;
  fetchProduksiOptions: (tanggal: string) => Promise<
    { ok: true; options: LcsProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (noProduksi: string) => Promise<
    { ok: true; outputs: LcsOutputItem[] } | { ok: false; error: string }
  >;
  onSubmitCreate: (args: {
    idCrusher: number;
    dateCreate: string;
    berat: number;
    processedCode: string | null;
  }) => Promise<{ ok: true; noCrusher: string | null } | { ok: false; error: string }>;
  onSubmitUpdate: (args: {
    noCrusher: string;
    dateCreate: string;
    idCrusher: number;
    berat: number;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

function parseBerat(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return { ok: false, error: "Berat wajib diisi." };
  if (!/^\d*\.?\d{0,3}$/.test(s)) return { ok: false, error: "Format berat tidak valid." };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Format berat tidak valid." };
  if (n <= 0) return { ok: false, error: "Berat harus > 0." };
  return { ok: true, value: n };
}

export function LcsFormDialog({
  header,
  jenis,
  fetchingJenis,
  onClose,
  fetchProduksiOptions,
  fetchOutputs,
  onSubmitCreate,
  onSubmitUpdate,
}: Props) {
  const isEdit = header != null;

  const initialDate = (() => {
    if (header?.DateCreate) {
      const d = fromYmd(header.DateCreate);
      if (d) return d;
    }
    return new Date();
  })();

  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [idCrusher, setIdCrusher] = useState<string>(
    header && header.IdCrusher ? String(header.IdCrusher) : "",
  );
  const [berat, setBerat] = useState(header?.Berat != null ? String(header.Berat) : "");
  const [noProduksi, setNoProduksi] = useState(() => (header?.CrusherNoProduksi ?? "").trim());

  const [options, setOptions] = useState<LcsProcessOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LcsOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);

  const [errors, setErrors] = useState<{
    noProduksi?: string;
    jenis?: string;
    berat?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preselectCode = (header?.CrusherNoProduksi ?? "").trim();

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    void (async () => {
      setLoadingOptions(true);
      const res = await fetchProduksiOptions(dateYmd);
      setLoadingOptions(false);
      if (cancelled) return;
      if (res.ok) {
        setOptions(res.options);
        setNoProduksi((prev) =>
          prev && res.options.some((o) => o.noProduksi === prev) ? prev : "",
        );
      } else {
        setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, dateYmd, fetchProduksiOptions]);

  useEffect(() => {
    if (!noProduksi) return;
    let cancelled = false;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs(noProduksi);
      setLoadingOutputs(false);
      if (cancelled) return;
      setOutputs(res.ok ? res.outputs : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [noProduksi, fetchOutputs]);

  const selectProduksi = useCallback((code: string) => {
    setNoProduksi(code);
    setOutputs([]);
    setErrors((e) => ({ ...e, noProduksi: undefined }));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};

    const rBerat = parseBerat(berat);
    if (!rBerat.ok) next.berat = rBerat.error;
    if (!idCrusher) next.jenis = "Wajib pilih jenis crusher";
    if (!isEdit && !noProduksi.trim()) next.noProduksi = "Pilih Nomor Proses Crusher";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);

    if (isEdit) {
      const res = await onSubmitUpdate({
        noCrusher: header.NoCrusher,
        dateCreate: dateYmd,
        idCrusher: Number(idCrusher),
        berat: rBerat.ok ? rBerat.value : 0,
      });
      setBusy(false);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      onClose();
      return;
    }

    const res = await onSubmitCreate({
      idCrusher: Number(idCrusher),
      dateCreate: dateYmd,
      berat: rBerat.ok ? rBerat.value : 0,
      processedCode: noProduksi.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
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
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[#EBECF0] px-5 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={
              isEdit
                ? { backgroundColor: "rgba(245,124,0,0.12)", color: "#E65100" }
                : { backgroundColor: "rgba(0,137,123,0.12)", color: "#00897B" }
            }
          >
            <LcsWeightIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label" : "Tambah Label Baru"}
            </p>
            {isEdit && (
              <p className="truncate text-[12px] font-semibold text-[#6B778C]">
                {header.NoCrusher}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Date Created
              </span>
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                disabled={busy}
                className={inputCls}
              />
            </label>

            {!isEdit && (
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  No. Proses Crusher
                </span>
                <select
                  value={noProduksi}
                  onChange={(e) => selectProduksi(e.target.value)}
                  disabled={loadingOptions || busy}
                  className={inputCls}
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat daftar produksi…"
                      : "Pilih Nomor Proses Crusher"}
                  </option>
                  {options.map((o) => (
                    <option key={o.noProduksi} value={o.noProduksi}>
                      {o.noProduksi} — {o.namaMesin || "-"}
                    </option>
                  ))}
                </select>
                {errors.noProduksi && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.noProduksi}
                  </span>
                )}
              </label>
            )}

            {isEdit && (
              <div
                className="rounded-lg border border-[#EBECF0] px-3 py-2.5"
                style={{ backgroundColor: "#F7F8F9" }}
              >
                <p className="text-[11px] font-semibold text-[#6B778C]">Proses</p>
                <p className="text-[13px] font-semibold text-[#172B4D]">
                  {preselectCode || "-"}
                </p>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Jenis Crusher
              </span>
              <select
                value={idCrusher}
                onChange={(e) => {
                  setIdCrusher(e.target.value);
                  setErrors((x) => ({ ...x, jenis: undefined }));
                }}
                disabled={fetchingJenis || busy}
                className={inputCls}
              >
                <option value="">
                  {fetchingJenis ? "Memuat jenis…" : "Pilih jenis crusher"}
                </option>
                {jenis.map((j) => (
                  <option key={j.IdCrusher} value={String(j.IdCrusher)}>
                    {j.NamaCrusher}
                  </option>
                ))}
              </select>
              {errors.jenis && (
                <span className="mt-1 block text-[11px] font-semibold text-red-600">
                  {errors.jenis}
                </span>
              )}
            </label>

            <label className="block max-w-[280px]">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Berat (kg)
              </span>
              <span className="relative block">
                <input
                  value={berat}
                  onChange={(e) => {
                    setBerat(e.target.value);
                    setErrors((x) => ({ ...x, berat: undefined }));
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  disabled={busy}
                  className={`${inputCls} pr-10`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#6B778C]">
                  kg
                </span>
              </span>
              {errors.berat && (
                <span className="mt-1 block text-[11px] font-semibold text-red-600">
                  {errors.berat}
                </span>
              )}
            </label>

            {formError && (
              <div
                className="rounded-xl border border-red-200 px-3.5 py-2.5"
                style={{ backgroundColor: "#FEF2F2" }}
              >
                <p className="whitespace-pre-line text-[12px] leading-relaxed text-red-700">
                  {formError}
                </p>
              </div>
            )}
          </div>

          <div className="hidden w-px shrink-0 bg-[#E4E6EB] md:block" />

          <div className="flex w-full shrink-0 flex-col md:w-[240px]">
            <div className="min-h-[220px] flex-1">
              <LcsOutputPanel
                title="Output Crusher"
                items={outputs}
                isLoading={loadingOutputs}
                hasSource={noProduksi !== ""}
                noSourceMessage={"Pilih No Proses Crusher\nuntuk melihat output"}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#EBECF0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#DCDFE4] px-5 py-2.5 text-[13px] font-bold text-[#44546F] transition hover:bg-gray-50 disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-55"
            style={{ backgroundColor: isEdit ? "#F57C00" : "#00897B" }}
          >
            {busy && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
            SIMPAN
          </button>
        </div>
      </form>
    </div>
  );
}
