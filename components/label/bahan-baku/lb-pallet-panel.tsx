"use client";

import type { LbPallet, LbPrintLock } from "@/services/label-bahan-baku-service";
import { fmtKgShort } from "./lb-format";
import {
  LbBlockIcon,
  LbGridIcon,
  LbInventoryIcon,
  LbPrintIcon,
  LbScaleIcon,
} from "./lb-icons";

type Props = {
  className?: string;
  hasSelection: boolean;
  pallets: LbPallet[];
  loading: boolean;
  error: string | null;
  selectedPallet: string | null;
  onSelectPallet: (pallet: LbPallet) => void;
  onOpenPopover: (pallet: LbPallet, x: number, y: number) => void;
  locks: Record<string, LbPrintLock>;
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

function isQcDone(p: LbPallet): boolean {
  return (
    p.Tenggelam != null || p.Density != null || p.Density2 != null || p.Density3 != null
  );
}

export function LbPalletPanel({
  className = "",
  hasSelection,
  pallets,
  loading,
  error,
  selectedPallet,
  onSelectPallet,
  onOpenPopover,
  locks,
}: Props) {
  const nonEmpty = pallets.filter((p) => !p.IsEmpty).length;
  const sakActual = pallets.reduce((s, p) => s + p.SakActual, 0);
  const sakSisa = pallets.reduce((s, p) => s + p.SakSisa, 0);
  const beratActual = pallets.reduce((s, p) => s + p.BeratActual, 0);
  const beratSisa = pallets.reduce((s, p) => s + p.BeratSisa, 0);

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-sm lg:h-full ${className}`}
    >
      <div className="shrink-0 px-4 pt-3">
        <p className="text-[15px] font-bold tracking-[0.5px] text-[#172B4D]">PALLET</p>
        <div className="mt-2 space-y-2 rounded-xl border border-[#DCDFE4] bg-[#F8F9FB] p-3">
          <InfoLine
            icon={<LbGridIcon className="h-4 w-4" />}
            label="Jumlah Pallet"
            value={`${nonEmpty} / ${pallets.length}`}
          />
          <div className="border-t border-[#EBECF0]" />
          <InfoLine
            icon={<LbInventoryIcon className="h-4 w-4" />}
            label="Jumlah Sak"
            value={`${sakSisa} / ${sakActual}`}
          />
          <div className="border-t border-[#EBECF0]" />
          <InfoLine
            icon={<LbScaleIcon className="h-4 w-4" />}
            label="Total Berat (kg)"
            value={`${fmtKgShort(beratSisa)} / ${fmtKgShort(beratActual)}`}
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
          {error}
        </div>
      )}

      {!hasSelection ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <LbGridIcon className="h-16 w-16 text-gray-300" />
          <p className="text-[13px] font-medium text-gray-500">
            Pilih bahan baku untuk melihat pallet
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          <div className="overflow-hidden rounded-xl border border-[#DCDFE4]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-gradient-to-b from-[#FCFDFE] to-[#F7F8F9] shadow-[0_1px_0_#DCDFE4]">
                <tr className="text-[11px] font-bold uppercase tracking-[0.35px] text-[#44546F]">
                  <th className="w-[76px] px-3 py-2.5">Pallet</th>
                  <th className="px-3 py-2.5">Jenis</th>
                  <th className="w-[64px] px-2 py-2.5 text-center">Lok</th>
                  <th className="w-[88px] px-2 py-2.5 text-center">Print</th>
                </tr>
              </thead>
              <tbody>
                {pallets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-500">
                      {loading ? "Memuat…" : "Tidak ada pallet"}
                    </td>
                  </tr>
                ) : (
                  pallets.map((p, i) => {
                    const active = p.NoPallet === selectedPallet;
                    const qc = isQcDone(p);
                    const lock = locks[p.NoPallet];
                    const lok =
                      !p.Blok && !p.IdLokasi ? "-" : `${p.Blok ?? ""}${p.IdLokasi ?? ""}`;
                    const bg = active
                      ? "#E9F2FF"
                      : qc
                        ? i % 2 === 0
                          ? "#EAFBF2"
                          : "#E3F7EC"
                        : i % 2 === 0
                          ? "#FFFFFF"
                          : "#FAFBFC";
                    return (
                      <tr
                        key={p.NoPallet}
                        onClick={(e) => {
                          if (p.IsEmpty) {
                            onOpenPopover(p, e.clientX, e.clientY);
                            return;
                          }
                          onSelectPallet(p);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onOpenPopover(p, e.clientX, e.clientY);
                        }}
                        className="cursor-pointer border-b border-[#EBECF0] last:border-b-0 hover:brightness-[0.985]"
                        style={{
                          backgroundColor: bg,
                          ...(active ? { boxShadow: "inset 3px 0 0 #0C66E4" } : {}),
                        }}
                      >
                        <td className="px-3 py-2 text-[13px]">
                          <span
                            className="inline-flex items-center gap-1.5 font-semibold"
                            style={
                              active
                                ? { color: "#0C66E4", fontWeight: 700 }
                                : p.IsEmpty
                                  ? { color: "#6B7280" }
                                  : { color: "#172B4D" }
                            }
                          >
                            {p.NoPallet}
                            {p.IsEmpty && <LbBlockIcon className="h-3.5 w-3.5 text-gray-500" />}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[13px] text-[#172B4D]">
                          {p.NamaJenisPlastik || "-"}
                        </td>
                        <td className="px-2 py-2 text-center text-[13px] text-[#172B4D]">{lok}</td>
                        <td
                          className="cursor-pointer px-2 py-2 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPopover(p, e.clientX, e.clientY);
                          }}
                        >
                          {lock ? (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold"
                              title={`Sedang diprint oleh ${lock.username ?? lock.lockedBy ?? "user lain"}`}
                              style={{
                                backgroundColor: "rgba(178,106,0,0.12)",
                                borderColor: "rgba(178,106,0,0.30)",
                                color: "#B26A00",
                              }}
                            >
                              Printing
                            </span>
                          ) : p.HasBeenPrinted > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                              style={{
                                backgroundColor: "rgba(12,102,228,0.10)",
                                borderColor: "rgba(12,102,228,0.30)",
                                color: "#0C66E4",
                              }}
                            >
                              <LbPrintIcon className="h-3 w-3" />
                              {p.HasBeenPrinted}x
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                              style={{
                                backgroundColor: "#F3F4F6",
                                borderColor: "#DCDFE4",
                                color: "#6B7280",
                              }}
                            >
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Klik baris kosong / kanan klik baris / klik chip PRINT untuk menu cetak.
          </p>
        </div>
      )}
    </section>
  );
}
