"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStokFwipAction,
  getStokFwipLabelsAction,
  getStokMixerAction,
  getStokMixerLabelsAction,
} from "@/app/(app)/production/inject/actions";
import {
  Loader2Icon,
  PackageIcon,
  RotateCcwIcon,
  TruckIcon,
  X,
} from "@/components/dashboard/icons";

const STOK_GREEN = "#059669";
const STOK_EMPTY = "#D1D5DB";
const PRIMARY = "#0277BD";

type StokSource = "fwip" | "mixer";

/** Baris stok per jenis, sudah dinormalisasi lintas kategori. */
type StokRow = {
  id: number;
  nama: string;
  date: string | null;
  qty: number;
};

/** Baris label rincian, sudah dinormalisasi lintas kategori. */
type LabelRow = {
  label: string;
  date: string | null;
  qty: number;
};

type SourceConfig = {
  /** Header kolom kuantitas: PCS (Furniture WIP) atau BERAT (Mixer). */
  qtyHeader: string;
  fmt: (v: number) => string;
  load: () => Promise<
    { ok: true; items: StokRow[] } | { ok: false; error: string }
  >;
  loadLabels: (
    id: number,
  ) => Promise<{ ok: true; items: LabelRow[] } | { ok: false; error: string }>;
};

/** Tablet: Furniture WIP → kolom PCS; Mixer → hanya Berat (tanpa Sak). */
const SOURCES: Record<StokSource, SourceConfig> = {
  fwip: {
    qtyHeader: "PCS",
    fmt: (v) => String(v),
    load: async () => {
      const res = await getStokFwipAction();
      if (!res.ok) return res;
      return {
        ok: true,
        items: res.items.map((i) => ({
          id: i.idCabinetWip,
          nama: i.nama,
          date: i.dateCreateTertua,
          qty: i.pcsSisa,
        })),
      };
    },
    loadLabels: async (id) => {
      const res = await getStokFwipLabelsAction(id);
      if (!res.ok) return res;
      return {
        ok: true,
        items: res.items.map((l) => ({
          label: l.noFurnitureWip,
          date: l.dateCreate,
          qty: l.pcs,
        })),
      };
    },
  },
  mixer: {
    qtyHeader: "BERAT",
    fmt: (v) => `${v.toFixed(2)} kg`,
    load: async () => {
      const res = await getStokMixerAction();
      if (!res.ok) return res;
      return {
        ok: true,
        items: res.items.map((i) => ({
          id: i.idBB,
          nama: i.nama,
          date: i.dateCreateTertua,
          qty: i.beratSisa,
        })),
      };
    },
    loadLabels: async (id) => {
      const res = await getStokMixerLabelsAction(id);
      if (!res.ok) return res;
      return {
        ok: true,
        items: res.items.map((l) => ({
          label: l.label,
          date: l.dateCreate,
          qty: l.beratSisa,
        })),
      };
    },
  },
};

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

/** Chip kategori ala tablet ProductionFilterChip. */
function CategoryChip({
  label,
  selected,
  icon,
  onClick,
}: {
  label: string;
  selected: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[10px] font-medium transition"
      style={{
        backgroundColor: selected ? "#1D4ED8" : "#F3F4F6",
        borderColor: selected ? "#1D4ED8" : "#D1D5DB",
        color: selected ? "#FFFFFF" : "#4B5563",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Panel isi "Stok Item" — kategori Furniture WIP + Mixer (Proses Inject,
 * sesuai tablet StokItemSection di inject_production_mesin_screen).
 */
export function StokItemPanel() {
  const [source, setSource] = useState<StokSource>("fwip");
  const [items, setItems] = useState<StokRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StokRow | null>(null);

  const cfg = SOURCES[source];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await SOURCES[source].load();
    setLoading(false);
    if (res.ok) setItems(res.items);
    else setError(res.error);
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await SOURCES[source].load();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setItems(res.items);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  // Tablet: stok kosong ke bawah (urutan lain tetap), tidak difilter.
  const sorted = [...(items ?? [])].sort(
    (a, b) => (a.qty <= 0 ? 1 : 0) - (b.qty <= 0 ? 1 : 0),
  );

  const sourceTabs: { id: StokSource; label: string; icon: React.ReactNode }[] =
    [
      {
        id: "fwip",
        label: "Furniture WIP",
        icon: <PackageIcon className="h-3 w-3" />,
      },
      { id: "mixer", label: "Mixer", icon: <TruckIcon className="h-3 w-3" /> },
    ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-white px-3.5 py-2">
        {sourceTabs.map((tab) => (
          <CategoryChip
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            selected={tab.id === source}
            onClick={() => {
              if (tab.id === source) return;
              setSelected(null);
              setLoading(true);
              setError(null);
              setItems(null);
              setSource(tab.id);
            }}
          />
        ))}
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
              const empty = item.qty <= 0;
              return (
                <button
                  key={`${source}-${item.id}-${item.nama}`}
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
                          {empty || !item.date ? "-" : formatDateShort(item.date)}
                        </p>
                      </div>
                      <div className="w-px bg-gray-200" />
                      <div className="min-w-0 flex-[2]">
                        <p className="text-[9px] font-semibold text-gray-400">
                          {cfg.qtyHeader === "PCS" ? "PCS" : "Berat"}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[11px] font-bold"
                          style={{ color: empty ? "#9CA3AF" : STOK_GREEN }}
                        >
                          {cfg.fmt(item.qty)}
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
          source={source}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** Dialog rincian label — hanya label yang masih punya sisa (qty > 0). */
function StokItemLabelDialog({
  item,
  source,
  onClose,
}: {
  item: StokRow;
  source: StokSource;
  onClose: () => void;
}) {
  const cfg = SOURCES[source];
  const [labels, setLabels] = useState<LabelRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await SOURCES[source].loadLabels(item.id);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setLabels(res.items.filter((l) => l.qty > 0));
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [source, item.id]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  const total = (labels ?? []).reduce((s, l) => s + l.qty, 0);

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
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
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
            <div className="flex items-center gap-3 bg-gray-50 px-[18px] py-[9px] text-[10.5px] font-bold tracking-wide text-gray-400">
              <span className="flex-1">LABEL</span>
              <span className="w-[88px] text-right">TANGGAL</span>
              <span className="w-[96px] text-right">{cfg.qtyHeader}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {labels.map((l) => (
                <div
                  key={`${l.label}-${l.date ?? ""}`}
                  className="flex items-center gap-3 border-b border-slate-100 px-[18px] py-[11px] hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => void copyLabel(l.label)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    title="Klik untuk salin"
                  >
                    <span className="truncate text-[12px] font-semibold text-gray-900">
                      {l.label}
                    </span>
                    <span className="text-[11px] text-slate-300">⧉</span>
                    {copied === l.label && (
                      <span className="shrink-0 rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-600">
                        Tersalin
                      </span>
                    )}
                  </button>
                  <span className="w-[88px] text-right text-[11.5px] font-semibold text-slate-700">
                    {formatDateShort(l.date)}
                  </span>
                  <span className="w-[96px] text-right text-[12.5px] font-semibold text-slate-700">
                    {cfg.fmt(l.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t border-gray-200 bg-slate-50 px-[18px] py-3">
              <span className="flex-1 text-[12.5px] font-bold text-gray-900">
                Total
              </span>
              <span className="w-[88px]" />
              <span className="w-[96px] text-right text-[12.5px] font-bold text-gray-900">
                {cfg.fmt(total)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
