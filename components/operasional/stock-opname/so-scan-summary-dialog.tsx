"use client";

import { useState, type ReactNode } from "react";
import type { SoScanSummary } from "@/services/stock-opname-v2-service";
import { X } from "@/components/dashboard/icons";
import { soFormatDateTime } from "./so-format";
import {
  SoChevronDownIcon,
  SoFlagIcon,
  SoLeaderboardIcon,
  SoPlayIcon,
  SoTrophyIcon,
} from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const MUTED = "#6B7280";
const INK = "#1A1D23";
const GOLD = "#F59E0B";
const SILVER = "#94A3B8";
const BRONZE = "#B45309";

export function SoScanSummaryDialog({
  summary,
  totalLabelCount,
  onClose,
}: {
  summary: SoScanSummary;
  totalLabelCount: number;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const users = [...summary.data].sort((a, b) => b.labelCount - a.labelCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <span
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            <SoLeaderboardIcon style={{ width: 18, height: 18 }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold tracking-tight text-[#1A1D23]">
              Ringkasan Scan User
            </p>
            <p className="mt-0.5 truncate text-xs text-[#6B7280]">
              {summary.stockOpnameNo} &middot; {summary.totalUsers} user
              &middot; {summary.totalScanned}/{totalLabelCount} label
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

        <div className="min-h-0 flex-1 overflow-auto">
          {users.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#6B7280]">
              Belum ada user yang melakukan scan.
            </p>
          ) : (
            users.map((user, i) => {
              const rank = i + 1;
              const rankColor =
                rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : null;
              const open = expanded === user.username;
              return (
                <div
                  key={user.username}
                  className="border-b border-[#F3F4F6] px-5 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : user.username)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span
                      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full"
                      style={{
                        backgroundColor: `${rankColor ?? MUTED}1F`,
                        color: rankColor ?? MUTED,
                      }}
                    >
                      {rankColor ? (
                        <SoTrophyIcon className="h-3.5 w-3.5" style={{ width: 14, height: 14 }} />
                      ) : (
                        <span className="text-[11px] font-bold">{rank}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#1A1D23]">
                      {user.username}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-extrabold text-[#1A1D23]">
                      {user.labelCount} label
                    </span>
                    <SoChevronDownIcon
                      className="h-4 w-4 shrink-0 text-[#6B7280] transition-transform duration-150"
                      style={{ transform: open ? "rotate(180deg)" : undefined }}
                    />
                  </button>
                  {open && (
                    <div className="ml-9 mt-2 rounded-md bg-[#F8F9FB] p-2.5">
                      <TimeLine
                        icon={<SoPlayIcon className="h-3.5 w-3.5" style={{ width: 13, height: 13 }} />}
                        label="Scan pertama"
                        value={soFormatDateTime(user.firstScanAt) ?? "-"}
                      />
                      <div className="h-1" />
                      <TimeLine
                        icon={<SoFlagIcon className="h-3.5 w-3.5" style={{ width: 13, height: 13 }} />}
                        label="Scan terakhir"
                        value={soFormatDateTime(user.lastScanAt) ?? "-"}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div
          className="border-t px-5 py-3.5"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: MUTED }}>
      <span className="shrink-0">{icon}</span>
      <span>{label}:</span>
      <span className="font-semibold" style={{ color: INK }}>
        {value}
      </span>
    </div>
  );
}
