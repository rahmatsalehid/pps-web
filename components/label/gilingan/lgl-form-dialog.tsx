"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  glgProduksiOptionLabel,
  type LglHeader,
  type LglJenis,
  type LglOutputItem,
  type LglProduksiOption,
  type LglSavePayload,
} from "@/services/label-gilingan-service";
import { fromYmd, toYmd } from "./lgl-format";
import { LglOutputPanel } from "./lgl-output-panel";
import { LglLoaderIcon } from "./lgl-icons";

type Props = {
  header: LglHeader | null;
  jenis: LglJenis[];
  onClose: () => void;
  fetchProduksiOptions: (
    tanggal: string,
  ) => Promise<
    { ok: true; options: LglProduksiOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (
    noCode: string,
  ) => Promise<{ ok: true; outputs: LglOutputItem[] } | { ok: false; error: string }>;
  onSubmitCreate: (
    payload: LglSavePayload,
  ) => Promise<{ ok: true; noGilingan: string | null } | { ok: false; error: string }>;
  onSubmitUpdate: (args: {
    noGilingan: string;
    payload: LglSavePayload;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

export function LglFormDialog({
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

  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [code, setCode] = useState(() => {
    if (!isEdit || !header) return "";
    return (
      (header.GilinganNoProduksi ?? "").trim() ||
      (header.NoBongkarSusun ?? "").trim() ||
      ""
    );
  });
  const [idGilingan, setIdGilingan] = useState<string>(
    header && header.IdGilingan ? String(header.IdGilingan) : "",
  );
  const [berat, setBerat] = useState(() =>
    header?.Berat != null ? String(header.Berat) : "",
  );

  const [options, setOptions] = useState<LglProduksiOption[]>(() =>
    isEdit && header
      ? [
          {
            code,
            namaMesin: header.GilinganNamaMesin ?? "",
            shift: null,
            hourRange: "",
          },
        ]
      : [],
  );
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LglOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

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
        setCode((prev) => (prev && res.options.some((o) => o.code === prev) ? prev : ""));
      } else {
        setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, dateYmd, fetchProduksiOptions]);

  useEffect(() => {
    let cancelled = false;
    if (!code) return;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs(code);
      setLoadingOutputs(false);
      if (cancelled) return;
      setOutputs(res.ok ? res.outputs : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, fetchOutputs]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!isEdit && !code.trim()) {
      next.code = "Pilih Nomor Produksi Output";
    }

    if (!idGilingan) {
      next.idGilingan = "Wajib pilih jenis gilingan";
    }

    const beratRaw = berat.trim().replace(",", ".");
    if (!beratRaw) {
      next.berat = "Berat wajib diisi.";
    } else {
      const beratNum = Number(beratRaw);
      if (!Number.isFinite(beratNum)) {
        next.berat = "Format berat tidak valid.";
      } else if (beratNum <= 0) {
        next.berat = "Berat harus > 0.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): LglSavePayload => {
    const headerPayload: NonNullable<LglSavePayload["header"]> = {};
    headerPayload.DateCreate = dateYmd;
    headerPayload.IdGilingan = Number(idGilingan);
    headerPayload.Berat = Number(berat.trim().replace(",", "."));
    const payload: LglSavePayload = { header: headerPayload };
    if (!isEdit) {
      headerPayload.IsPartial = 0;
      headerPayload.IdStatus = 1;
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
    if (isEdit) {
      const res = await onSubmitUpdate({ noGilingan: header!.NoGilingan, payload });
      setBusy(false);
      if (!res.ok) {
        setFormError({ title: "Gagal Menyimpan", message: res.error });
        return;
      }
      onClose();
      return;
    }
    const res = await onSubmitCreate(payload);
    setBusy(false);
    if (!res.ok) {
      setFormError({ title: "Gagal Membuat Label", message: res.error });
      return;
    }
    setCreated(res.noGilingan);
  };

  if (created != null) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center gap-3 bg-[#00897B] px-5 py-4">
            <p className="text-[16px] font-bold text-white">Berhasil</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="text-[14px] font-semibold text-[#44546F]">
              Label Gilingan berhasil dibuat.
            </p>
            <div className="mt-3 rounded-xl border border-[#86EFAC] bg-[#ECFDF5] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#166534]">
                No. Gilingan
              </p>
              <p className="mt-1 text-[18px] font-bold text-[#166534]">{created}</p>
            </div>
          </div>
          <div className="flex justify-end border-t border-[#E2E6EA] px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg bg-[#00897B] px-5 text-[13px] font-bold text-white transition hover:bg-[#00796B]"
            >
              TUTUP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => void submit(e)}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#E2E6EA] px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label" : "Tambah Label Baru"}
            </p>
            {isEdit && header && (
              <p className="mt-0.5 text-[12px] font-semibold text-[#44546F]">
                {header.NoGilingan} — sumber {code || "-"}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] font-bold text-[#44546F]">
                No Gilingan
                <input
                  readOnly
                  value={header?.NoGilingan ?? ""}
                  placeholder="V.XXXXXXXXXX"
                  className={`${inputCls} mt-1 bg-white`}
                />
              </label>

              <label className="block text-[12px] font-bold text-[#44546F]">
                Date Created
                <input
                  type="date"
                  value={dateYmd}
                  onChange={(e) => setDateYmd(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>

            <label className="block text-[12px] font-bold text-[#44546F]">
              Jenis Gilingan
              <select
                value={idGilingan}
                onChange={(e) => setIdGilingan(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                <option value="">Pilih jenis gilingan…</option>
                {jenis.map((j) => (
                  <option key={j.IdGilingan} value={String(j.IdGilingan)}>
                    {j.NamaGilingan}
                  </option>
                ))}
              </select>
              {errors.idGilingan && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.idGilingan}
                </span>
              )}
            </label>

            <label className="block max-w-xs text-[12px] font-bold text-[#44546F]">
              Berat (kg)
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

            <fieldset className="rounded-xl border border-[#E2E6EA] bg-[#F7F8F9] p-3">
              <legend className="px-1 text-[12px] font-bold uppercase tracking-wide text-[#44546F]">
                Proses
              </legend>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#00897B] bg-[#E6F3F1] px-3 py-2 text-[12px] font-bold text-[#00897B]">
                  <input type="radio" name="lglMode" value="produksi" checked readOnly />
                  Produksi
                </label>
                <select
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setErrors({});
                  }}
                  disabled={isEdit}
                  className={`${inputCls} min-w-[260px] flex-1`}
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat…"
                      : isEdit
                        ? (code || "-")
                        : "Pilih nomor produksi…"}
                  </option>
                  {options.map((o) => (
                    <option key={o.code} value={o.code}>
                      {glgProduksiOptionLabel(o)}
                    </option>
                  ))}
                </select>
              </div>
              {errors.code && (
                <span className="mt-2 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.code}
                </span>
              )}
            </fieldset>

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
            <LglOutputPanel
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
            className={`flex h-10 items-center gap-1.5 rounded-lg px-5 text-[13px] font-bold text-white transition disabled:opacity-50 ${
              isEdit
                ? "bg-[#B26A00] hover:bg-[#935500]"
                : "bg-[#00897B] hover:bg-[#00796B]"
            }`}
          >
            {busy && <LglLoaderIcon width={14} height={14} />}
            {busy ? "Menyimpan…" : "SIMPAN"}
          </button>
        </footer>
      </form>
    </div>
  );
}
