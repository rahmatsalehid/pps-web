"use client";

import { useEffect, useState, type FormEvent } from "react";
import type {
  LpkHeader,
  LpkJenis,
  LpkMode,
  LpkOutputItem,
  LpkProcessOption,
  LpkSavePayload,
} from "@/services/label-packing-service";
import { fromYmd, toYmd } from "./lpk-format";
import { LpkOutputPanel } from "./lpk-output-panel";
import { LpkLoaderIcon } from "./lpk-icons";

type Props = {
  header: LpkHeader | null;
  jenis: LpkJenis[];
  onClose: () => void;
  fetchProduksiOptions: (args: {
    tanggal: string;
    mode: LpkMode;
  }) => Promise<
    { ok: true; options: LpkProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (args: {
    noCode: string;
    mode: LpkMode;
  }) => Promise<{ ok: true; outputs: LpkOutputItem[] } | { ok: false; error: string }>;
  fetchInjectPackingInfo: (
    noProduksi: string,
  ) => Promise<
    | {
        ok: true;
        info: { beratProdukHasilTimbang: number | null; items: LpkJenis[] };
      }
    | { ok: false; error: string }
  >;
  onSubmitCreate: (
    payload: LpkSavePayload,
  ) => Promise<
    { ok: true; noBJ: string | null; count: number } | { ok: false; error: string }
  >;
  onSubmitUpdate: (args: {
    noBJ: string;
    payload: LpkSavePayload;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

function detectMode(header: LpkHeader): LpkMode {
  const type = (header.OutputType ?? "").trim().toUpperCase();
  const code = (header.OutputCode ?? "").trim();
  if (type === "INJECT" || code.startsWith("S.")) return "inject";
  if (type === "RETUR" || code.startsWith("L.")) return "retur";
  return "packing";
}

function computeAutoBerat(pcsRaw: string, totalBerat: number | null): string {
  if (totalBerat == null || totalBerat <= 0) return "";
  const raw = pcsRaw.trim().replace(",", ".");
  if (!raw) return "";
  const pcsNum = Number(raw);
  if (!Number.isFinite(pcsNum) || pcsNum <= 0) return "";
  return ((pcsNum / 1000) * totalBerat).toFixed(2);
}

export function LpkFormDialog({
  header,
  jenis,
  onClose,
  fetchProduksiOptions,
  fetchOutputs,
  fetchInjectPackingInfo,
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

  const [mode, setMode] = useState<LpkMode>(() =>
    isEdit && header ? detectMode(header) : "packing",
  );
  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [code, setCode] = useState(() => (header?.OutputCode ?? "").trim());
  const [idBJ, setIdBJ] = useState<string>(
    header && header.IdBJ ? String(header.IdBJ) : "",
  );
  const [pcs, setPcs] = useState(() =>
    header?.Pcs != null ? String(header.Pcs) : "",
  );
  const [beratManual, setBeratManual] = useState(() =>
    header?.Berat != null ? String(header.Berat) : "",
  );
  const [blok, setBlok] = useState(() => header?.Blok ?? "");
  const [idLokasi, setIdLokasi] = useState(() => header?.IdLokasi ?? "");

  const [options, setOptions] = useState<LpkProcessOption[]>(() =>
    isEdit && header?.OutputCode
      ? [{ code: header.OutputCode, nama: header.OutputNamaMesin ?? "" }]
      : [],
  );
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LpkOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [injectBerat, setInjectBerat] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const isBeratAuto = mode === "inject" && !isEdit;
  const berat = isBeratAuto ? computeAutoBerat(pcs, injectBerat) : beratManual;

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
    if (mode !== "inject" || !code) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchInjectPackingInfo(code);
      if (cancelled || !res.ok) return;
      setInjectBerat(res.info.beratProdukHasilTimbang);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, code, fetchInjectPackingInfo]);

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
      next.code = `Nomor label sumber (${mode === "packing" ? "BD." : mode === "inject" ? "S." : "L."}...) belum diisi.`;
    }

    const pcsRaw = pcs.trim().replace(",", ".");
    if (!pcsRaw) {
      next.pcs = "PCS wajib diisi.";
    } else {
      const pcsNum = Number(pcsRaw);
      if (!Number.isFinite(pcsNum) || pcsNum <= 0) {
        next.pcs = "PCS harus > 0.";
      }
    }

    if (!isBeratAuto) {
      const beratRaw = berat.trim().replace(",", ".");
      if (beratRaw) {
        const beratNum = Number(beratRaw);
        if (!Number.isFinite(beratNum) || beratNum <= 0) {
          next.berat = "Berat harus > 0.";
        }
      }
    }

    if (mode !== "inject" && !isEdit && !idBJ) {
      next.idBJ = "Wajib pilih jenis Packing.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): LpkSavePayload => {
    const headerPayload: NonNullable<LpkSavePayload["header"]> = {};

    const pcsRaw = pcs.trim().replace(",", ".");
    if (pcsRaw) headerPayload.Pcs = Number(pcsRaw);

    const beratRaw = berat.trim().replace(",", ".");
    if (beratRaw) headerPayload.Berat = Number(beratRaw);

    headerPayload.DateCreate = dateYmd;

    if (idBJ) {
      headerPayload.IdBJ = Number(idBJ);
    }

    if (blok.trim()) headerPayload.Blok = blok.trim();
    if (idLokasi.trim()) headerPayload.IdLokasi = idLokasi.trim();

    const payload: LpkSavePayload = { header: headerPayload };
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
      ? await onSubmitUpdate({ noBJ: header!.NoBJ, payload })
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

  const modeLabel =
    mode === "packing" ? "Packing (BD.)" : mode === "inject" ? "Inject (S.)" : "Retur (L.)";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#E2E6EA] px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label Barang Jadi" : "Buat Label Barang Jadi"}
            </p>
            {isEdit && header && (
              <p className="mt-0.5 text-[12px] font-semibold text-[#44546F]">
                {header.NoBJ} — sumber {header.OutputCode ?? "-"}
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
                  {[
                    { value: "packing" as LpkMode, label: "Packing (BD.)" },
                    { value: "inject" as LpkMode, label: "Inject (S.)" },
                    { value: "retur" as LpkMode, label: "Retur (L.)" },
                  ].map((m) => (
                    <label
                      key={m.value}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-bold transition ${
                        mode === m.value
                          ? "border-[#0C66E4] bg-[#E9F2FF] text-[#0C66E4]"
                          : "border-[#DCDFE4] bg-white text-[#44546F] hover:bg-[#F7F8F9]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="lpkMode"
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
                {isEdit ? "Sumber" : `Nomor ${modeLabel}`}
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
                      {o.nama ? ` — ${o.nama}` : ""}
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

            {!(mode === "inject" && !isEdit) && (
              <label className="block text-[12px] font-bold text-[#44546F]">
                Jenis Packing
                <select
                  value={idBJ}
                  onChange={(e) => setIdBJ(e.target.value)}
                  disabled={isEdit && mode === "inject"}
                  className={`${inputCls} mt-1`}
                >
                  <option value="">Pilih jenis Packing…</option>
                  {jenis.map((j) => (
                    <option key={j.IdBJ} value={String(j.IdBJ)}>
                      {j.NamaBJ}
                    </option>
                  ))}
                </select>
                {errors.idBJ && (
                  <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                    {errors.idBJ}
                  </span>
                )}
              </label>
            )}

            {mode === "inject" && !isEdit && (
              <div className="rounded-lg border border-[#B3E5FC] bg-[#E1F5FE] px-3 py-2 text-[12px] font-semibold text-[#01579B]">
                Mode Inject: jenis Packing mengikuti mapping output inject. Berat dihitung
                otomatis dari PCS × Berat Produk Hasil Timbang / 1000
                {injectBerat != null ? ` (${injectBerat} kg)` : ""}.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-bold text-[#44546F]">
                PCS
                <input
                  value={pcs}
                  onChange={(e) => setPcs(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className={`${inputCls} mt-1`}
                />
                {errors.pcs && (
                  <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                    {errors.pcs}
                  </span>
                )}
              </label>
              <label className="block text-[12px] font-bold text-[#44546F]">
                Berat (kg)
                <input
                  value={berat}
                  onChange={(e) => setBeratManual(e.target.value)}
                  inputMode="decimal"
                  disabled={isBeratAuto}
                  placeholder={isBeratAuto ? "Auto dari PCS & Inject" : "0"}
                  className={`${inputCls} mt-1`}
                />
                {errors.berat && (
                  <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                    {errors.berat}
                  </span>
                )}
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-bold text-[#44546F]">
                Blok
                <input
                  value={blok}
                  onChange={(e) => setBlok(e.target.value)}
                  placeholder="Opsional"
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block text-[12px] font-bold text-[#44546F]">
                Id Lokasi
                <input
                  value={idLokasi}
                  onChange={(e) => setIdLokasi(e.target.value)}
                  placeholder="Opsional"
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>

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
            <LpkOutputPanel
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
            className="flex h-10 items-center gap-1.5 rounded-lg bg-[#00897B] px-5 text-[13px] font-bold text-white transition hover:bg-[#00796B] disabled:opacity-50"
          >
            {busy && <LpkLoaderIcon width={14} height={14} />}
            {busy ? "Menyimpan…" : "SIMPAN"}
          </button>
        </footer>
      </form>
    </div>
  );
}
