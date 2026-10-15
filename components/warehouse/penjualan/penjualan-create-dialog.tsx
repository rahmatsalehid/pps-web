"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getPenjualanMastersAction,
  createPenjualanAction,
} from "@/app/(app)/warehouse/penjualan/actions";
import {
  kategoriLabel,
  type PenjualanCreateItem,
  type PenjualanKategori,
  type PenjualanMasters,
} from "@/services/penjualan-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const PRIMARY = "#1E6FD9";
const SUCCESS = "#00897B";
const BORDER = "#E2E6EA";

const inputCls =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-1";
const dateCls =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-1";

const KATEGORI: PenjualanKategori[] = ["barangjadi", "furniturewip", "barangdagang"];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function optionsFor(
  masters: PenjualanMasters | null,
  kategori: PenjualanKategori,
): { id: number; nama: string }[] {
  if (!masters) return [];
  if (kategori === "barangjadi") return masters.barangJadi;
  if (kategori === "furniturewip") return masters.furnitureWip;
  return masters.barangDagang;
}

function PembeliSelect({
  options,
  value,
  onChange,
  error,
}: {
  options: { idPembeli: number; namaPembeli: string }[];
  value: { idPembeli: number; namaPembeli: string } | null;
  onChange: (v: { idPembeli: number; namaPembeli: string } | null) => void;
  error?: string;
}) {
  const [text, setText] = useState(value?.namaPembeli ?? "");
  const [open, setOpen] = useState(false);

  const q = text.trim().toLowerCase();
  const list = q
    ? options.filter(
        (o) =>
          o.namaPembeli.toLowerCase().includes(q) ||
          String(o.idPembeli).includes(q),
      )
    : options;

  return (
    <div className="relative">
      <input
        value={text}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(null);
          setOpen(true);
        }}
        placeholder="Cari nama pembeli…"
        className={inputCls}
        style={{ borderColor: error ? "#DC2626" : BORDER }}
      />
      {open && list.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-white shadow-lg" style={{ borderColor: BORDER }}>
          {list.map((o) => (
            <button
              key={o.idPembeli}
              type="button"
              onMouseDown={() => {
                onChange(o);
                setText(o.namaPembeli);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
            >
              <span className="truncate font-semibold text-gray-800">
                {o.namaPembeli}
              </span>
              <span className="shrink-0 text-gray-400">#{o.idPembeli}</span>
            </button>
          ))}
        </div>
      )}
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-600">{error}</span>}
    </div>
  );
}

/** Dropdown jenis (MstBarangJadi / MstCabinetWIP / MstBarangDagang) — bisa dicari nama. */
function JenisSelect({
  options,
  value,
  onChange,
  placeholder,
  error,
}: {
  options: { id: number; nama: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  error?: string;
}) {
  const selected = options.find((o) => String(o.id) === value);
  const [text, setText] = useState(selected?.nama ?? "");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const q = text.trim().toLowerCase();
  const list = q ? options.filter((o) => o.nama.toLowerCase().includes(q)) : options;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={text}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          // Kembalikan teks ke pilihan terkunci (atau kosong).
          setText(options.find((o) => String(o.id) === value)?.nama ?? "");
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setTouched(true);
          onChange("");
          setOpen(true);
        }}
        placeholder={placeholder}
        className={inputCls}
        style={{ borderColor: error ? "#DC2626" : BORDER }}
      />
      {open && list.length > 0 && (
        <div
          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-white shadow-lg"
          style={{ borderColor: BORDER }}
        >
          {list.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => {
                onChange(String(o.id));
                setText(o.nama);
                setTouched(false);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
            >
              <span className="truncate font-semibold text-gray-800">{o.nama}</span>
              <span className="shrink-0 text-gray-400">#{o.id}</span>
            </button>
          ))}
        </div>
      )}
      {open && touched && list.length === 0 && (
        <div
          className="absolute z-20 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs text-gray-400 shadow-lg"
          style={{ borderColor: BORDER }}
        >
          Tidak ada jenis yang cocok.
        </div>
      )}
      {error && (
        <span className="mt-1 block text-[11px] font-semibold text-red-600">{error}</span>
      )}
    </div>
  );
}

type Props = {
  onClose: () => void;
  /** DO baru berhasil dibuat — kirim NoBJJual untuk refresh & select. */
  onCreated: (noBJJual: string) => void;
};

/** Dialog buat Penjualan (DO) baru: header BJJual_h + baris BJJualItem_d. */
export function PenjualanCreateDialog({ onClose, onCreated }: Props) {
  const [masters, setMasters] = useState<PenjualanMasters | null>(null);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [tanggal, setTanggal] = useState(() => toYmd(new Date()));
  const [pembeli, setPembeli] = useState<{ idPembeli: number; namaPembeli: string } | null>(null);
  const [invoiceType, setInvoiceType] = useState("");
  const [remark, setRemark] = useState("");

  const [kategori, setKategori] = useState<PenjualanKategori>("barangjadi");
  const [idJenis, setIdJenis] = useState<string>("");
  const [pcs, setPcs] = useState("1");
  const [items, setItems] = useState<PenjualanCreateItem[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdNo, setCreatedNo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingMasters(true);
      const res = await getPenjualanMastersAction();
      if (cancelled) return;
      setLoadingMasters(false);
      if (res.ok) setMasters(res.masters);
      else setFormError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jenisOptions = optionsFor(masters, kategori);
  const totalPcs = items.reduce((a, i) => a + i.pcs, 0);

  function addItem() {
    const next: Record<string, string> = {};
    const jId = Number(idJenis);
    const p = Number(pcs);
    if (!Number.isInteger(jId) || jId <= 0) next.idJenis = "Pilih jenis dulu.";
    if (!Number.isInteger(p) || p <= 0) next.pcs = "Pcs harus > 0.";
    if (Object.keys(next).length > 0) {
      setErrors((e) => ({ ...e, ...next, item: "" }));
      return;
    }
    if (items.some((i) => i.kodeKategori === kategori && i.idJenis === jId)) {
      setErrors((e) => ({
        ...e,
        item: "Jenis sudah ditambahkan — ubah Pcs-nya lewat tombol hapus lalu tambah lagi.",
      }));
      return;
    }
    setItems((prev) => [...prev, { kodeKategori: kategori, idJenis: jId, pcs: p }]);
    setErrors((e) => ({ ...e, item: "", idJenis: "", pcs: "" }));
    setIdJenis("");
    setPcs("1");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || createdNo) return;
    const next: Record<string, string> = {};
    if (!tanggal) next.tanggal = "Tanggal wajib diisi.";
    if (!pembeli || pembeli.idPembeli <= 0) next.pembeli = "Pembeli wajib dipilih.";
    if (items.length === 0) next.items = "Tambah minimal 1 item DO.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    const res = await createPenjualanAction({
      tanggal,
      idPembeli: pembeli!.idPembeli,
      invoiceType,
      ...(remark.trim() ? { remark: remark.trim() } : {}),
      items,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setCreatedNo(res.noBJJual);
    onCreated(res.noBJJual);
  }

  if (createdNo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="px-5 py-6 text-center" style={{ backgroundColor: "#ECFDF5" }}>
            <p className="text-base font-bold" style={{ color: SUCCESS }}>
              Berhasil!
            </p>
            <p className="mt-1 text-xs text-gray-600">Penjualan (DO) berhasil dibuat.</p>
          </div>
          <div className="px-5 py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
              No. DO
            </p>
            <p className="mt-1 break-all text-lg font-extrabold text-gray-900">{createdNo}</p>
          </div>
          <div className="flex justify-end border-t px-5 py-3.5" style={{ borderColor: BORDER }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: BORDER }}>
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-white"
            style={{ backgroundColor: SUCCESS }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-900">Buat Penjualan Baru</p>
            <p className="text-xs text-gray-500">Dokumen DO (BJJual_h + item)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl bg-gray-50 p-4" style={{ borderColor: BORDER }}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">Tanggal</span>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={dateCls}
                  style={{ borderColor: errors.tanggal ? "#DC2626" : BORDER }}
                />
                {errors.tanggal && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.tanggal}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-600">
                  Invoice Type
                </span>
                <input
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  maxLength={10}
                  placeholder="Invoice Type"
                  className={inputCls}
                  style={{ borderColor: BORDER }}
                />
              </label>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-gray-600">
                  Pembeli <span className="text-red-500">*</span>
                </span>
                <PembeliSelect
                  options={masters?.pembeli ?? []}
                  value={pembeli}
                  onChange={setPembeli}
                  error={errors.pembeli}
                />
                {loadingMasters && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Memuat master…
                  </span>
                )}
              </div>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-gray-600">
                  Remark (opsional)
                </span>
                <input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  maxLength={255}
                  placeholder="Contoh: DO/08/26/1857-0130"
                  className={inputCls}
                  style={{ borderColor: BORDER }}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-white" style={{ borderColor: BORDER }}>
            <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
              <p className="text-sm font-bold text-gray-900">Item DO</p>
              <p className="text-[11px] text-gray-500">
                Kategori yang bisa dijual: Barang Jadi, Furniture WIP, Barang Dagang.
              </p>
            </div>

            <div className="space-y-2.5 bg-gray-50 px-4 py-3">
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-gray-600">
                  Kategori
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {KATEGORI.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKategori(k);
                        setIdJenis("");
                        setErrors((e) => ({ ...e, idJenis: "", item: "" }));
                      }}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        backgroundColor: kategori === k ? PRIMARY : "#fff",
                        borderColor: kategori === k ? PRIMARY : BORDER,
                        color: kategori === k ? "#fff" : "#4B5563",
                      }}
                    >
                      {kategoriLabel(k)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <JenisSelect
                  options={jenisOptions}
                  value={idJenis}
                  onChange={(id) => {
                    setIdJenis(id);
                    setErrors((x) => ({ ...x, idJenis: "" }));
                  }}
                  placeholder={
                    loadingMasters ? "Memuat jenis…" : "Cari jenis berdasarkan nama…"
                  }
                  error={errors.idJenis}
                />

                <label className="w-24">
                  <span className="mb-1 block text-[11px] font-semibold text-gray-600">
                    Pcs
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={pcs}
                    onChange={(e) => {
                      setPcs(e.target.value);
                      setErrors((x) => ({ ...x, pcs: "" }));
                    }}
                    className={inputCls}
                    style={{ borderColor: errors.pcs ? "#DC2626" : BORDER }}
                  />
                </label>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={loadingMasters}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: SUCCESS }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Tambah
                </button>
              </div>
            </div>

            {(errors.idJenis || errors.pcs || errors.item) && (
              <p className="border-t border-red-200 bg-red-50 px-4 py-1.5 text-[11px] font-semibold text-red-700">
                {errors.idJenis || errors.pcs || errors.item}
              </p>
            )}

            <div className="max-h-52 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">
                  Belum ada item. Pilih kategori + jenis + pcs lalu klik Tambah.
                </p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-[11px] font-bold uppercase text-gray-500">
                      <th className="px-4 py-2">Kategori</th>
                      <th className="px-3 py-2">Jenis</th>
                      <th className="w-20 px-3 py-2 text-right">Pcs</th>
                      <th className="w-14 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const opt = optionsFor(masters, it.kodeKategori).find(
                        (o) => o.id === it.idJenis,
                      );
                      return (
                        <tr key={`${it.kodeKategori}-${it.idJenis}`} className="border-t" style={{ borderColor: "#F1F2F4" }}>
                          <td className="px-4 py-2 text-xs font-semibold text-gray-700">
                            {kategoriLabel(it.kodeKategori)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-800">
                            {opt?.nama ?? `#${it.idJenis}`}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                            {it.pcs}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                              className="rounded p-1 text-red-500 hover:bg-red-50"
                              title="Hapus item"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4" aria-hidden>
                                <path d="M3 6h18" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div
              className="flex items-center justify-between border-t px-4 py-2.5 text-xs font-bold text-gray-800"
              style={{ borderColor: BORDER, backgroundColor: "#EFF6FF" }}
            >
              <span>{items.length} item</span>
              <span>Total {totalPcs} pcs</span>
            </div>
          </div>

          {errors.items && (
            <p className="mt-2 text-[11px] font-semibold text-red-600">{errors.items}</p>
          )}

          {formError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {formError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3.5" style={{ borderColor: BORDER }}>
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
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: SUCCESS }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            SIMPAN
          </button>
        </div>
      </form>
    </div>
  );
}
