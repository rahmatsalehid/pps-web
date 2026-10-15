"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  addPenjualanItemAction,
  deletePenjualanItemAction,
  getPenjualanMastersAction,
  updatePenjualanItemAction,
} from "@/app/(app)/warehouse/penjualan/actions";
import {
  kategoriLabel,
  type PenjualanKategori,
  type PenjualanLine,
  type PenjualanMasters,
} from "@/services/penjualan-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const SUCCESS = "#00897B";
const BORDER = "#E2E6EA";

const inputCls =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-1";

const KATEGORI: PenjualanKategori[] = ["barangjadi", "furniturewip", "barangdagang"];

function optionsFor(
  masters: PenjualanMasters | null,
  kategori: string,
): { id: number; nama: string }[] {
  if (!masters) return [];
  if (kategori === "barangjadi") return masters.barangJadi;
  if (kategori === "furniturewip") return masters.furnitureWip;
  if (kategori === "barangdagang") return masters.barangDagang;
  return [];
}

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: BORDER }}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t px-5 py-3.5" style={{ borderColor: BORDER }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Dialog tambah 1 baris item (BJJualItem_d) ke DO yang belum complete. */
export function PenjualanAddItemDialog({
  noBJJual,
  existing,
  onSaved,
  onClose,
}: {
  noBJJual: string;
  existing: PenjualanLine[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [masters, setMasters] = useState<PenjualanMasters | null>(null);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [kategori, setKategori] = useState<PenjualanKategori>("barangjadi");
  const [idJenis, setIdJenis] = useState("");
  const [pcs, setPcs] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingMasters(true);
      const res = await getPenjualanMastersAction();
      if (cancelled) return;
      setLoadingMasters(false);
      if (res.ok) setMasters(res.masters);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jenisOptions = optionsFor(masters, kategori).filter(
    (o) => !existing.some((l) => l.kodeKategori === kategori && l.idJenis === o.id),
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const jId = Number(idJenis);
    const p = Number(pcs);
    if (!Number.isInteger(jId) || jId <= 0) {
      setError("Pilih jenis dulu.");
      return;
    }
    if (!Number.isInteger(p) || p <= 0) {
      setError("Pcs harus bilangan bulat > 0.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await addPenjualanItemAction(noBJJual, {
      kodeKategori: kategori,
      idJenis: jId,
      pcs: p,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <DialogShell
      title="Tambah Item DO"
      subtitle={noBJJual}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            BATAL
          </button>
          <button
            type="submit"
            form="add-item-form"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: SUCCESS }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            SIMPAN
          </button>
        </>
      }
    >
      <form id="add-item-form" onSubmit={submit} className="space-y-3">
        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-600">Kategori</span>
          <div className="flex flex-wrap gap-1.5">
            {KATEGORI.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKategori(k);
                  setIdJenis("");
                }}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor: kategori === k ? "#1E6FD9" : "#fff",
                  borderColor: kategori === k ? "#1E6FD9" : BORDER,
                  color: kategori === k ? "#fff" : "#4B5563",
                }}
              >
                {kategoriLabel(k)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Jenis</span>
          <select
            value={idJenis}
            onChange={(e) => {
              setIdJenis(e.target.value);
              setError(null);
            }}
            className={inputCls}
            style={{ borderColor: BORDER }}
          >
            <option value="">
              {loadingMasters ? "Memuat…" : "Pilih jenis…"}
            </option>
            {jenisOptions.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.nama}
              </option>
            ))}
          </select>
          {jenisOptions.length === 0 && !loadingMasters && (
            <span className="mt-1 block text-[11px] text-gray-500">
              Semua jenis pada kategori ini sudah ada di DO.
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Pcs</span>
          <input
            type="number"
            min={1}
            value={pcs}
            onChange={(e) => {
              setPcs(e.target.value);
              setError(null);
            }}
            className={inputCls}
            style={{ borderColor: BORDER }}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
      </form>
    </DialogShell>
  );
}

/** Dialog ubah pcs 1 baris item (hanya bila belum discan). */
export function PenjualanEditPcsDialog({
  noBJJual,
  line,
  onSaved,
  onClose,
}: {
  noBJJual: string;
  line: PenjualanLine;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [pcs, setPcs] = useState(String(line.pcsRequired));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nama = line.namaJenis?.trim()
    ? line.namaJenis
    : `${kategoriLabel(line.kodeKategori)} #${line.idJenis}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const p = Number(pcs);
    if (!Number.isInteger(p) || p <= 0) {
      setError("Pcs harus bilangan bulat > 0.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await updatePenjualanItemAction(noBJJual, {
      kodeKategori: line.kodeKategori as PenjualanKategori,
      idJenis: line.idJenis,
      pcs: p,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <DialogShell
      title="Ubah Pcs Item"
      subtitle={`${nama} — ${kategoriLabel(line.kodeKategori)}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            BATAL
          </button>
          <button
            type="submit"
            form="edit-pcs-form"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: SUCCESS }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            SIMPAN
          </button>
        </>
      }
    >
      <form id="edit-pcs-form" onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Pcs</span>
          <input
            type="number"
            min={1}
            value={pcs}
            onChange={(e) => {
              setPcs(e.target.value);
              setError(null);
            }}
            className={inputCls}
            style={{ borderColor: BORDER }}
          />
          <span className="mt-1 block text-[11px] text-gray-500">
            Pcs sebelumnya: {line.pcsRequired} (belum ada label discan).
          </span>
        </label>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
      </form>
    </DialogShell>
  );
}

/** Konfirmasi hapus 1 baris item (hanya bila belum discan). */
export function PenjualanDeleteItemDialog({
  noBJJual,
  line,
  onSaved,
  onClose,
}: {
  noBJJual: string;
  line: PenjualanLine;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nama = line.namaJenis?.trim()
    ? line.namaJenis
    : `${kategoriLabel(line.kodeKategori)} #${line.idJenis}`;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await deletePenjualanItemAction(
      noBJJual,
      line.kodeKategori,
      line.idJenis,
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <DialogShell
      title="Hapus Item DO"
      subtitle={noBJJual}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            HAPUS
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Hapus item <span className="font-bold">{nama}</span> (
        {kategoriLabel(line.kodeKategori)}) dengan {line.pcsRequired} pcs?
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Baris ini belum memiliki label yang discan.
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </DialogShell>
  );
}
