"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type { LmxHeader } from "@/services/label-mixer-service";
import { fmtQc, fmtStatus, isPass } from "./lmx-format";
import {
  LmxCopyIcon,
  LmxCheckIcon,
  LmxEditIcon,
  LmxHistoryIcon,
  LmxPdfIcon,
  LmxPrintIcon,
  LmxScienceIcon,
  LmxTrashIcon,
} from "./lmx-icons";

type Props = {
  header: LmxHeader;
  x: number;
  y: number;
  canUpdate: boolean;
  canDelete: boolean;
  canQc: boolean;
  canHistory: boolean;
  printing: boolean;
  lock: LbPrintLock | null;
  onEdit: () => void;
  onDelete: () => void;
  onQc: () => void;
  onPrint: () => void;
  onPrintQc: () => void;
  onHistory: () => void;
  onClose: () => void;
};

function MenuTile({
  icon,
  label,
  enabled,
  danger,
  tooltipWhenDisabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  danger?: boolean;
  tooltipWhenDisabled?: string;
  onClick: () => void;
}) {
  const color = danger ? "#C9372C" : enabled ? "#172B4D" : "#A5ADBA";
  return (
    <button
      type="button"
      disabled={!enabled}
      title={!enabled ? tooltipWhenDisabled : undefined}
      onClick={() => {
        if (enabled) onClick();
      }}
      className="flex w-full items-center gap-3 px-5 py-3 text-left text-[14px] font-semibold transition hover:bg-[#F1F5FB] disabled:cursor-not-allowed disabled:hover:bg-transparent"
      style={{ color }}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function QcChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#EBECF0] bg-white px-2.5 py-2 shadow-sm">
      <p className="truncate text-[11px] font-semibold text-[#6B778C]">{label}</p>
      <p className="truncate text-[14px] font-bold text-[#172B4D]">{fmtQc(value)}</p>
    </div>
  );
}

export function LmxRowPopover({
  header,
  x,
  y,
  canUpdate,
  canDelete,
  canQc,
  canHistory,
  printing,
  lock,
  onEdit,
  onDelete,
  onQc,
  onPrint,
  onPrintQc,
  onHistory,
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
    void navigator.clipboard.writeText(header.NoMixer).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  const isBongkarSusun = (header.NoBongkarSusun ?? "").trim() !== "";
  const pass = isPass(header.StatusText);
  const divider = <div className="h-px bg-[#EBECF0]" />;

  return (
    <div
      ref={ref}
      className="fixed z-[55] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-[0_12px_40px_rgba(9,30,66,0.18)]"
      style={pos ? { left: pos.left, top: pos.top } : { left: x, top: y, visibility: "hidden" }}
    >
      <div className="flex">
        <div className="w-[300px] border-r border-[#EBECF0] bg-[#F7F8F9]">
          <div className="flex items-center gap-2.5 border-b border-[#EBECF0] bg-[#E9F2FF] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#172B4D]">{header.NoMixer}</p>
              <p className="truncate text-[12px] font-semibold text-[#44546F]">
                {header.NamaMixer ?? "-"}
                {" · "}
                <span
                  className="rounded px-1 py-0.5 text-[11px] font-bold"
                  style={
                    pass
                      ? { backgroundColor: "#ECFDF5", color: "#166534" }
                      : { backgroundColor: "#FEF2F2", color: "#991B1B" }
                  }
                >
                  {fmtStatus(header.StatusText)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={copy}
              title={copied ? "Tersalin!" : "Salin nomor"}
              className="rounded-lg border border-[#DCDFE4] bg-white p-2 text-[#1565C0] transition hover:bg-[#F1F5FB]"
            >
              {copied ? (
                <LmxCheckIcon className="h-4 w-4" />
              ) : (
                <LmxCopyIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3px] text-[#44546F]">
              Quality Control
            </p>
            <div className="grid grid-cols-3 gap-2">
              <QcChip label="Moist 1" value={header.Moisture} />
              <QcChip label="Moist 2" value={header.Moisture2} />
              <QcChip label="Moist 3" value={header.Moisture3} />
              <QcChip label="Max Melt" value={header.MaxMeltTemp} />
              <QcChip label="Min Melt" value={header.MinMeltTemp} />
              <QcChip label="MFI" value={header.MFI} />
            </div>
          </div>
        </div>

        <div className="w-[190px] py-1.5">
          <MenuTile
            icon={<LmxEditIcon className="h-5 w-5" />}
            label="Edit"
            enabled={canUpdate && !isBongkarSusun}
            tooltipWhenDisabled={
              isBongkarSusun
                ? "Label Bongkar Susun tidak dapat diedit"
                : "Tidak punya izin edit"
            }
            onClick={onEdit}
          />
          {divider}
          <MenuTile
            icon={<LmxScienceIcon className="h-5 w-5" />}
            label="Input QC"
            enabled={canQc}
            tooltipWhenDisabled="Tidak punya izin update QC"
            onClick={onQc}
          />
          {divider}
          <MenuTile
            icon={
              printing ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#1565C0] border-t-transparent" />
              ) : (
                <LmxPrintIcon className="h-5 w-5" />
              )
            }
            label={printing ? "Mencetak…" : lock ? "Sedang dicetak" : "Print"}
            enabled={!printing && !lock}
            tooltipWhenDisabled={lock ? "Label sedang dicetak perangkat lain" : undefined}
            onClick={onPrint}
          />
          {divider}
          <MenuTile
            icon={<LmxPdfIcon className="h-5 w-5" />}
            label="Print QC"
            enabled={!printing}
            onClick={onPrintQc}
          />
          {divider}
          <MenuTile
            icon={<LmxHistoryIcon className="h-5 w-5" />}
            label="History"
            enabled={canHistory}
            tooltipWhenDisabled="Tidak punya izin history"
            onClick={onHistory}
          />
          {divider}
          <MenuTile
            icon={<LmxTrashIcon className="h-5 w-5" />}
            label="Delete"
            enabled={canDelete}
            tooltipWhenDisabled="Tidak punya izin hapus"
            danger
            onClick={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
