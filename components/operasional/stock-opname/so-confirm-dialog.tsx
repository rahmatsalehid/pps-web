"use client";

import type { ReactNode } from "react";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const BORDER = "#E2E6EA";

const TONE_COLORS: Record<string, string> = {
  danger: "#DC2626",
  green: "#0A7349",
  primary: "#1E6FD9",
  warning: "#B45309",
};

export function SoConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "danger",
  icon,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: keyof typeof TONE_COLORS | string;
  icon?: ReactNode;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const color = TONE_COLORS[tone] ?? TONE_COLORS.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {icon && (
            <span
              className="grid shrink-0 place-items-center rounded-lg p-2"
              style={{ backgroundColor: `${color}14`, color }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#1A1D23]">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-[#374151]">
            {message}
          </p>
          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div
          className="flex gap-2 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-md border px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-[1.6] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: color }}
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
