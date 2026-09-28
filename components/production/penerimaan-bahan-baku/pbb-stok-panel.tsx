"use client";

import { useEffect, useState } from "react";
import type { StokItem, StokLabelItem } from "@/services/stok-service";
import {
  getStokBahanBakuPakaiAction,
  getStokBahanBakuPakaiLabelsAction,
  getStokBahanBakuProsesAction,
  getStokBahanBakuProsesLabelsAction,
} from "@/app/(app)/production/penerimaan-bahan-baku/actions";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { CopyIcon, InventoryIcon } from "./pbb-icons";
import { formatTanggalShort } from "./pbb-format";

const STOK_GREEN = "#059669";
const STOK_EMPTY = "#D1D5DB";

type StokAction = () => Promise<
  { ok: true; items: StokItem[] } | { ok: false; error: string }
>;
type LabelsAction = (
  idBB: number,
) => Promise<
  { ok: true; items: StokLabelItem[] } | { ok: false; error: string }
>;

type SourceDef = {
  id: string;
  label: string;
  fetchStok: StokAction;
  fetchLabels: LabelsAction;
};

const SOURCES: SourceDef[] = [
  {
    id: "pakai",
    label: "Bahan Baku Pakai",
    fetchStok: getStokBahanBakuPakaiAction,
    fetchLabels: getStokBahanBakuPakaiLabelsAction,
  },
  {
    id: "proses",
    label: "Bahan Baku Proses",
    fetchStok: getStokBahanBakuProsesAction,
    fetchLabels: getStokBahanBakuProsesLabelsAction,
  },
];

function isEmptyItem(item: StokItem): boolean {
  return item.beratSisa <= 0;
}

/** Panel tab "Stok Item" — chip per sumber (Pakai/Proses) ala StokItemSection. */
export function PbbStokPanel() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Chip per sumber — ala ProductionFilterChip pada StokItemSection */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-white">
        <div className="flex min-h-[38px] items-center gap-1.5 overflow-x-auto overflow-y-hidden px-3.5 py-2">
          {SOURCES.map((src, i) => (
            <FilterChip
              key={src.id}
              label={src.label}
              active={selected === i}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>
      </div>

      {/* IndexedStack-style: kedua pane tetap mounted agar state tidak reset */}
      <div className="min-h-0 flex-1">
        {SOURCES.map((src, i) => (
          <div
            key={src.id}
            className="h-full min-h-0"
            hidden={selected !== i}
          >
            <StokSourcePane source={src} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StokSourcePane({ source }: { source: SourceDef }) {
  const [items, setItems] = useState<StokItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StokItem | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  function retry() {
    setLoading(true);
    setError(null);
    setItems(null);
    setReloadTick((t) => t + 1);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await source.fetchStok();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setItems(res.items);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [source, reloadTick]);

  // Urutan mengikuti tablet: item kosong di bawah; stok 0 tetap tampil
  const sorted = [...(items ?? [])].sort(
    (a, b) => Number(isEmptyItem(a)) - Number(isEmptyItem(b)),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {loading || items == null ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat stok…
          </div>
        ) : error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-gray-500">
            <p className="whitespace-pre-line text-xs text-[#64748B]">
              {`Gagal memuat stok item\n${error}`}
            </p>
            <button
              type="button"
              className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
              onClick={retry}
            >
              Coba lagi
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            Tidak ada data stok item
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((item) => {
              const empty = isEmptyItem(item);
              return (
                <button
                  key={item.idBB}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full overflow-hidden rounded-[10px] border border-[#E5E7EB] bg-white text-left transition hover:shadow-sm"
                  title="Lihat rincian label"
                >
                  <span
                    className="w-1 shrink-0"
                    style={{ backgroundColor: empty ? STOK_EMPTY : STOK_GREEN }}
                  />
                  <div className="min-w-0 flex-1 p-2.5">
                    <div className="flex gap-2 rounded-lg bg-[#F9FAFB] p-2">
                      <div className="min-w-0 flex-[3]">
                        <p className="text-[9px] font-semibold text-[#9CA3AF]">
                          Jenis
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-[#111827]">
                          {item.nama}
                        </p>
                      </div>
                      <div className="w-px bg-[#E5E7EB]" />
                      <div className="min-w-0 flex-[2]">
                        <p className="text-[9px] font-semibold text-[#9CA3AF]">
                          Tanggal
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-[#374151]">
                          {empty || !item.dateCreateTertua
                            ? "-"
                            : formatTanggalShort(item.dateCreateTertua)}
                        </p>
                      </div>
                      <div className="w-px bg-[#E5E7EB]" />
                      <div className="min-w-0 flex-[2]">
                        <p className="text-[9px] font-semibold text-[#9CA3AF]">
                          Berat
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11px] font-bold"
                          style={{ color: empty ? "#9CA3AF" : STOK_GREEN }}
                        >
                          {item.beratSisa.toFixed(2)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <StokItemLabelDialog
          item={selected}
          fetchLabels={source.fetchLabels}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** Dialog rincian label per pallet — ala StokItemLabelDialog (tanpa kolom SAK). */
function StokItemLabelDialog({
  item,
  fetchLabels,
  onClose,
}: {
  item: StokItem;
  fetchLabels: LabelsAction;
  onClose: () => void;
}) {
  const [labels, setLabels] = useState<StokLabelItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchLabels(item.idBB);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setLabels(res.items.filter((l) => l.beratSisa > 0));
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchLabels, item.idBB]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  const totalBerat = (labels ?? []).reduce((s, l) => s + l.beratSisa, 0);

  async function copyLabel(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-[18px] pb-3 pt-4">
          <span
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px]"
            style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
          >
            <InventoryIcon className="h-[19px] w-[19px]" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-[#1F2937]">
            {item.nama}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6]"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-px bg-[#E5E7EB]" />

        {loading || labels == null ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat label…
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="whitespace-pre-line text-xs text-[#64748B]">
              {`Gagal memuat label\n${error}`}
            </p>
          </div>
        ) : labels.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-[12.5px] text-[#9CA3AF]">
            <InventoryIcon className="h-7 w-7 text-[#CBD5E1]" />
            Tidak ada label untuk item ini
          </div>
        ) : (
          <>
            {/* Column header */}
            <div className="flex items-center bg-[#FAFAFA] px-[18px] py-[9px] text-[10.5px] font-bold tracking-wide text-[#9CA3AF]">
              <span className="flex-1">LABEL</span>
              <span className="w-[88px] text-right">TANGGAL</span>
              <span className="w-[96px] text-right">BERAT</span>
            </div>

            {/* Rows */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {labels.map((l) => (
                <div
                  key={`${l.noBahanBaku}-${l.noPallet}`}
                  className="flex items-center gap-3 border-b border-[#F1F5F9] px-[18px] py-[11px] hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => void copyLabel(l.label)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    title="Klik untuk salin"
                  >
                    <span className="truncate text-[13px] font-semibold text-[#1F2937]">
                      {l.label}
                    </span>
                    <CopyIcon className="h-3 w-3 shrink-0 text-[#CBD5E1]" />
                    {copied === l.label && (
                      <span className="shrink-0 rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-600">
                        Tersalin
                      </span>
                    )}
                  </button>
                  <span className="w-[88px] text-right text-[11.5px] font-semibold text-[#334155]">
                    {formatTanggalShort(l.dateCreate)}
                  </span>
                  <span className="w-[96px] text-right text-[12.5px] font-semibold text-[#334155]">
                    {l.beratSisa.toFixed(2)} kg
                  </span>
                </div>
              ))}
            </div>

            {/* Footer total */}
            <div className="flex items-center gap-3 border-t border-[#E5E7EB] bg-[#F8FAFC] px-[18px] py-3">
              <span className="flex-1 text-[12.5px] font-bold text-[#1F2937]">
                Total
              </span>
              <span className="w-[88px]" />
              <span className="w-[96px] text-right text-[12.5px] font-bold text-[#1F2937]">
                {totalBerat.toFixed(2)} kg
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-[20px] border px-2.5 py-[3px] text-[10px] font-medium transition-colors duration-150 ${
        active
          ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
          : "border-[#D1D5DB] bg-[#F3F4F6] text-[#4B5563] hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
