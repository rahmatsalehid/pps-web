"use client";

import { X } from "@/components/dashboard/icons";

const ACCENT = "#0277BD";
const BORDER = "#E2E6EA";

export type InputSakChip = {
  id: string;
  /** Contoh: "Sak 3" atau nomor bonggolan */
  label: string;
  berat: number | null;
  isTemp: boolean;
  isPartial: boolean;
  onDelete?: () => void;
};

export type InputLabelGroup = {
  /** Grouping key (unik per label) */
  key: string;
  /** namaJenis produk */
  title: string;
  /** Nomor label yang ditampilkan (noBahanBaku-pallet / noBonggolan) */
  subtitle: string;
  sakCount: number;
  berat: number;
  hasPartial: boolean;
  isTemp: boolean;
  chips: InputSakChip[];
  /** true → tampilkan metrik "N sak"; false → hanya kg (Bonggolan) */
  showSakMetric: boolean;
};

function fmtKg(v: number | null): string {
  if (v == null) return "-";
  const s = v.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

export function MixerInputLabelDialog({
  group,
  canModify,
  onClose,
}: {
  group: InputLabelGroup;
  canModify: boolean;
  onClose: () => void;
}) {
  const metrics: string[] = [];
  if (group.showSakMetric) metrics.push(`${group.sakCount} sak`);
  metrics.push(`${group.berat.toFixed(2)} kg`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail label ${group.subtitle}`}
      >
        {/* Header — seperti ProductionSakChipDetailDialog tablet */}
        <div
          className="flex items-start gap-2.5 px-5 py-3.5"
          style={{ backgroundColor: ACCENT }}
        >
<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm text-white/90"
            style={{ backgroundColor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            🏷
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {group.subtitle || group.title || "-"}
            </p>
            <p className="truncate text-[11px] text-white/80">{group.title}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-white/90">
              {metrics.map((m) => (
                <span key={m}>{m}</span>
              ))}
              {group.isTemp && (
                <span className="rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
                  PENDING
                </span>
              )}
              {group.hasPartial && (
                <span className="rounded-full bg-orange-500/30 px-2 py-0.5 text-[10px] font-extrabold">
                  PARTIAL
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white hover:bg-white/15"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chip grid */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {group.chips.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">Tidak ada detail</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
              {group.chips.map((chip) => {
                const bg = chip.isTemp
                  ? "#FFFBEB"
                  : chip.isPartial
                    ? "#FFF7ED"
                    : "#F0F7FF";
                const border = chip.isTemp
                  ? "#FCD34D"
                  : chip.isPartial
                    ? "#FDBA74"
                    : "#BFDBFE";
                const text = chip.isPartial ? "#9A3412" : "#1D4ED8";
                return (
                  <div
                    key={chip.id}
                    className="relative rounded-lg border p-2 text-center"
                    style={{ backgroundColor: bg, borderColor: border }}
                  >
                    {chip.isPartial && (
                      <span
                        className="absolute right-1 top-1 h-2 w-2 rounded-full"
                        style={{ backgroundColor: "#FB923C" }}
                      />
                    )}
                    {canModify && chip.onDelete && (
                      <button
                        type="button"
                        onClick={chip.onDelete}
                        className="absolute left-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-red-400 text-white hover:bg-red-500"
                        aria-label="Hapus"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <p
                      className="truncate text-[10px] font-extrabold"
                      style={{ color: text }}
                      title={chip.label}
                    >
                      {chip.label}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold text-gray-700">
                      {fmtKg(chip.berat)} kg
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex justify-end border-t px-5 py-3"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
