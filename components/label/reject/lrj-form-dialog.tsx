"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  lrjJenisLabel,
  lrjModeLabel,
  lrjModePrefix,
  type LrjHeader,
  type LrjJenis,
  type LrjMode,
  type LrjOutputItem,
  type LrjProcessOption,
  type LrjSavePayload,
} from "@/services/label-reject-service";
import { fromYmd, toYmd } from "./lrj-format";
import { LrjOutputPanel } from "./lrj-output-panel";
import { LrjLoaderIcon } from "./lrj-icons";

type Props = {
  header: LrjHeader | null;
  jenis: LrjJenis[];
  onClose: () => void;
  fetchProduksiOptions: (args: {
    tanggal: string;
    mode: LrjMode;
  }) => Promise<
    { ok: true; options: LrjProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (args: {
    noCode: string;
    mode: LrjMode;
  }) => Promise<{ ok: true; outputs: LrjOutputItem[] } | { ok: false; error: string }>;
  onSubmitCreate: (
    payload: LrjSavePayload,
  ) => Promise<
    { ok: true; noReject: string | null; count: number } | { ok: false; error: string }
  >;
  onSubmitUpdate: (args: {
    noReject: string;
    payload: LrjSavePayload;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

function detectMode(header: LrjHeader): LrjMode {
  const type = (header.OutputType ?? "").trim().toUpperCase();
  const code = (header.OutputCode ?? "").trim();
  if (type === "INJECT" || code.startsWith("S.")) return "inject";
  if (type === "HOT_STAMPING" || code.startsWith("BH.")) return "hotStamping";
  if (type === "PASANG_KUNCI" || code.startsWith("BI.")) return "pasangKunci";
  if (type === "SPANNER" || code.startsWith("BJ.")) return "spanner";
  return "bjSortir";
}

const MODE_OPTIONS: { value: LrjMode; label: string }[] = [
  { value: "inject", label: "Inject (S.)" },
  { value: "hotStamping", label: "Hot Stamping (BH.)" },
  { value: "pasangKunci", label: "Pasang Kunci (BI.)" },
  { value: "spanner", label: "Spanner (BJ.)" },
  { value: "bjSortir", label: "BJ Sortir (J.)" },
];

export function LrjFormDialog({
  header,
  jenis,
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

  const [mode, setMode] = useState<LrjMode>(() =>
    isEdit && header ? detectMode(header) : "inject",
  );
  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [code, setCode] = useState(() => (header?.OutputCode ?? "").trim());
  const [idReject, setIdReject] = useState<string>(
    header && header.IdReject ? String(header.IdReject) : "",
  );
  const [berat, setBerat] = useState(() =>
    header?.Berat != null ? String(header.Berat) : "",
  );

  const [options, setOptions] = useState<LrjProcessOption[]>(() =>
    isEdit && header?.OutputCode
      ? [{ code: header.OutputCode, nama: header.OutputNamaMesin ?? "" }]
      : [],
  );
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LrjOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    void (async () => {
      setLoadingOptions(true);
      const res = await fetchProduksiOptions({ tanggal: dateYmd, mode });
      setLoadingOptions(false);
      if (cancelled) return;
      if (res.ok) {
        setOptions(res.options);
        setCode((prev) => (prev && res.options.some((o) => o.code === prev) ? prev : ""));
      } else {
        setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, dateYmd, mode, fetchProduksiOptions]);

  useEffect(() => {
    let cancelled = false;
    if (!code) return;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs({ noCode: code, mode });
      setLoadingOutputs(false);
      if (cancelled) return;
      setOutputs(res.ok ? res.outputs : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, mode, fetchOutputs]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!isEdit && !code.trim()) {
      next.code = `Nomor label sumber (${lrjModePrefix(mode)}...) belum diisi.`;
    }

    if (!idReject) {
      next.idReject = "Wajib pilih jenis Reject.";
    }

    const beratRaw = berat.trim().replace(",", ".");
    if (beratRaw) {
      const beratNum = Number(beratRaw);
      if (!Number.isFinite(beratNum) || beratNum <= 0) {
        next.berat = "Berat harus > 0.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): LrjSavePayload => {
    const headerPayload: NonNullable<LrjSavePayload["header"]> = {};
    headerPayload.DateCreate = dateYmd;
    headerPayload.IdReject = Number(idReject);
    const beratRaw = berat.trim().replace(",", ".");
    if (beratRaw) headerPayload.Berat = Number(beratRaw);
    const payload: LrjSavePayload = { header: headerPayload };
    if (!isEdit) {
      payload.outputCode = code.trim();
    }
    return payload;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload = buildPayload();
    setBusy(true);
    const res = isEdit
      ? await onSubmitUpdate({ noReject: header!.NoReject, payload })
      : await onSubmitCreate(payload);
    setBusy(false);

    if (!res.ok) {
      setFormError({
        title: isEdit ? "Gagal Menyimpan" : "Gagal Membuat Label",
        message: res.error,
      });
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#E2E6EA] px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label Reject" : "Buat Label Reject"}
            </p>
            {isEdit && header && (
              <p className="mt-0.5 text-[12px] font-semibold text-[#44546F]">
                {header.NoReject} — sumber {header.OutputCode ?? "-"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#DCDFE4] px-3 py-1.5 text-[12px] font-bold text-[#44546F] transition hover:bg-[#F7F8F9]"
          >
            BATAL
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {!isEdit && (
              <fieldset className="rounded-xl border border-[#E2E6EA] bg-[#F7F8F9] p-3">
                <legend className="px-1 text-[12px] font-bold uppercase tracking-wide text-[#44546F]">
                  Proses Sumber
                </legend>
                <div className="flex flex-wrap gap-2">
                  {MODE_OPTIONS.map((m) => (
                    <label
                      key={m.value}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-bold transition ${
                        mode === m.value
                          ? "border-[#C9372C] bg-[#FEF2F2] text-[#C9372C]"
                          : "border-[#DCDFE4] bg-white text-[#44546F] hover:bg-[#F7F8F9]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="lrjMode"
                        value={m.value}
                        checked={mode === m.value}
                        onChange={() => {
                          setMode(m.value);
                          setCode("");
                          setErrors({});
                        }}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-bold text-[#44546F]">
                Date Created
                <input
                  type="date"
                  value={dateYmd}
                  onChange={(e) => setDateYmd(e.target.value)}
                  disabled={isEdit}
                  className={`${inputCls} mt-1`}
                />
              </label>

              <label className="block text-[12px] font-bold text-[#44546F]">
                {isEdit ? "Sumber" : `Nomor ${lrjModeLabel(mode)}`}
                <select
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isEdit}
                  className={`${inputCls} mt-1`}
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat…"
                      : isEdit
                        ? (header?.OutputCode ?? "-")
                        : "Pilih nomor sumber…"}
                  </option>
                  {options.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.code}
                      {o.nama && o.nama !== o.code ? ` — ${o.nama}` : ""}
                    </option>
                  ))}
                  {isEdit && header?.OutputCode && (
                    <option value={header.OutputCode}>
                      {header.OutputCode}
                      {header.OutputNamaMesin ? ` — ${header.OutputNamaMesin}` : ""}
                    </option>
                  )}
                </select>
                {errors.code && (
                  <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                    {errors.code}
                  </span>
                )}
              </label>
            </div>

            <label className="block text-[12px] font-bold text-[#44546F]">
              Jenis Reject
              <select
                value={idReject}
                onChange={(e) => setIdReject(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                <option value="">Pilih jenis Reject…</option>
                {jenis.map((j) => (
                  <option key={j.IdReject} value={String(j.IdReject)}>
                    {lrjJenisLabel(j)}
                  </option>
                ))}
              </select>
              {errors.idReject && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.idReject}
                </span>
              )}
            </label>

            <label className="block max-w-xs text-[12px] font-bold text-[#44546F]">
              Berat (kg) — opsional
              <input
                value={berat}
                onChange={(e) => setBerat(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={`${inputCls} mt-1`}
              />
              {errors.berat && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.berat}
                </span>
              )}
            </label>

            {formError && (
              <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2.5">
                <p className="text-[13px] font-bold text-[#7F1D1D]">{formError.title}</p>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-[#7F1D1D]">
                  {formError.message}
                </p>
              </div>
            )}
          </div>

          <div>
            <LrjOutputPanel
              items={outputs}
              loading={loadingOutputs}
              hasSource={code.trim() !== ""}
            />
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-[#E2E6EA] px-5 py-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCDFE4] bg-white px-4 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F7F8F9] disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-[#C9372C] px-5 text-[13px] font-bold text-white transition hover:bg-[#AE2E24] disabled:opacity-50"
          >
            {busy && <LrjLoaderIcon width={14} height={14} />}
            {busy ? "Menyimpan…" : "SIMPAN"}
          </button>
        </footer>
      </form>
    </div>
  );
}
