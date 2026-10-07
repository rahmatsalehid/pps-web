"use client";

import type { ReactNode } from "react";
import { X } from "@/components/dashboard/icons";
import { SoAlertIcon, SoCheckCircleIcon, SoCircleIcon } from "../stock-opname/so-icons";
import type { SoOldLabelStats } from "./so-old-label-panel";
import {
  soOldFormatBerat,
  soOldFormatQty,
  soOldLokasiHeader,
} from "./so-old-format";

export function SoOldSummaryDialog({
  noSO,
  tgl,
  category,
  blok,
  idLokasi,
  stock,
  scan,
  onClose,
}: {
  noSO: string;
  tgl: string;
  category: string;
  blok: string | null;
  idLokasi: number | null;
  stock: SoOldLabelStats;
  scan: { totalData: number; totalSak: number; totalBerat: number };
  onClose: () => void;
}) {
  const global = stock.totalLabelGlobal;
  const scanned = scan.totalData;
  const unscanned = stock.totalData;
  const pScan = global > 0 ? (scanned / global) * 100 : 0;
  const pUnscan = global > 0 ? (unscanned / global) * 100 : 0;
  const scanEnd = Math.min(100, pScan);
  const unscanEnd = Math.min(100, pScan + pUnscan);
  const donutBackground =
    scanEnd <= 0 && unscanEnd <= 0
      ? "#E5E7EB"
      : `conic-gradient(#16A34A 0 ${scanEnd}%, #EA580C ${scanEnd}% ${unscanEnd}%, #E5E7EB ${unscanEnd}% 100%)`;

  const diffData = scan.totalData - stock.totalLabelGlobal;
  const diffSak = scan.totalSak - stock.totalSakGlobal;
  const diffBerat = scan.totalBerat - stock.totalBeratGlobal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6">
      <div className="flex max-h-[88vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-4 px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #1E40AF, #1D4ED8)",
          }}
        >
          <span className="rounded-2xl bg-white/20 p-2.5">
            <SoAlertIcon style={{ width: 26, height: 26, color: "#fff" }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-bold leading-tight text-white">
              Ringkasan Stock Opname
            </p>
            <p className="mt-1 truncate text-[13.5px] text-white/90">
              {tgl} • {noSO} ({category.toUpperCase()} -{" "}
              {soOldLokasiHeader(blok, idLokasi)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/20 p-2 text-white hover:bg-white/30"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6 lg:flex-row">
          <div className="flex shrink-0 flex-col gap-4 lg:w-[300px]">
            <div
              className="relative mx-auto aspect-square w-full max-w-[240px] rounded-full"
              style={{ background: donutBackground }}
            >
              <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="text-[22px] font-bold text-[#15803D]">
                    {pScan.toFixed(2)}%
                  </p>
                  <p className="text-[11px] font-medium text-gray-500">
                    Terscan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <LegendRow
                color="#16A34A"
                icon={<SoCheckCircleIcon style={{ width: 18, height: 18, color: "#16A34A" }} />}
                label="Sudah Terscan"
                value={scanned}
                percent={pScan}
              />
              <LegendRow
                color="#EA580C"
                icon={<SoCircleIcon style={{ width: 18, height: 18, color: "#EA580C" }} />}
                label="Belum Terscan"
                value={unscanned}
                percent={pUnscan}
              />
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryCard
              title="TOTAL STOCK"
              subtitle="Keseluruhan"
              gradient="linear-gradient(135deg, #2563EB, #60A5FA)"
              iconLabel="inv"
              data={stock.totalLabelGlobal}
              sak={stock.totalSakGlobal}
              berat={stock.totalBeratGlobal}
            />
            <SummaryCard
              title="SUDAH SCAN"
              subtitle="Terscan"
              gradient="linear-gradient(135deg, #16A34A, #4ADE80)"
              iconLabel="ok"
              data={scan.totalData}
              sak={scan.totalSak}
              berat={scan.totalBerat}
            />
            <SummaryCard
              title="BELUM SCAN"
              subtitle="Sisa"
              gradient="linear-gradient(135deg, #EA580C, #FB923C)"
              iconLabel="wait"
              data={stock.totalData}
              sak={stock.totalSak}
              berat={stock.totalBerat}
            />
            <div
              className="flex h-[148px] flex-col rounded-2xl p-4 text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, #111827, #1F2937)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-white/20 px-2 py-1.5 text-[11px] font-bold">
                  ±
                </span>
                <div>
                  <p className="text-[12px] font-bold">SELISIH</p>
                  <p className="text-[10px] text-white/70">Perbedaan</p>
                </div>
              </div>
              <div className="mt-auto space-y-1">
                <DiffRow label="Label" value={diffData} />
                <DiffRow label="Pcs" value={diffSak} />
                <DiffRow label="Berat" value={diffBerat} isBerat />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  icon,
  label,
  value,
  percent,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: `${color}14`,
        borderColor: `${color}4D`,
      }}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold" style={{ color }}>
          {label}
        </p>
        <p className="text-[11px] font-bold text-gray-600">{value} label</p>
      </div>
      <p className="text-[13px] font-bold" style={{ color }}>
        {percent.toFixed(2)}%
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  gradient,
  iconLabel,
  data,
  sak,
  berat,
}: {
  title: string;
  subtitle: string;
  gradient: string;
  iconLabel: string;
  data: number;
  sak: number;
  berat: number;
}) {
  return (
    <div
      className="flex h-[148px] flex-col rounded-2xl p-4 text-white shadow-lg"
      style={{ background: gradient }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-white/20 px-2 py-1.5 text-[11px] font-bold uppercase">
          {iconLabel}
        </span>
        <div>
          <p className="text-[12px] font-bold">{title}</p>
          <p className="text-[10px] text-white/80">{subtitle}</p>
        </div>
      </div>
      <div className="mt-auto space-y-1">
        <MetricRow label="Label" value={soOldFormatQty(data)} />
        <MetricRow label="Pcs" value={soOldFormatQty(sak)} />
        <MetricRow label="Berat" value={`${soOldFormatBerat(berat)} kg`} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="text-white/90">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function DiffRow({
  label,
  value,
  isBerat = false,
}: {
  label: string;
  value: number;
  isBerat?: boolean;
}) {
  const color = value > 0 ? "#4ADE80" : value < 0 ? "#F87171" : "#D1D5DB";
  const sign = value > 0 ? "+" : "";
  const text = isBerat
    ? `${sign}${value.toFixed(2)} kg`
    : `${sign}${Math.trunc(value)}`;
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "=";
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="flex items-center gap-1.5 text-white/90">
        <span style={{ color }}>{arrow}</span>
        {label}
      </span>
      <span className="font-bold" style={{ color }}>
        {text}
      </span>
    </div>
  );
}
