"use client";

import type { LbDetail } from "@/services/label-bahan-baku-service";
import { fmtKg, fmtKgShort, isDetailUsed } from "./lb-format";
import {
  LbDropIcon,
  LbInventoryIcon,
  LbScaleIcon,
  LbSplitIcon,
} from "./lb-icons";

type Props = {
  className?: string;
  hasSelection: boolean;
  details: LbDetail[];
  loading: boolean;
  error: string | null;
};

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-[#6B778C]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] leading-tight text-[#6B778C]">{label}</p>
        <p className="text-[14.5px] font-extrabold leading-tight tracking-[0.2px] text-[#172B4D]">
          {value}
        </p>
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: "P" | "L"; tone: "red" | "blue" }) {
  const cls =
    tone === "red"
      ? "bg-red-100 border-red-300 text-red-800"
      : "bg-blue-100 border-blue-300 text-blue-800";
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

export function LbDetailPanel({ className = "", hasSelection, details, loading, error }: Props) {
  const available = details.filter((d) => !isDetailUsed(d.DateUsage));
  const totalBerat = details.reduce((s, d) => s + d.Berat, 0);
  const availableBerat = available.reduce((s, d) => s + d.Berat, 0);
  const partialCount = available.filter((d) => d.IsPartial).length;
  const lembabCount = available.filter((d) => d.IsLembab).length;

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm lg:h-full ${className}`}
    >
      <div className="shrink-0 px-4 pt-3">
        <p className="text-[15px] font-bold tracking-[0.5px] text-[#172B4D]">DETAIL SAK</p>
        <div className="mt-2 space-y-2 rounded-xl border border-[#DCDFE4] bg-[#F8F9FB] p-3">
          <InfoLine
            icon={<LbInventoryIcon className="h-4 w-4" />}
            label="Jumlah Sak"
            value={`${available.length} / ${details.length}`}
          />
          <div className="border-t border-[#EBECF0]" />
          <InfoLine
            icon={<LbScaleIcon className="h-4 w-4" />}
            label="Total Berat (kg)"
            value={`${fmtKgShort(availableBerat)} / ${fmtKgShort(totalBerat)}`}
          />
          {partialCount > 0 && (
            <>
              <div className="border-t border-[#EBECF0]" />
              <div className="flex items-center gap-2 text-[13px] font-semibold text-red-700">
                <LbSplitIcon className="h-4 w-4" />
                Partial: {partialCount}
              </div>
            </>
          )}
          {lembabCount > 0 && (
            <>
              <div className="border-t border-[#EBECF0]" />
              <div className="flex items-center gap-2 text-[13px] font-semibold text-blue-700">
                <LbDropIcon className="h-4 w-4" />
                Lembab: {lembabCount}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      {!hasSelection ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <LbInventoryIcon className="h-16 w-16 text-gray-300" />
          <p className="text-[13px] font-medium text-gray-500">
            Pilih pallet untuk melihat detail sak
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          <div className="overflow-hidden rounded-xl border border-[#DCDFE4]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-gradient-to-b from-[#FCFDFE] to-[#F7F8F9] shadow-[0_1px_0_#DCDFE4]">
                <tr className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#44546F]">
                  <th className="w-[56px] px-3 py-2.5">Sak</th>
                  <th className="px-3 py-2.5">Berat</th>
                  <th className="w-[76px] px-2 py-2.5 text-center">Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-[13px] text-gray-500">
                      {loading ? "Memuat…" : "Tidak ada data"}
                    </td>
                  </tr>
                ) : (
                  details.map((d, i) => {
                    const used = isDetailUsed(d.DateUsage);
                    const beratColor = used
                      ? "#9CA3AF"
                      : d.IsPartial
                        ? "#DC2626"
                        : d.IsLembab
                          ? "#2563EB"
                          : "#172B4D";
                    const beratWeight = used ? 600 : d.IsPartial || d.IsLembab ? 800 : 600;
                    return (
                      <tr
                        key={d.NoSak}
                        className="border-b border-[#EBECF0] last:border-b-0"
                        style={{ backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFBFC" }}
                      >
                        <td
                          className="px-3 py-2 text-[13px] font-semibold"
                          style={{ color: used ? "#9CA3AF" : "#172B4D" }}
                        >
                          {d.NoSak}
                        </td>
                        <td
                          className="px-3 py-2 text-[13px]"
                          style={{ color: beratColor, fontWeight: beratWeight }}
                        >
                          {fmtKg(d.Berat)}
                        </td>
                        <td
                          className="px-2 py-2 text-center"
                          style={used ? { opacity: 0.55 } : undefined}
                        >
                          {d.IsPartial && d.IsLembab ? (
                            <span className="inline-flex items-center gap-1">
                              <Badge label="P" tone="red" />
                              <Badge label="L" tone="blue" />
                            </span>
                          ) : d.IsPartial ? (
                            <Badge label="P" tone="red" />
                          ) : d.IsLembab ? (
                            <Badge label="L" tone="blue" />
                          ) : (
                            <span className="text-[13px] text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
