"use client";

import { useEffect, useMemo, useState } from "react";
import { getStockItemsAction } from "@/app/(app)/operasional/stock/actions";
import type {
  StockItemRow,
  StockProsesMeta,
  StockSourceKey,
} from "@/services/stock-proses-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { StockLabelDialog } from "./stock-label-dialog";
import {
  stockFormatDate,
  stockKg,
  stockPcs,
} from "./stock-format";
import {
  StockAlertIcon,
  StockBoxIcon,
  StockCloseIcon,
  StockInboxIcon,
  StockLabelIcon,
  StockRefreshIcon,
  StockScaleIcon,
} from "./stock-icons";

const BORDER = "#E5E7EB";
const INK = "#1A1D23";
const GREEN = "#059669";
const MUTED = "#9CA3AF";

export function StockDetailDialog({
  meta,
  onClose,
}: {
  meta: StockProsesMeta;
  onClose: () => void;
}) {
  const [source, setSource] = useState<StockSourceKey>("proses");
  const [items, setItems] = useState<StockItemRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [labelTarget, setLabelTarget] = useState<StockItemRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getStockItemsAction(meta.key, source);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setError(null);
      } else {
        setItems(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.key, source, reloadKey]);

  const sorted = useMemo(() => {
    const list = items ?? [];
    const isEmpty = (row: StockItemRow) => {
      if (meta.showSak && meta.showBerat) {
        return row.sakSisa <= 0 && row.beratSisa <= 0;
      }
      if (meta.showBerat) return row.beratSisa <= 0;
      return row.sakSisa <= 0;
    };
    return [...list].sort((a, b) => Number(isEmpty(a)) - Number(isEmpty(b)));
  }, [items, meta.showSak, meta.showBerat]);

  const totalLabel = sorted.reduce((sum, row) => sum + row.labelSisa, 0);
  const totalBerat = sorted.reduce((sum, row) => sum + row.beratSisa, 0);

  const paneLabel =
    meta.key === "bahanBaku"
      ? source === "pakai"
        ? "Bahan Baku Pakai"
        : "Bahan Baku Proses"
      : meta.paneLabel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[640px] w-full max-w-[520px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Stok ${meta.label}`}
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
            {meta.label}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-md p-1.5 text-[#9CA3AF] hover:bg-gray-100"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <StockRefreshIcon style={{ width: 17, height: 17 }} />
          </button>
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

        {meta.hasSources && (
          <div className="flex h-[38px] shrink-0 items-center gap-2 px-4">
            <SourceChip
              label="Bahan Baku Proses"
              active={source === "proses"}
              onClick={() => setSource("proses")}
            />
            <SourceChip
              label="Bahan Baku Pakai"
              active={source === "pakai"}
              onClick={() => setSource("pakai")}
            />
          </div>
        )}

        <div
          className="mx-3 mt-3 mb-1.5 rounded-xl border bg-white px-3 py-3"
          style={{ borderColor: BORDER }}
        >
          {loading && !items && (
            <div className="flex h-10 items-center justify-center">
              <Loader2Icon className="h-[18px] w-[18px] animate-spin text-gray-400" />
            </div>
          )}
          {(!loading || items) && (
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
                >
                  <StockLabelIcon style={{ width: 16, height: 16 }} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#9CA3AF]">
                    Jumlah Label
                  </p>
                  <p
                    className="truncate text-[14px] font-bold"
                    style={{ color: INK }}
                  >
                    {totalLabel}
                  </p>
                </div>
              </div>
              <span
                className="h-9 w-px shrink-0"
                style={{ backgroundColor: BORDER }}
              />
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
                >
                  <StockScaleIcon style={{ width: 16, height: 16 }} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#9CA3AF]">
                    Total Berat
                  </p>
                  <p
                    className="truncate text-[14px] font-bold"
                    style={{ color: INK }}
                  >
                    {stockKg(totalBerat)} kg
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
          {loading && !items && (
            <div className="flex h-40 items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
              <StockAlertIcon
                style={{ width: 26, height: 26, color: "#DC2626" }}
              />
              <p className="text-xs text-slate-500">
                Gagal memuat stok item
                <br />
                {error}
              </p>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <StockInboxIcon style={{ width: 34, height: 34, color: "#CBD5E1" }} />
              <p className="text-xs text-[#9CA3AF]">Tidak ada data stok item</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.3px] text-[#9CA3AF]">
                {paneLabel}
              </p>
              {sorted.map((row, i) => (
                <ItemRow
                  key={`${row.id}-${i}`}
                  row={row}
                  showSak={meta.showSak}
                  showBerat={meta.showBerat}
                  onOpen={() => setLabelTarget(row)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {labelTarget && (
        <StockLabelDialog
          itemKey={meta.key}
          itemId={labelTarget.id}
          source={source}
          title={labelTarget.nama}
          showSak={meta.showSak}
          showBerat={meta.showBerat}
          onClose={() => setLabelTarget(null)}
        />
      )}
    </div>
  );
}

function SourceChip({
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
      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold transition"
      style={
        active
          ? { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8", color: "#FFFFFF" }
          : { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB", color: "#4B5563" }
      }
    >
      {label}
    </button>
  );
}

function ItemRow({
  row,
  showSak,
  showBerat,
  onOpen,
}: {
  row: StockItemRow;
  showSak: boolean;
  showBerat: boolean;
  onOpen: () => void;
}) {
  const empty = showSak && !showBerat ? row.sakSisa <= 0 : showBerat ? row.beratSisa <= 0 : row.sakSisa <= 0;
  const barColor = empty ? "#D1D5DB" : GREEN;
  const valueColor = empty ? MUTED : GREEN;
  const dateText = empty ? "-" : stockFormatDate(row.dateCreateTertua);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-stretch gap-0 overflow-hidden rounded-lg text-left"
      style={{ backgroundColor: "#F9FAFB" }}
    >
      <span className="w-1 shrink-0" style={{ backgroundColor: barColor }} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-2 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-[3]">
            <span className="block text-[9px] font-semibold text-[#9CA3AF]">
              Jenis
            </span>
            <span
              className="block truncate text-[11px] font-bold"
              style={{ color: empty ? MUTED : "#374151" }}
              title={row.nama}
            >
              {row.nama}
            </span>
          </span>
          <span className="min-w-0 flex-[2]">
            <span className="block text-[9px] font-semibold text-[#9CA3AF]">
              Tanggal
            </span>
            <span
              className="block truncate text-[11px] font-bold"
              style={{ color: empty ? MUTED : "#374151" }}
            >
              {dateText}
            </span>
          </span>
          <span className="min-w-0 flex-[2]">
            <span className="block text-[9px] font-semibold text-[#9CA3AF]">
              {showBerat ? "Berat" : "PCS"}
            </span>
            <span
              className="block truncate text-[11px] font-bold"
              style={{ color: valueColor }}
            >
              {showBerat
                ? `${stockKg(row.beratSisa)} kg`
                : stockPcs(row.sakSisa)}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
