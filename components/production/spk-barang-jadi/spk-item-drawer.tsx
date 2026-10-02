"use client";

import type { ReactNode } from "react";
import type {
  SpkHistoryItem,
  SpkMonitoringItem,
} from "@/services/spk-barang-jadi-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { spkFormatDate, spkFormatNumber, spkStatusMeta } from "./spk-format";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const MUTED = "#6B7280";
const INK = "#1A1D23";

export function SpkItemDrawer({
  item,
  history,
  historyLoading,
  historyError,
  selected,
  onClose,
  onToggleSelect,
}: {
  item: SpkMonitoringItem | null;
  history: SpkHistoryItem[] | null;
  historyLoading: boolean;
  historyError: string | null;
  selected: boolean;
  onClose: () => void;
  onToggleSelect: (item: SpkMonitoringItem) => void;
}) {
  if (!item) return null;

  const status = spkStatusMeta(item.status);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40">
      <button
        type="button"
        className="min-w-0 flex-1 cursor-default"
        aria-label="Tutup panel"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              {item.namaBJ}
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {item.itemCode || "-"} &middot; {item.uom || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div
            className="grid grid-cols-2 gap-3 rounded-md border p-3"
            style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
          >
            <InfoCell label="Stok Saat Ini" value={spkFormatNumber(item.stock)} />
            <InfoCell
              label="Status"
              value={status.label}
              color={status.color}
            />
            <InfoCell
              label="Stok Minimum"
              value={spkFormatNumber(item.minStock)}
            />
            <InfoCell
              label="Stok Maksimum"
              value={spkFormatNumber(item.maxStock)}
            />
            <InfoCell label="MPQ" value={spkFormatNumber(item.mpq)} />
            <InfoCell
              label="Qty Rekomendasi"
              value={spkFormatNumber(item.qtyRekomendasi)}
              color={PRIMARY}
            />
          </div>

          <button
            type="button"
            onClick={() => onToggleSelect(item)}
            className="mt-4 w-full rounded-md px-4 py-2.5 text-[13px] font-bold text-white transition"
            style={{ backgroundColor: selected ? MUTED : PRIMARY }}
          >
            {selected ? "Batalkan Pilihan" : "Pilih untuk Buat SPK"}
          </button>

          <p
            className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.4px]"
            style={{ color: MUTED }}
          >
            Riwayat SPK
          </p>

          <div
            className="mt-1.5 overflow-hidden rounded-md border"
            style={{ borderColor: BORDER }}
          >
            {historyLoading && (
              <div className="flex h-24 items-center justify-center">
                <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}

            {!historyLoading && historyError && (
              <p className="px-3 py-4 text-center text-xs font-semibold text-red-700">
                {historyError}
              </p>
            )}

            {!historyLoading && !historyError && (history?.length ?? 0) === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">
                Belum ada riwayat SPK untuk barang ini
              </p>
            )}

            {!historyLoading && !historyError && history && history.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse text-left">
                  <thead>
                    <tr style={{ backgroundColor: "#FAFAFA" }}>
                      <HistTh>No. SPK</HistTh>
                      <HistTh>Tanggal</HistTh>
                      <HistTh align="right">Qty SPK</HistTh>
                      <HistTh align="right">Selesai</HistTh>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, idx) => (
                      <tr
                        key={`${row.noSpk}-${idx}`}
                        style={{ borderTop: "1px solid #F0F2F5" }}
                      >
                        <HistTd strong>{row.noSpk}</HistTd>
                        <HistTd>{spkFormatDate(row.tanggal)}</HistTd>
                        <HistTd align="right" strong>
                          {spkFormatNumber(row.qtySpk)}
                        </HistTd>
                        <HistTd align="right">
                          {spkFormatNumber(row.qtySelesai)}
                        </HistTd>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[13px] font-extrabold"
        style={{ color: color ?? INK }}
      >
        {value}
      </p>
    </div>
  );
}

function HistTh({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280] ${
        align === "right" ? "text-right" : ""
      }`}
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      {children}
    </th>
  );
}

function HistTd({
  children,
  align = "left",
  strong = false,
}: {
  children: ReactNode;
  align?: "left" | "right";
  strong?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-xs ${
        align === "right" ? "text-right" : ""
      } ${strong ? "font-bold" : ""}`}
      style={{ color: INK }}
    >
      {children}
    </td>
  );
}
