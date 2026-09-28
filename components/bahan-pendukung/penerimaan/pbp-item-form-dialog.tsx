"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PbpBarangMaster,
  PbpSupplier,
} from "@/services/penerimaan-bahan-pendukung-service";
import {
  addPbpItemsAction,
  getPbpMastersAction,
} from "@/app/(app)/bahan-pendukung/penerimaan/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import {
  CloseIcon,
  ErrorIcon,
  InventoryIcon,
  NumbersIcon,
  RefreshIcon,
} from "./pbp-icons";
import { fmtQty } from "./pbp-format";
import { PbpStatusDialog } from "./pbp-status-dialog";

const ACCENT = "#00897B";
const BORDER = "#E2E6EA";

export function PbpItemFormDialog({
  noPenerimaan,
  onClose,
  onSaved,
}: {
  noPenerimaan: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<PbpSupplier[]>([]);
  const [masters, setMasters] = useState<PbpBarangMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    null,
  );
  const [selectedBarangId, setSelectedBarangId] = useState<number | null>(null);
  const [qty, setQty] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const applyMasters = useCallback(
    (
      res:
        | { ok: true; masters: PbpBarangMaster[]; suppliers: PbpSupplier[] }
        | { ok: false; error: string },
    ) => {
      if (res.ok) {
        setMasters(
          [...res.masters].sort((a, b) => a.nama.localeCompare(b.nama, "id")),
        );
        setSuppliers(res.suppliers);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    },
    [],
  );

  const loadMasters = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getPbpMastersAction();
    setLoading(false);
    applyMasters(res);
  }, [applyMasters]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPbpMastersAction();
      if (cancelled) return;
      setLoading(false);
      applyMasters(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMasters]);

  async function submit() {
    if (saving || saved) return;
    if (selectedSupplierId == null) {
      setSaveError("Supplier wajib dipilih.");
      return;
    }
    if (selectedBarangId == null) {
      setSaveError("Nama barang wajib dipilih dari daftar.");
      return;
    }
    const parsed = Number(qty.trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSaveError("Qty wajib diisi dan harus > 0.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    const res = await addPbpItemsAction(noPenerimaan, [
      {
        idSupplier: selectedSupplierId,
        idCabinetMaterial: selectedBarangId,
        qty: parsed,
        ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
      },
    ]);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setSaveError(res.error);
    }
  }

  const supplierItems = suppliers.map((s) => ({
    id: s.idSupplier,
    label: s.namaSupplier,
  }));
  const masterItems = masters.map((m) => ({
    id: m.idCabinetMaterial,
    label: m.nama,
    chip: `${fmtQty(m.saldoAkhir)} ${m.namaUOM ?? "unit"}`,
    chipPositive: m.saldoAkhir > 0,
  }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-[18px] pb-3 pt-[13px]">
            <span
              className="grid place-items-center rounded-lg p-1.5"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              <InventoryIcon className="h-[17px] w-[17px]" />
            </span>
            <p className="min-w-0 flex-1 text-sm font-bold text-[#1F2937]">
              Tambah Barang
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || saved}
              className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100 disabled:opacity-50"
              aria-label="Tutup"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px" style={{ backgroundColor: BORDER }} />

          {/* Fields */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-[18px]">
            <SearchSelect
              label="Supplier"
              hint="Pilih supplier"
              searchHint="Cari supplier."
              loading={loading}
              error={loadError}
              items={supplierItems}
              value={selectedSupplierId}
              onChange={(id) => {
                setSelectedSupplierId(id);
                setSaveError(null);
              }}
              onRetry={() => void loadMasters()}
            />
            <SearchSelect
              label="Nama Barang"
              hint="Pilih barang"
              searchHint="Cari barang."
              loading={loading}
              error={loadError}
              items={masterItems}
              value={selectedBarangId}
              onChange={(id) => {
                setSelectedBarangId(id);
                setSaveError(null);
              }}
              onRetry={() => void loadMasters()}
            />

            <label className="block">
              <span className="sr-only">Qty (PCS)</span>
              <span className="relative block">
                <NumbersIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value.replace(/[^0-9.,]/g, ""));
                    setSaveError(null);
                  }}
                  inputMode="decimal"
                  placeholder="Qty (PCS)"
                  disabled={saving || saved}
                  className="h-10 w-full rounded-[9px] border bg-[#F9FAFB] pl-9 pr-3 text-[13px] outline-none placeholder:text-gray-500 focus:border-[#00897B] focus:ring-1 focus:ring-[#00897B]"
                  style={{ borderColor: BORDER }}
                />
              </span>
            </label>

            <label className="block">
              <span className="sr-only">Keterangan</span>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={2}
                placeholder="Keterangan"
                disabled={saving || saved}
                className="w-full rounded-[9px] border bg-[#F9FAFB] px-3 py-2.5 text-[13px] outline-none placeholder:text-gray-500 focus:border-[#00897B] focus:ring-1 focus:ring-[#00897B]"
                style={{ borderColor: BORDER }}
              />
              <span className="mt-0.5 block text-[11px] text-gray-400">
                Opsional
              </span>
            </label>
          </div>

          {saveError && (
            <div
              className="mx-[18px] mb-1.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
              style={{ marginTop: 6 }}
            >
              <ErrorIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span className="text-xs text-red-700">{saveError}</span>
            </div>
          )}

          <div className="h-px" style={{ backgroundColor: BORDER }} />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-[18px] py-[11px]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || saved}
              className="rounded-lg border px-[18px] py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: "#D1D5DB" }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || saved}
              className="inline-flex items-center gap-1.5 rounded-lg px-[18px] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="text-sm leading-none">✓</span>
              )}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>

      {saved && (
        <PbpStatusDialog
          type="success"
          title="Berhasil Menyimpan"
          message="Barang berhasil ditambahkan."
          onClose={() => {
            setSaved(false);
            onSaved();
            onClose();
          }}
        />
      )}
    </>
  );
}

function SearchSelect({
  label,
  hint,
  searchHint,
  items,
  value,
  loading,
  error,
  onChange,
  onRetry,
}: {
  label: string;
  hint: string;
  searchHint: string;
  items: {
    id: number;
    label: string;
    chip?: string;
    chipPositive?: boolean;
  }[];
  value: number | null;
  loading: boolean;
  error: string | null;
  onChange: (id: number | null) => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const selected = items.find((i) => i.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (i.chip ?? "").toLowerCase().includes(q),
      )
    : items;

  return (
    <div ref={boxRef} className="relative">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <button
        type="button"
        onClick={() => {
          if (loading || error) return;
          setOpen((v) => !v);
          setQuery("");
        }}
        disabled={loading || !!error}
        className="flex h-10 w-full items-center gap-2 rounded-[9px] border bg-[#F9FAFB] px-3 text-left text-[13px] outline-none disabled:opacity-60"
        style={{ borderColor: BORDER }}
      >
        <span className="min-w-0 flex-1 truncate text-[#1F2937]">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-gray-500">
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat…
            </span>
          ) : selected ? (
            selected.label
          ) : (
            <span className="text-gray-500">{hint}</span>
          )}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {error && (
        <div className="mt-1.5 flex items-center gap-2 rounded-[9px] border border-red-200 bg-red-50 px-3 py-2">
          <ErrorIcon className="h-4 w-4 shrink-0 text-red-600" />
          <span className="min-w-0 flex-1 text-xs text-red-700">
            {label === "Nama Barang"
              ? "Gagal memuat data barang"
              : "Gagal memuat data"}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded p-1 text-red-600 hover:bg-red-100"
            title="Coba lagi"
            aria-label="Coba lagi"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {open && !loading && !error && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[10px] border bg-white shadow-xl" style={{ borderColor: BORDER }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchHint}
            className="h-9 w-full border-b px-3 text-[13px] outline-none"
            style={{ borderColor: BORDER }}
          />
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">
                Tidak ada data
              </p>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => {
                    onChange(i.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50 ${
                    i.id === value ? "bg-gray-50 font-semibold" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-[#1F2937]">
                    {i.label}
                  </span>
                  {i.chip && (
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                        i.chipPositive
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {i.chip}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="w-full border-t px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Hapus pilihan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
