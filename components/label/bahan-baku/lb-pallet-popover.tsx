"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LbPallet } from "@/services/label-bahan-baku-service";
import { LbCheckIcon, LbChevronRightIcon, LbCopyIcon, LbInventoryIcon, LbPrintIcon, LbScienceIcon } from "./lb-icons";

type Props = {
  pallet: LbPallet;
  x: number;
  y: number;
  canQc: boolean;
  printing: boolean;
  onInputQc: () => void;
  onPrint: () => void;
  onClose: () => void;
};

function fmtTenggelam(v: number | null): string {
  if (v == null) return "-";
  if (Math.abs(v - 5) < 1e-9 || Math.abs(v - 0.05) < 1e-9) return "5%";
  if (Math.abs(v - 10) < 1e-9 || Math.abs(v - 0.1) < 1e-9) return "10%";
  return `${v.toFixed(2)}%`;
}

function fmtDensity(v: number | null): string {
  return v == null ? "-" : v.toFixed(3);
}

function QcItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border border-[#EBECF0] px-2 py-1.5"
      style={{ backgroundColor: "#F7F8F9" }}
    >
      <p className="text-[10px] font-semibold text-[#6B778C]">{label}</p>
      <p className="text-[12px] font-bold text-[#172B4D]">{value}</p>
    </div>
  );
}

export function LbPalletPopover({
  pallet,
  x,
  y,
  canQc,
  printing,
  onInputQc,
  onPrint,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(12, x), window.innerWidth - w - 12);
    let top = y;
    if (y + h > window.innerHeight - 12) top = Math.max(12, y - h - 8);
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMove = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [onClose]);

  const copy = () => {
    void navigator.clipboard.writeText(pallet.NoPallet).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div
      ref={ref}
      className="fixed z-40 w-[300px] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white"
      style={
        pos
          ? { left: pos.left, top: pos.top, boxShadow: "0 8px 24px rgba(9,30,66,0.18)" }
          : { left: -9999, top: -9999, boxShadow: "0 8px 24px rgba(9,30,66,0.18)" }
      }
    >
      <div className="flex items-center gap-3 border-b border-[#DCDFE4] bg-[#E9F2FF] px-3.5 py-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border text-[#0C66E4]"
          style={{
            backgroundColor: "rgba(12,102,228,0.12)",
            borderColor: "rgba(12,102,228,0.24)",
          }}
        >
          <LbInventoryIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[#172B4D]">
            {pallet.NoBahanBaku} - {pallet.NoPallet}
          </p>
          <p className="truncate text-[11px] font-semibold text-[#44546F]">
            {pallet.NamaJenisPlastik || "-"}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          title="Salin"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#DCDFE4] bg-white text-[#0C66E4] hover:bg-gray-50"
        >
          {copied ? <LbCheckIcon className="h-4 w-4" /> : <LbCopyIcon className="h-4 w-4" />}
        </button>
      </div>

      <div className="border-b border-[#DCDFE4] px-3 py-2.5" style={{ backgroundColor: "#F7F8F9" }}>
        <div className="rounded-[10px] border border-[#DCDFE4] bg-white p-2.5">
          <p className="text-[11px] font-bold tracking-[0.2px] text-[#44546F]">Quality Control</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <QcItem label="Tenggelam" value={fmtTenggelam(pallet.Tenggelam)} />
            <QcItem label="Density 1" value={fmtDensity(pallet.Density)} />
            <QcItem label="Density 2" value={fmtDensity(pallet.Density2)} />
            <QcItem label="Density 3" value={fmtDensity(pallet.Density3)} />
          </div>
          {pallet.Keterangan && pallet.Keterangan.trim() && (
            <p className="mt-1.5 line-clamp-2 text-[11px] text-[#44546F]">
              Keterangan: {pallet.Keterangan}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          onInputQc();
        }}
        disabled={!canQc}
        title={canQc ? undefined : "Tidak punya izin input QC"}
        className="flex w-full items-center gap-2.5 border-b border-[#EBECF0] px-3 py-2.5 text-left hover:bg-[#F7F8F9] disabled:cursor-not-allowed disabled:opacity-[0.58]"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#0C66E4]"
          style={{ backgroundColor: "rgba(12,102,228,0.12)" }}
        >
          <LbScienceIcon className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-[13px] font-semibold text-[#172B4D]">Input QC</span>
        <LbChevronRightIcon className="h-4 w-4 text-[#6B778C]" />
      </button>

      <button
        type="button"
        onClick={() => {
          onClose();
          onPrint();
        }}
        disabled={printing}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#F7F8F9] disabled:cursor-wait"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#0C66E4]"
          style={{ backgroundColor: "rgba(12,102,228,0.12)" }}
        >
          {printing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <LbPrintIcon className="h-3.5 w-3.5" />}
        </span>
        <span className="flex-1 text-[13px] font-semibold text-[#172B4D]">
          {printing ? "Mencetak…" : "Print"}
        </span>
        {!printing && <LbChevronRightIcon className="h-4 w-4 text-[#6B778C]" />}
      </button>
    </div>
  );
}
