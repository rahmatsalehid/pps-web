"use client";

import type { ReactNode } from "react";
import type { SpkDetail } from "@/services/spk-barang-jadi-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { spkFormatDate, spkFormatNumber, spkStatusMeta } from "./spk-format";
import { SpkPrinterIcon } from "./spk-icons";

const BORDER = "#E2E6EA";
const MUTED = "#6B7280";
const INK = "#1A1D23";
const PRIMARY = "#1E6FD9";
const SUCCESS = "#0A7349";

export function SpkDetailDialog({
  noSpk,
  loading,
  error,
  detail,
  onClose,
  onPrint,
  onRetry,
}: {
  noSpk: string;
  loading: boolean;
  error: string | null;
  detail: SpkDetail | null;
  onClose: () => void;
  onPrint: () => void;
  onRetry: () => void;
}) {
  const totalQty = (detail?.items ?? []).reduce((sum, i) => sum + i.qtySpk, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              Detail SPK
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">{noSpk}</p>
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
          {loading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-bold text-[#1E6FD9] underline"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              <div
                className="grid grid-cols-2 gap-3 rounded-md border px-3 py-2.5 sm:grid-cols-4"
                style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
              >
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                    Tanggal
                  </p>
                  <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                    {spkFormatDate(detail.tanggal)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                    Status
                  </p>
                  <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                    {detail.status}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                    Jumlah Barang
                  </p>
                  <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                    {detail.items.length}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                    Total Qty SPK
                  </p>
                  <p className="mt-0.5 text-xs font-extrabold text-[#1A1D23]">
                    {spkFormatNumber(totalQty)}
                  </p>
                </div>
              </div>

              {detail.keterangan && (
                <p className="mt-3 text-xs text-[#6B7280]">
                  Keterangan: {detail.keterangan}
                </p>
              )}

              <div
                className="mt-4 overflow-hidden rounded-md border"
                style={{ borderColor: BORDER }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr style={{ backgroundColor: "#FAFAFA" }}>
                        <Th>#</Th>
                        <Th>Item Code</Th>
                        <Th>Barang</Th>
                        <Th>UOM</Th>
                        <Th align="right">Stok Saat SPK</Th>
                        <Th align="right">Rekomendasi</Th>
                        <Th align="right">Qty SPK</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item, idx) => {
                        const status = spkStatusMeta(item.status);
                        return (
                          <tr
                            key={item.idSPKDetail}
                            style={{ borderTop: "1px solid #F0F2F5" }}
                          >
                            <Td>{idx + 1}</Td>
                            <Td>{item.itemCode || "-"}</Td>
                            <Td strong>{item.namaBJ}</Td>
                            <Td>{item.uom || "-"}</Td>
                            <Td align="right">
                              {spkFormatNumber(item.stockSaatSPK)}
                            </Td>
                            <Td align="right" color={PRIMARY}>
                              {spkFormatNumber(item.qtyRekomendasi)}
                            </Td>
                            <Td align="right" strong>
                              {spkFormatNumber(item.qtySpk)}
                            </Td>
                            <Td>
                              <span
                                className="inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-bold"
                                style={{
                                  backgroundColor: `${status.color}1A`,
                                  color: status.color,
                                }}
                              >
                                {status.label}
                              </span>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className="flex gap-2.5 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border px-4 py-2.5 text-[13px] font-semibold hover:bg-gray-50"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!detail}
            className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: SUCCESS }}
          >
            <SpkPrinterIcon className="h-4 w-4" />
            Cetak SPK
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
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

function Td({
  children,
  align = "left",
  strong = false,
  color,
}: {
  children: ReactNode;
  align?: "left" | "right";
  strong?: boolean;
  color?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-xs ${
        align === "right" ? "text-right" : ""
      } ${strong ? "font-bold" : ""}`}
      style={{ color: color ?? INK }}
    >
      {children}
    </td>
  );
}
