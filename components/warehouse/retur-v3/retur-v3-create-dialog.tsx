"use client";

import { useEffect, useRef, useState } from "react";
import {
  createReturAction,
  getReturMastersAction,
} from "@/app/(app)/warehouse/retur-v3/actions";
import type {
  JenisOption,
  ReturItemInput,
  ReturMasters,
} from "@/services/retur-v3-service";
import { Loader2Icon, PlusIcon, TrashIcon, X } from "@/components/dashboard/icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const SUCCESS = "#0A7349";

type DraftItem = ReturItemInput & { namaJenis: string; key: number };

export function ReturV3CreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (noRetur: string) => void;
}) {
  const [masters, setMasters] = useState<ReturMasters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState(todayIso());
  const [idPembeli, setIdPembeli] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getReturMastersAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setMasters(res.masters);
      else setLoadError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (saving) return;
    if (!idPembeli) {
      setError("Pembeli wajib dipilih");
      return;
    }
    if (items.length === 0) {
      setError("Item retur wajib diisi minimal 1 (jenis + pcs)");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createReturAction({
      header: {
        tanggal,
        idPembeli,
        keterangan: keterangan.trim() || undefined,
      },
      items: items.map((i) => ({
        kodeKategori: i.kodeKategori,
        idJenis: i.idJenis,
        pcs: i.pcs,
        kategoriInput: i.kategoriInput,
      })),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated(res.noRetur);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-green-700"
              style={{ backgroundColor: "#E8F5E9" }}
            >
              <PlusIcon className="h-5 w-5" />
            </span>
            <p className="text-[20px] font-bold text-[#1A1D23]">Tambah Retur</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-6 pb-2">
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Tanggal
              </span>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                style={{ borderColor: BORDER }}
              />
            </label>

            <div className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Pembeli
              </span>
              {masters ? (
                <SearchSelect
                  placeholder="Pilih pembeli"
                  value={idPembeli}
                  options={masters.pembeli.map((p) => ({
                    id: p.idPembeli,
                    nama: p.namaPembeli,
                  }))}
                  onChange={setIdPembeli}
                />
              ) : (
                <div className="flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm text-gray-400"
                  style={{ borderColor: BORDER }}>
                  {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                  {loadError ?? "Memuat data pembeli…"}
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Keterangan
              </span>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={3}
                placeholder="Keterangan retur (opsional)"
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                style={{ borderColor: BORDER }}
              />
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border bg-white" style={{ borderColor: BORDER }}>
            <div
              className="flex items-center justify-between border-b bg-[#FAFBFC] px-3 py-2.5"
              style={{ borderColor: BORDER }}
            >
              <p className="text-[12.5px] font-bold text-[#1A1D23]">
                Item Retur (wajib diisi minimal 1)
              </p>
              <button
                type="button"
                onClick={() => setItemDialogOpen(true)}
                disabled={!masters}
                className="inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                style={{ color: PRIMARY }}
              >
                <PlusIcon className="h-4 w-4" /> Tambah Item
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-5 text-center text-[12.5px] text-gray-500">
                Belum ada item — tambahkan minimal 1 sebelum menyimpan
              </p>
            ) : (
              <div>
                {items.map((it, idx) => (
                  <div
                    key={it.key}
                    className="flex items-center gap-2 border-b px-3.5 py-2 last:border-b-0"
                    style={{ borderColor: BORDER }}
                  >
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1A1D23]">
                      {it.namaJenis}
                    </p>
                    <p className="shrink-0 text-xs font-semibold text-[#1A1D23]">
                      {it.pcs} pcs
                    </p>
                    <KategoriChip kategoriInput={it.kategoriInput} />
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-600"
                      aria-label="Hapus item"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-full border border-gray-300 px-6 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || loading}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-7 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {saving ? "MENYIMPAN..." : "SIMPAN"}
          </button>
        </div>
      </div>

      {itemDialogOpen && masters && (
        <ReturItemInputDialog
          masters={masters}
          onCancel={() => setItemDialogOpen(false)}
          onAdd={(item, namaJenis) => {
            setItems((prev) => [
              ...prev,
              { ...item, namaJenis, key: Date.now() + prev.length },
            ]);
            setItemDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ReturItemInputDialog({
  masters,
  onAdd,
  onCancel,
}: {
  masters: ReturMasters;
  onAdd: (item: ReturItemInput, namaJenis: string) => void;
  onCancel: () => void;
}) {
  const [kodeKategori, setKodeKategori] = useState("barangjadi");
  const [idJenis, setIdJenis] = useState<number | null>(null);
  const [pcs, setPcs] = useState("");
  const [kategoriInput, setKategoriInput] = useState("BAGUS");
  const [error, setError] = useState<string | null>(null);

  const options: JenisOption[] =
    kodeKategori === "barangjadi" ? masters.barangJadi : masters.furnitureWip;

  function submit() {
    const parsed = parseInt(pcs, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Pcs harus lebih dari 0");
      return;
    }
    if (!idJenis) {
      setError(
        kodeKategori === "barangjadi"
          ? "Pilih jenis barang jadi"
          : "Pilih jenis furniture WIP",
      );
      return;
    }
    const chosen = options.find((o) => o.id === idJenis);
    onAdd(
      {
        kodeKategori,
        idJenis,
        pcs: parsed,
        kategoriInput,
      },
      chosen?.nama ?? `Jenis #${idJenis}`,
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[460px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <p className="text-[16px] font-extrabold text-[#1A1D23]">
            Tambah Item Retur
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 pt-3">
          <div className="flex gap-2">
            {[
              { value: "barangjadi", label: "Barang Jadi" },
              { value: "furniturewip", label: "Furniture WIP" },
            ].map((opt) => {
              const active = kodeKategori === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setKodeKategori(opt.value);
                    setIdJenis(null);
                  }}
                  className="flex-1 rounded-lg px-3 py-2.5 text-[13px] font-bold transition"
                  style={{
                    backgroundColor: active ? `${PRIMARY}1A` : "#fff",
                    border: `1.5px solid ${active ? PRIMARY : "#D1D5DB"}`,
                    color: active ? PRIMARY : "#4B5563",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-600">
              {kodeKategori === "barangjadi"
                ? "Jenis Barang Jadi"
                : "Jenis Furniture WIP"}
            </span>
            <SearchSelect
              placeholder={
                kodeKategori === "barangjadi" ? "PILIH JENIS" : "Pilih furniture WIP"
              }
              searchHint={
                kodeKategori === "barangjadi"
                  ? "Cari jenis barang jadi."
                  : "Cari nama / ID..."
              }
              value={idJenis}
              options={options}
              onChange={setIdJenis}
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="block w-[110px]">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Pcs
              </span>
              <input
                type="number"
                min={1}
                value={pcs}
                onChange={(e) => setPcs(e.target.value)}
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                style={{ borderColor: BORDER }}
              />
            </label>
            <div className="flex flex-1 gap-2">
              {[
                { value: "BAGUS", label: "Bagus", color: SUCCESS },
                { value: "REJECT", label: "Rusak", color: "#D32F2F" },
              ].map((opt) => {
                const active = kategoriInput === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKategoriInput(opt.value)}
                    className="flex-1 rounded-lg px-3 py-2.5 text-[13px] font-bold transition"
                    style={{
                      backgroundColor: active ? `${opt.color}1A` : "#fff",
                      border: `1.5px solid ${active ? opt.color : "#D1D5DB"}`,
                      color: active ? opt.color : "#4B5563",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            className="w-full rounded-xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            Tambah
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchSelect({
  placeholder,
  searchHint,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  searchHint?: string;
  value: number | null;
  options: { id: number; nama: string }[];
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const keyword = q.trim().toLowerCase();
  const filtered = keyword
    ? options.filter((o) => o.nama.toLowerCase().includes(keyword))
    : options;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm outline-none focus:ring-2 focus:ring-blue-100"
        style={{ borderColor: open ? PRIMARY : BORDER }}
      >
        <span className={selected ? "text-[#1A1D23]" : "text-gray-400"}>
          {selected ? selected.nama : placeholder}
        </span>
        <span className="text-xs text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[46px] z-10 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: BORDER }}>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchHint ?? "Cari..."}
            className="h-10 w-full border-b px-3 text-sm outline-none"
            style={{ borderColor: BORDER }}
          />
          <div className="max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-gray-400">
                Tidak ada data.
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setQ("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                  style={{
                    backgroundColor:
                      o.id === value ? "rgba(30,111,217,0.08)" : undefined,
                    color: o.id === value ? PRIMARY : "#1F2937",
                    fontWeight: o.id === value ? 700 : 400,
                  }}
                >
                  {o.nama}
                </button>
              ))
            )}
          </div>
          {value !== null && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setQ("");
                setOpen(false);
              }}
              className="block w-full border-t px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Bersihkan pilihan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function KategoriChip({ kategoriInput }: { kategoriInput: string }) {
  const reject = String(kategoriInput).toUpperCase() === "REJECT";
  const color = reject ? "#D32F2F" : "#388E3C";
  return (
    <span
      className="shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-bold"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {reject ? "Rusak" : "Bagus"}
    </span>
  );
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
