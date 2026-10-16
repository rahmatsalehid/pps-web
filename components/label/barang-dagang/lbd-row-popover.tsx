"use client";

import { useEffect, useRef, useState } from "react";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type { LbdHeader } from "@/services/label-barang-dagang-service";
import { LbdCheckIcon, LbdCopyIcon } from "./lbd-icons";

type Props = {
  header: LbdHeader;
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
  label,
  enabled,
  danger,
  tooltipWhenDisabled,
  onClick,
}: {
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
      {label}
    </button>
  );
}

export function LbdRowPopover({
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
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - 12;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(header.NoBarangDagang);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[60] w-[260px] overflow-hidden rounded-xl border border-[#DCDFE4] bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-[#DCDFE4] bg-[#E9F2FF] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#172B4D]">
            {header.NoBarangDagang}
          </p>
          <p className="truncate text-[11px] font-semibold text-[#44546F]">
            {header.NamaBarangDagang?.trim() || "Barang Dagang"}
          </p>
          {printing && (
            <p className="mt-0.5 text-[11px] font-bold text-[#B26A00]">Sedang diprint…</p>
          )}
          {lock && !printing && (
            <p className="mt-0.5 text-[11px] font-semibold text-[#B26A00]">
              Dikunci: {lock.username ?? "-"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md border border-[#DCDFE4] bg-white p-1.5 text-[#0C66E4] transition hover:bg-[#F7F8F9]"
          title="Salin"
        >
          {copied ? (
            <LbdCheckIcon width={15} height={15} />
          ) : (
            <LbdCopyIcon width={15} height={15} />
          )}
        </button>
      </div>

      <div className="border-b border-[#E9ECF0] py-1">
        <MenuTile label="History" enabled={canHistory} onClick={onHistory} />
      </div>
      <div className="border-b border-[#E9ECF0] py-1">
        <MenuTile
          label="Edit"
          enabled={canUpdate}
          tooltipWhenDisabled="Tidak punya izin edit"
          onClick={onEdit}
        />
      </div>
      <div className="border-b border-[#E9ECF0] py-1">
        <MenuTile label="Print" enabled={!printing} onClick={onPrint} />
      </div>
      <div className="py-1">
        <MenuTile
          label="Delete"
          enabled={canDelete}
          danger
          tooltipWhenDisabled="Tidak punya izin hapus"
          onClick={onDelete}
        />
      </div>
    </div>
  );
}
