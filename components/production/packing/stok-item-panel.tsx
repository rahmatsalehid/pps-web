"use client";

import { useEffect, useState } from "react";
import {
  getPackingStokAction,
  getPackingStokLabelsAction,
} from "@/app/(app)/production/packing/actions";
import type { StokBjItem, StokBjLabel } from "@/services/packing-service";
import {
  Loader2Icon,
  PackageIcon,
  RotateCcwIcon,
  X,
} from "@/components/dashboard/icons";

const STOK_GREEN = "#059669";
const STOK_EMPTY = "#D1D5DB";
const PRIMARY = "#0277BD";

function formatDateShort(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isEmptyItem(item: StokBjItem): boolean {
  return item.pcsSisa <= 0;
}

/** Segmented switcher ala tablet SidebarTabSwitcher. */
export function DrawerTabSwitcher({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-gray-200 bg-white p-2">
      <div className="flex gap-0.5 rounded-lg bg-gray-100 p-[3px]">
        {tabs.map((tab) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Panel isi tab "Stok Item" — Barang Jadi (Proses Packing,
 * sesuai tablet StokItemSection: kolom Jenis | Tanggal | PCS).
 */
export function StokItemPanel() {
  const [items, setItems] = useState<StokBjItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StokBjItem | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await getPackingStokAction();
    setLoading(false);
    if (res.ok) setItems(res.items);
    else setError(res.error);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPackingStokAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setItems(res.items);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = [...(items ?? [])].sort((a, b) => {
    const aEmpty = isEmptyItem(a) ? 1 : 0;
    const bEmpty = isEmptyItem(b) ? 1 : 0;
    return aEmpty - bEmpty;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-white px-3.5 py-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#1D4ED8] bg-[#1D4ED8] px-2.5 py-[3px] text-[10px] font-medium text-white">
          <PackageIcon className="h-3 w-3" />
          Barang Jadi
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          title="Muat ulang"
        >
          <RotateCcwIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {loading || items == null ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat stok…
          </div>
        ) : error ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-gray-500">
            <span>Gagal memuat stok item</span>
            <span className="text-xs text-red-500">{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
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
                  key={`${item.idBj}-${item.nama}`}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full overflow-hidden rounded-[10px] border border-gray-200 bg-white text-left transition hover:shadow-sm"
                  title="Lihat rincian label"
                >
                  <span
                    className="w-1 shrink-0"
                    style={{ backgroundColor: empty ? STOK_EMPTY : STOK_GREEN }}
                  />
                  <div className="min-w-0 flex-1 p-2.5">
                    <div className="flex gap-2 rounded-lg bg-gray-50 p-2">
                      <div className="min-w-0 flex-[3]">
                        <p className="text-[9px] font-semibold text-gray-400">
                          Jenis
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-gray-800">
                          {item.nama}
                        </p>
                      </div>
                      <div className="w-px bg-gray-200" />
                      <div className="min-w-0 flex-[2]">
                        <p className="text-[9px] font-semibold text-gray-400">
                          Tanggal
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-gray-700">
                          {empty || !item.dateCreateTertua
                            ? "-"
                            : formatDateShort(item.dateCreateTertua)}
                        </p>
                      </div>
                      <div className="w-px bg-gray-200" />
                      <div className="min-w-0 flex-[2]">
                        <p className="text-[9px] font-semibold text-gray-400">
                          PCS
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11px] font-bold"
                          style={{ color: empty ? "#9CA3AF" : STOK_GREEN }}
                        >
                          {item.pcsSisa}
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
        <StokItemLabelDialog item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StokItemLabelDialog({
  item,
  onClose,
}: {
  item: StokBjItem;
  onClose: () => void;
}) {
  const [labels, setLabels] = useState<StokBjLabel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPackingStokLabelsAction(item.idBj);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setLabels(res.items.filter((l) => l.pcs > 0));
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.idBj]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  const totalPcs = (labels ?? []).reduce((s, l) => s + l.pcs, 0);

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
        <div
          className="flex items-center gap-3 px-4.5 py-4"
          style={{ padding: "16px 16px 12px" }}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: "#EFF6FF", color: PRIMARY }}
          >
            <PackageIcon className="h-[18px] w-[18px]" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">
            {item.nama}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-px bg-gray-200" />

        {loading || labels == null ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat label…
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 px-6 text-center text-sm text-gray-500">
            <span>Gagal memuat label</span>
            <span className="text-xs text-red-500">{error}</span>
          </div>
        ) : labels.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <PackageIcon className="h-7 w-7 text-slate-300" />
            Tidak ada label untuk item ini
          </div>
        ) : (
          <>
            <div
              className="flex items-center gap-3 bg-gray-50 px-4.5 py-2 text-[10.5px] font-bold tracking-wide text-gray-400"
              style={{
                paddingLeft: 18,
                paddingRight: 18,
                paddingTop: 9,
                paddingBottom: 9,
              }}
            >
              <span className="flex-1">LABEL</span>
              <span className="w-[88px] text-right">TANGGAL</span>
              <span className="w-[72px] text-right">PCS</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {labels.map((l) => (
                <div
                  key={`${l.noBj}-${l.dateCreate ?? ""}`}
                  className="flex items-center gap-3 border-b border-slate-100 px-4.5 py-2.5 hover:bg-slate-50"
                  style={{
                    paddingLeft: 18,
                    paddingRight: 18,
                    paddingTop: 11,
                    paddingBottom: 11,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void copyLabel(l.noBj)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    title="Klik untuk salin"
                  >
                    <span className="truncate text-[12px] font-semibold text-gray-900">
                      {l.noBj}
                    </span>
                    <span className="text-[11px] text-slate-300">⧉</span>
                    {copied === l.noBj && (
                      <span className="shrink-0 rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-600">
                        Tersalin
                      </span>
                    )}
                  </button>
                  <span className="w-[88px] text-right text-[11.5px] font-semibold text-slate-700">
                    {formatDateShort(l.dateCreate)}
                  </span>
                  <span className="w-[72px] text-right text-[12.5px] font-semibold text-slate-700">
                    {l.pcs}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-3 border-t border-gray-200 bg-slate-50 px-4.5 py-3"
              style={{ paddingLeft: 18, paddingRight: 18 }}
            >
              <span className="flex-1 text-[12.5px] font-bold text-gray-900">
                Total
              </span>
              <span className="w-[88px]" />
              <span className="w-[72px] text-right text-[12.5px] font-bold text-gray-900">
                {totalPcs}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
