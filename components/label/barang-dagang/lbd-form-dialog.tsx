"use client";

import { useState, type FormEvent } from "react";
import type {
  LbdHeader,
  LbdJenis,
  LbdSavePayload,
  LbdSupplier,
} from "@/services/label-barang-dagang-service";
import { LbdLoaderIcon } from "./lbd-icons";

type Props = {
  header: LbdHeader;
  jenis: LbdJenis[];
  suppliers: LbdSupplier[];
  onClose: () => void;
  onSubmitUpdate: (args: {
    noBarangDagang: string;
    payload: LbdSavePayload;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

export function LbdFormDialog({
  header,
  jenis,
  suppliers,
  onClose,
  onSubmitUpdate,
}: Props) {
  const [idSupplier, setIdSupplier] = useState<string>(
    header.IdSupplier != null ? String(header.IdSupplier) : "",
  );
  const [idBarangDagang, setIdBarangDagang] = useState<string>(
    header.IdBarangDagang != null ? String(header.IdBarangDagang) : "",
  );
  const [qty, setQty] = useState(() => (header.Qty != null ? String(header.Qty) : ""));
  const [keterangan, setKeterangan] = useState(() => header.Keterangan ?? "");
  const [blok, setBlok] = useState(() => header.Blok ?? "");
  const [idLokasi, setIdLokasi] = useState(() => header.IdLokasi ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!idSupplier) {
      next.idSupplier = "Wajib pilih supplier.";
    }
    if (!idBarangDagang) {
      next.idBarangDagang = "Wajib pilih jenis barang dagang.";
    }

    const qtyRaw = qty.trim().replace(",", ".");
    if (!qtyRaw) {
      next.qty = "Qty wajib diisi.";
    } else {
      const qtyNum = Number(qtyRaw);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        next.qty = "Qty harus > 0.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): LbdSavePayload => {
    const headerPayload: NonNullable<LbdSavePayload["header"]> = {};

    headerPayload.IdSupplier = Number(idSupplier);
    headerPayload.IdBarangDagang = Number(idBarangDagang);

    const qtyRaw = qty.trim().replace(",", ".");
    if (qtyRaw) headerPayload.Qty = Number(qtyRaw);

    headerPayload.Keterangan = keterangan.trim() ? keterangan.trim() : null;
    headerPayload.Blok = blok.trim() ? blok.trim() : null;
    headerPayload.IdLokasi = idLokasi.trim() ? idLokasi.trim() : null;

    return { header: headerPayload };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload = buildPayload();
    setBusy(true);
    const res = await onSubmitUpdate({
      noBarangDagang: header.NoBarangDagang,
      payload,
    });
    setBusy(false);

    if (!res.ok) {
      setFormError({
        title: "Gagal Menyimpan",
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
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#E2E6EA] px-5 py-3.5">
          <div>
            <p className="text-[16px] font-bold text-[#172B4D]">Edit Label Barang Dagang</p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#44546F]">
              {header.NoBarangDagang}
              {header.NoPenerimaan ? ` — sumber ${header.NoPenerimaan}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#DCDFE4] px-3 py-1.5 text-[12px] font-bold text-[#44546F] transition hover:bg-[#F7F8F9]"
          >
            BATAL
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-bold text-[#44546F]">
              Supplier
              <select
                value={idSupplier}
                onChange={(e) => setIdSupplier(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                <option value="">Pilih supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.IdSupplier} value={String(s.IdSupplier)}>
                    {s.NamaSupplier}
                  </option>
                ))}
                {header.IdSupplier != null &&
                  !suppliers.some((s) => s.IdSupplier === header.IdSupplier) && (
                    <option value={String(header.IdSupplier)}>
                      {header.NamaSupplier ?? header.IdSupplier}
                    </option>
                  )}
              </select>
              {errors.idSupplier && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.idSupplier}
                </span>
              )}
            </label>

            <label className="block text-[12px] font-bold text-[#44546F]">
              Jenis Barang Dagang
              <select
                value={idBarangDagang}
                onChange={(e) => setIdBarangDagang(e.target.value)}
                className={`${inputCls} mt-1`}
              >
                <option value="">Pilih jenis barang dagang…</option>
                {jenis.map((j) => (
                  <option key={j.IdBarangDagang} value={String(j.IdBarangDagang)}>
                    {j.NamaBarangDagang}
                  </option>
                ))}
                {header.IdBarangDagang != null &&
                  !jenis.some((j) => j.IdBarangDagang === header.IdBarangDagang) && (
                    <option value={String(header.IdBarangDagang)}>
                      {header.NamaBarangDagang ?? header.IdBarangDagang}
                    </option>
                  )}
              </select>
              {errors.idBarangDagang && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.idBarangDagang}
                </span>
              )}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-bold text-[#44546F]">
              Qty
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={`${inputCls} mt-1`}
              />
              {errors.qty && (
                <span className="mt-1 block text-[11px] font-semibold text-[#C9372C]">
                  {errors.qty}
                </span>
              )}
            </label>

            <label className="block text-[12px] font-bold text-[#44546F]">
              Keterangan
              <input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Opsional"
                className={`${inputCls} mt-1`}
              />
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

          <div className="rounded-lg border border-[#B3E5FC] bg-[#E1F5FE] px-3 py-2 text-[12px] font-semibold text-[#01579B]">
            Label yang sudah dicetak atau sudah terpakai tidak dapat diubah.
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
            {busy && <LbdLoaderIcon width={14} height={14} />}
            {busy ? "Menyimpan…" : "SIMPAN"}
          </button>
        </footer>
      </form>
    </div>
  );
}
