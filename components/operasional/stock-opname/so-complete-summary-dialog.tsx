"use client";

import type { SoCompleteSummary } from "@/services/stock-opname-v2-service";
import { X } from "@/components/dashboard/icons";
import { soFormatQty } from "./so-format";
import {
  SoCheckCircleIcon,
  SoPersonOffIcon,
  SoWarningIcon,
} from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const MUTED = "#6B7280";
const INK = "#1A1D23";
const WARNING = "#B45309";
const WARNING_BG = "#FFF7ED";
const SUCCESS = "#0A7349";

export function SoCompleteSummaryDialog({
  summary,
  weightUnit,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  summary: SoCompleteSummary;
  weightUnit: "kg" | "pcs";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const qtyLabel = weightUnit === "pcs" ? "PCS" : "BERAT";
  const hasUnscanned = summary.total.unscannedCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              {summary.stockOpnameNo}
            </p>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {summary.categoryName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
          {hasUnscanned && (
            <div
              className="flex items-start gap-2.5 rounded-lg border px-3 py-3"
              style={{
                backgroundColor: WARNING_BG,
                borderColor: `${WARNING}4D`,
              }}
            >
              <SoWarningIcon
                className="mt-0.5 shrink-0"
                style={{ color: WARNING, width: 18, height: 18 }}
              />
              <p
                className="text-xs font-semibold leading-relaxed"
                style={{ color: WARNING }}
              >
                Masih ada {summary.total.unscannedCount} label yang belum
                di-scan. Setelah selesai, label ini tidak dapat di-scan lagi.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <StatTile label="TOTAL LABEL" value={String(summary.total.labelCount)} />
            <StatTile
              label="SUDAH SCAN"
              value={String(summary.total.scannedCount)}
              valueColor={SUCCESS}
            />
            <StatTile
              label="BELUM SCAN"
              value={String(summary.total.unscannedCount)}
              valueColor={summary.total.unscannedCount > 0 ? WARNING : undefined}
            />
            <StatTile
              label={qtyLabel}
              value={soFormatQty(summary.total.totalWeight)}
            />
          </div>

          {summary.perJenis.length > 0 && (
            <BreakdownSection
              title="PER JENIS"
              headLabel="Jenis"
              rows={summary.perJenis.map((j) => ({
                key: `j-${j.typeId}`,
                label: j.typeName,
                labelCount: j.labelCount,
                scannedCount: j.scannedCount,
                unscannedCount: j.unscannedCount,
                totalWeight: j.totalWeight,
              }))}
            />
          )}

          {summary.perBlok.length > 0 && (
            <BreakdownSection
              title="PER BLOK"
              headLabel="Blok"
              rows={summary.perBlok.map((b) => ({
                key: `b-${b.blok}`,
                label: `Blok ${b.blok} (${b.locationCount} lokasi)`,
                labelCount: b.labelCount,
                scannedCount: b.scannedCount,
                unscannedCount: b.unscannedCount,
                totalWeight: b.totalWeight,
              }))}
            />
          )}

          {summary.assignedUsersCount > 0 && (
            <div
              className="flex items-start gap-2.5 rounded-lg border px-3 py-3"
              style={{ backgroundColor: "#EFF6FF", borderColor: `${PRIMARY}40` }}
            >
              <SoPersonOffIcon
                className="mt-0.5 shrink-0"
                style={{ color: PRIMARY, width: 18, height: 18 }}
              />
              <p
                className="text-xs font-semibold leading-relaxed"
                style={{ color: PRIMARY }}
              >
                {summary.assignedUsersCount} penugasan user ke lokasi akan
                otomatis dihapus setelah SO ditandai selesai.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div
          className="flex gap-2.5 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-md border px-4 py-2.5 text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-[2] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: SUCCESS }}
          >
            <SoCheckCircleIcon className="h-4 w-4" />
            Tandai Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakdownSection({
  title,
  headLabel,
  rows,
}: {
  title: string;
  headLabel: string;
  rows: Array<{
    key: string;
    label: string;
    labelCount: number;
    scannedCount: number;
    unscannedCount: number;
    totalWeight: number;
  }>;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-extrabold tracking-[0.4px] text-[#6B7280]">
        {title}
      </p>
      <div
        className="mt-1.5 overflow-hidden rounded-md border"
        style={{ borderColor: BORDER }}
      >
        <div
          className="flex bg-[#FAFAFA] px-2.5 py-2"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <span className="flex-[3] text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
            {headLabel}
          </span>
          <span className="flex-[2] text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
            Scan
          </span>
          <span className="flex-[2] text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
            Qty
          </span>
        </div>
        {rows.map((row) => {
          const hasWarning = row.unscannedCount > 0;
          return (
            <div
              key={row.key}
              className="flex items-center px-2.5 py-2"
              style={{
                borderTop: "1px solid #F3F4F6",
                backgroundColor: hasWarning ? `${WARNING_BG}80` : undefined,
              }}
            >
              <span
                className="min-w-0 flex-[3] truncate text-xs font-semibold"
                style={{ color: INK }}
              >
                {row.label}
              </span>
              <span
                className="flex-[2] text-right text-[11.5px] font-bold"
                style={{ color: hasWarning ? WARNING : SUCCESS }}
              >
                {row.scannedCount}/{row.labelCount}
              </span>
              <span
                className="flex-[2] text-right text-[11.5px]"
                style={{ color: INK }}
              >
                {soFormatQty(row.totalWeight)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="min-w-0 flex-1 rounded-md border px-2.5 py-2"
      style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
    >
      <p className="text-[8.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-sm font-extrabold"
        style={{ color: valueColor ?? INK }}
      >
        {value}
      </p>
    </div>
  );
}
