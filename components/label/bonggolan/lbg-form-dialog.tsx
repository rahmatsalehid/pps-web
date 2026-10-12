"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LbgHeader, LbgJenis, LbgOutputItem, LbgProcessOption } from "@/services/label-bonggolan-service";
import { fromYmd, toYmd } from "./lbg-format";
import { LbgOutputPanel } from "./lbg-output-panel";
import { LbgWeightIcon } from "./lbg-icons";

type Props = {
  header: LbgHeader | null;
  jenis: LbgJenis[];
  fetchingJenis: boolean;
  onClose: () => void;
  fetchProduksiOptions: (mode: "broker" | "inject", tanggal: string) => Promise<
    { ok: true; options: LbgProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (mode: "broker" | "inject", noProduksi: string) => Promise<
    { ok: true; outputs: LbgOutputItem[] } | { ok: false; error: string }
  >;
  onSubmitCreate: (args: {
    idBonggolan: number;
    dateCreate: string;
    berat: number;
    processedCode: string | null;
  }) => Promise<{ ok: true; noBonggolan: string | null } | { ok: false; error: string }>;
  onSubmitUpdate: (args: {
    noBonggolan: string;
    dateCreate: string;
    idBonggolan: number;
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

function friendlyBackendError(raw: string): { title: string; message: string } {
  const inputMatch = /Input=(\d+(?:\.\d+)?)\s*kg/i.exec(raw);
  const existingMatch = /OutputExisting=(\d+(?:\.\d+)?)\s*kg/i.exec(raw);
  const newMatch = /OutputBaru=(\d+(?:\.\d+)?)\s*kg/i.exec(raw);
  if (inputMatch && existingMatch && newMatch) {
    const inputKg = inputMatch[1];
    const existingKg = existingMatch[1];
    const newKg = newMatch[1];
    const remaining = (Number(inputKg) ?? 0) - (Number(existingKg) ?? 0);
    return {
      title: "Berat Label Melebihi Input",
      message:
        `Berat label yang ditambahkan (${newKg} kg) melebihi sisa kapasitas input yang tersedia.\n` +
        `• Total berat input    : ${inputKg} kg\n` +
        `• Total output saat ini: ${existingKg} kg\n` +
        `• Sisa kapasitas       : ${remaining.toFixed(0)} kg\n` +
        `• Berat label baru     : ${newKg} kg\n` +
        "Kurangi berat label agar tidak melebihi sisa kapasitas.",
    };
  }
  return { title: "Gagal Menyimpan Label", message: raw };
}

export function LbgFormDialog({
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
  const [mode, setMode] = useState<"broker" | "inject" | null>(() => {
    if (header) {
      if ((header.BrokerNoProduksi ?? "").trim()) return "broker";
      if ((header.InjectNoProduksi ?? "").trim()) return "inject";
      return null;
    }
    return null;
  });
  const [noProduksi, setNoProduksi] = useState(
    () =>
      (header?.BrokerNoProduksi ?? "").trim() ||
      (header?.InjectNoProduksi ?? "").trim(),
  );
  const [idBonggolan, setIdBonggolan] = useState<string>(
    header && header.IdBonggolan ? String(header.IdBonggolan) : "",
  );
  const [berat, setBerat] = useState(header?.Berat != null ? String(header.Berat) : "");

  const [options, setOptions] = useState<LbgProcessOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LbgOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);

  const [errors, setErrors] = useState<{
    mode?: string;
    noProduksi?: string;
    jenis?: string;
    berat?: string;
    form?: string;
  }>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const preselectCode =
    (header?.BrokerNoProduksi ?? "").trim() || (header?.InjectNoProduksi ?? "").trim();

  useEffect(() => {
    if (isEdit || !mode) return;
    let cancelled = false;
    void (async () => {
      setLoadingOptions(true);
      const res = await fetchProduksiOptions(mode, dateYmd);
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
  }, [isEdit, mode, dateYmd, fetchProduksiOptions]);

  useEffect(() => {
    if (isEdit || !mode || !noProduksi) return;
    let cancelled = false;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs(mode, noProduksi);
      setLoadingOutputs(false);
      if (cancelled) return;
      setOutputs(res.ok ? res.outputs : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, mode, noProduksi, fetchOutputs]);

  const selectMode = useCallback((m: "broker" | "inject") => {
    setMode(m);
    setNoProduksi("");
    setOptions([]);
    setOutputs([]);
    setErrors((e) => ({ ...e, mode: undefined, noProduksi: undefined }));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};

    const rBerat = parseBerat(berat);
    if (!rBerat.ok) next.berat = rBerat.error;
    if (!idBonggolan) next.jenis = "Wajib pilih jenis bonggolan";

    if (!isEdit) {
      if (!mode) next.mode = "Pilih salah satu dari Proses Broker atau Inject";
      else if (!noProduksi.trim()) {
        next.noProduksi =
          mode === "broker" ? "Pilih Nomor Proses Broker" : "Pilih Nomor Proses Inject";
      }
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);

    if (isEdit) {
      const res = await onSubmitUpdate({
        noBonggolan: header.NoBonggolan,
        dateCreate: dateYmd,
        idBonggolan: Number(idBonggolan),
        berat: rBerat.ok ? rBerat.value : 0,
      });
      setBusy(false);
      if (!res.ok) {
        setFormError(friendlyBackendError(res.error));
        return;
      }
      onClose();
      return;
    }

    const res = await onSubmitCreate({
      idBonggolan: Number(idBonggolan),
      dateCreate: dateYmd,
      berat: rBerat.ok ? rBerat.value : 0,
      processedCode: mode && noProduksi.trim() ? noProduksi.trim() : null,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(friendlyBackendError(res.error));
      return;
    }
    onClose();
  }

  const outputSourceMessage =
    mode === "broker"
      ? "Pilih No Produksi Broker\nuntuk melihat output"
      : mode === "inject"
        ? "Pilih No Produksi Inject\nuntuk melihat output"
        : "Pilih sumber\nuntuk melihat output";

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
            <LbgWeightIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label" : "Tambah Label Baru"}
            </p>
            {isEdit && (
              <p className="truncate text-[12px] font-semibold text-[#6B778C]">
                {header.NoBonggolan}
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
              <div className="space-y-3">
                <span className="block text-[13px] font-semibold text-[#44546F]">Sumber Proses</span>
                <div className="flex flex-wrap items-center gap-4">
                  {(["broker", "inject"] as const).map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#172B4D]">
                      <input
                        type="radio"
                        name="lbg-mode"
                        checked={mode === m}
                        onChange={() => selectMode(m)}
                        disabled={busy}
                        className="h-4 w-4 accent-[#00897B]"
                      />
                      {m === "broker" ? "Proses Broker" : "Inject"}
                    </label>
                  ))}
                </div>
                {errors.mode && (
                  <p className="text-[11px] font-semibold text-red-600">{errors.mode}</p>
                )}
                <label className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                    No. Produksi
                  </span>
                  <select
                    value={noProduksi}
                    onChange={(e) => {
                      setNoProduksi(e.target.value);
                      setOutputs([]);
                      setErrors((x) => ({ ...x, noProduksi: undefined }));
                    }}
                    disabled={!mode || loadingOptions || busy}
                    className={inputCls}
                  >
                    <option value="">
                      {loadingOptions
                        ? "Memuat daftar produksi…"
                        : !mode
                          ? "Pilih sumber terlebih dahulu"
                          : "Pilih No. Produksi"}
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
              </div>
            )}

            {isEdit && (
              <div className="rounded-lg border border-[#EBECF0] px-3 py-2.5" style={{ backgroundColor: "#F7F8F9" }}>
                <p className="text-[11px] font-semibold text-[#6B778C]">Proses</p>
                <p className="text-[13px] font-semibold text-[#172B4D]">
                  {preselectCode || "-"}
                </p>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Jenis Bonggolan
              </span>
              <select
                value={idBonggolan}
                onChange={(e) => {
                  setIdBonggolan(e.target.value);
                  setErrors((x) => ({ ...x, jenis: undefined }));
                }}
                disabled={fetchingJenis || busy}
                className={inputCls}
              >
                <option value="">
                  {fetchingJenis ? "Memuat jenis…" : "Pilih jenis bonggolan"}
                </option>
                {jenis.map((j) => (
                  <option key={j.IdBonggolan} value={String(j.IdBonggolan)}>
                    {j.NamaBonggolan}
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
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">Berat (kg)</span>
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
                <p className="text-[13px] font-bold text-red-800">{formError.title}</p>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-red-700">
                  {formError.message}
                </p>
              </div>
            )}
          </div>

          <div className="hidden w-px shrink-0 bg-[#E4E6EB] md:block" />

          <div className="flex w-full shrink-0 flex-col md:w-[240px]">
            <div className="min-h-[220px] flex-1">
              <LbgOutputPanel
                title="Output Bonggolan"
                items={outputs}
                isLoading={loadingOutputs}
                hasSource={isEdit ? preselectCode !== "" : noProduksi !== ""}
                noSourceMessage={outputSourceMessage}
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
