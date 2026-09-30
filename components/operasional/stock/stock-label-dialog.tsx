"use client";

import { useEffect, useRef, useState } from "react";
import { getStockLabelsAction } from "@/app/(app)/operasional/stock/actions";
import type {
  StockLabelRow,
  StockProsesKey,
  StockSourceKey,
} from "@/services/stock-proses-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import {
  stockFormatDate,
  stockKg,
  stockPcs,
} from "./stock-format";
import {
  StockBoxIcon,
  StockCloseIcon,
  StockCopyIcon,
  StockErrorIcon,
  StockInboxIcon,
} from "./stock-icons";

const BORDER = "#E5E7EB";
const INK = "#1A1D23";

export function StockLabelDialog({
  itemKey,
  itemId,
  source,
  title,
  showSak,
  showBerat,
  onClose,
}: {
  itemKey: StockProsesKey;
  itemId: number;
  source: StockSourceKey;
  title: string;
  showSak: boolean;
  showBerat: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<StockLabelRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getStockLabelsAction(itemKey, itemId, source);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setRows(res.labels);
        setError(null);
      } else {
        setRows(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemKey, itemId, source]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const filtered = (rows ?? []).filter((row) =>
    showBerat ? row.beratSisa > 0 : row.sakSisa > 0,
  );
  const sumSak = filtered.reduce((sum, row) => sum + row.sakSisa, 0);
  const sumBerat = filtered.reduce((sum, row) => sum + row.beratSisa, 0);

  const copyLabel = async (label: string) => {
    try {
      await navigator.clipboard.writeText(label);
    } catch {
      return;
    }
    setFlash(`Label "${label}" disalin`);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1000);
  };

  const sakHeader = showSak ? "PCS" : "SAK";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[580px] w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Label ${title}`}
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <span
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px]"
            style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
          >
            <StockBoxIcon style={{ width: 19, height: 19 }} />
          </span>
          <p
            className="min-w-0 flex-1 truncate text-[14.5px] font-bold"
            style={{ color: "#1F2937" }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <StockCloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}` }} />

        <div className="relative min-h-0 flex-1 overflow-auto">
          {loading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
              <StockErrorIcon style={{ width: 28, height: 28, color: "#DC2626" }} />
              <p className="text-xs text-gray-500">
                Gagal memuat label
                <br />
                {error}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
              <StockInboxIcon style={{ width: 28, height: 28, color: "#CBD5E1" }} />
              <p className="text-[12.5px] text-[#9CA3AF]">
                Tidak ada label untuk item ini
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div>
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ backgroundColor: "#FAFAFA" }}
              >
                <span className="min-w-0 flex-1 text-[10.5px] font-bold tracking-[0.4px] text-[#9CA3AF]">
                  LABEL
                </span>
                <span className="w-[88px] text-right text-[10.5px] font-bold tracking-[0.4px] text-[#9CA3AF]">
                  TANGGAL
                </span>
                {showSak && (
                  <span className="w-16 text-right text-[10.5px] font-bold tracking-[0.4px] text-[#9CA3AF]">
                    {sakHeader}
                  </span>
                )}
                <span className="w-24 text-right text-[10.5px] font-bold tracking-[0.4px] text-[#9CA3AF]">
                  BERAT
                </span>
              </div>

              {filtered.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  className="flex items-center gap-2 px-4 py-[11px]"
                  style={{ borderTop: i === 0 ? `1px solid #F1F5F9` : undefined, borderBottom: "1px solid #F1F5F9" }}
                >
                  <button
                    type="button"
                    onClick={() => void copyLabel(row.label)}
                    className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    title="Salin label"
                  >
                    <span className="min-w-0 truncate text-[13px] font-semibold text-[#1F2937]">
                      {row.label}
                    </span>
                    <StockCopyIcon
                      className="shrink-0 text-gray-300 group-hover:text-gray-500"
                      style={{ width: 13, height: 13 }}
                    />
                  </button>
                  <span className="w-[88px] text-right text-[11.5px] font-semibold text-[#334155]">
                    {stockFormatDate(row.dateCreate)}
                  </span>
                  {showSak && (
                    <span className="w-16 text-right text-[12.5px] font-semibold text-[#334155]">
                      {stockPcs(row.sakSisa)}
                    </span>
                  )}
                  <span className="w-24 text-right text-[12.5px] font-semibold text-[#334155]">
                    {stockKg(row.beratSisa)} kg
                  </span>
                </div>
              ))}

              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ backgroundColor: "#F8FAFC", borderTop: `1px solid ${BORDER}` }}
              >
                <span
                  className="min-w-0 flex-1 text-[12.5px] font-bold"
                  style={{ color: INK }}
                >
                  Total
                </span>
                {showSak && (
                  <span className="w-16 text-right text-[12.5px] font-bold text-[#334155]">
                    {sumSak}
                  </span>
                )}
                <span className="w-24 text-right text-[12.5px] font-bold text-[#334155]">
                  {stockKg(sumBerat)} kg
                </span>
              </div>
            </div>
          )}
        </div>

        {flash && (
          <div
            className="shrink-0 border-t px-4 py-2 text-center text-[12px] font-semibold"
            style={{ backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", color: "#047857" }}
          >
            {flash}
          </div>
        )}
      </div>
    </div>
  );
}
