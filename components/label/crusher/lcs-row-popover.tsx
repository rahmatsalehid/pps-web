"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type { LcsHeader } from "@/services/label-crusher-service";
import { fmtBerat, fmtTanggal, formatBlokLokasi } from "./lcs-format";
import {
  LcsCheckIcon,
  LcsCopyIcon,
  LcsEditIcon,
  LcsHistoryIcon,
  LcsPrintIcon,
  LcsTrashIcon,
} from "./lcs-icons";

type Props = {
  header: LcsHeader;
  x: number;
  y: number;
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
  printing: boolean;
  lock: LbPrintLock | null;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
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
      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold transition hover:bg-[#F1F5FB] disabled:cursor-not-allowed disabled:hover:bg-transparent"
      style={{ color }}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

export function LcsRowPopover({
  header,
  x,
  y,
  canUpdate,
  canDelete,
  canHistory,
  printing,
  lock,
  onEdit,
  onDelete,
  onPrint,
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
    void navigator.clipboard.writeText(header.NoCrusher).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  const isBongkarSusun = (header.NoBongkarSusun ?? "").trim() !== "";
  const statusText = (header.StatusText ?? "").trim().toUpperCase();
  const divider = <div className="h-px bg-[#EBECF0]" />;

  return (
    <div
      ref={ref}
      className="fixed z-40 w-[290px] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white"
      style={
        pos
          ? { left: pos.left, top: pos.top, boxShadow: "0 8px 24px rgba(9,30,66,0.18)" }
          : { visibility: "hidden" }
      }
    >
      <div
        className="flex items-center gap-2.5 border-b border-[#EBECF0] px-3.5 py-3"
        style={{ backgroundColor: "#E9F2FF" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "rgba(12,102,228,0.12)",
            border: "1px solid rgba(12,102,228,0.24)",
            color: "#0C66E4",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5" aria-hidden>
            <path d="m15 12-8.5 8.5a2.1 2.1 0 1 1-3-3L12 9" />
            <path d="M17.6 6.4 21 9.8l-3.5 3.5-3.4-3.4 3.5-3.5Z" />
            <path d="m9 7 2.5-2.5a2.1 2.1 0 0 1 3 3L12 10" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[#172B4D]">{header.NoCrusher}</p>
          <p className="truncate text-[11px] font-semibold text-[#44546F]">
            {header.NamaCrusher?.trim() || "Crusher"}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          title="Salin"
          className="shrink-0 rounded-lg border border-[#DCDFE4] bg-white p-1.5 text-[#0C66E4] transition hover:bg-[#F7F8F9]"
        >
          {copied ? <LcsCheckIcon className="h-4 w-4" /> : <LcsCopyIcon className="h-4 w-4" />}
        </button>
      </div>

      {divider}

      <div className="space-y-1 px-4 py-2.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="font-semibold text-[#6B778C]">Tanggal</span>
          <span className="font-semibold text-[#172B4D]">{fmtTanggal(header.DateCreate)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="font-semibold text-[#6B778C]">Berat</span>
          <span className="font-semibold text-[#172B4D]">{fmtBerat(header.Berat)} kg</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="font-semibold text-[#6B778C]">Lokasi</span>
          <span className="font-semibold text-[#172B4D]">
            {formatBlokLokasi(header.Blok, header.IdLokasi)}
          </span>
        </div>
        {statusText && (
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-[#6B778C]">Status</span>
            <span
              className="font-bold"
              style={{ color: statusText === "PASS" ? "#1F845A" : "#C9372C" }}
            >
              {statusText}
            </span>
          </div>
        )}
      </div>

      {divider}

      <MenuTile
        icon={<LcsEditIcon className="h-4 w-4" />}
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
        icon={<LcsPrintIcon className="h-4 w-4" />}
        label={lock ? `Printing — ${lock.username ?? lock.lockedBy ?? "…"}` : "Print"}
        enabled={!printing && !lock}
        tooltipWhenDisabled={lock ? "Sedang diprint pengguna lain" : "Printing…"}
        onClick={onPrint}
      />
      {divider}
      <MenuTile
        icon={<LcsHistoryIcon className="h-4 w-4" />}
        label="History"
        enabled={canHistory}
        tooltipWhenDisabled="Tidak punya izin history"
        onClick={onHistory}
      />
      {divider}
      <MenuTile
        icon={<LcsTrashIcon className="h-4 w-4" />}
        label="Hapus"
        enabled={canDelete}
        danger
        tooltipWhenDisabled="Tidak punya izin hapus"
        onClick={onDelete}
      />

      {isBongkarSusun && (
        <>
          {divider}
          <p className="px-4 py-2 text-[11px] leading-relaxed text-[#6B778C]">
            Label dari Bongkar Susun tidak dapat diedit ({header.NoBongkarSusun}).
          </p>
        </>
      )}
    </div>
  );
}
