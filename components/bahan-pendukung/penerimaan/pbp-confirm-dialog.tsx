"use client";

import { useEffect } from "react";
import { Loader2Icon, TrashIcon } from "@/components/dashboard/icons";
import { CheckCircleOutlineIcon } from "./pbp-icons";

const BORDER = "#E5E7EB";

export function PbpConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor = "#DC2626",
  danger = true,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pb-0 pt-6">
          <div className="flex items-center gap-3">
            <span
              className="grid place-items-center rounded-lg p-2"
              style={{ backgroundColor: `${confirmColor}1A`, color: confirmColor }}
            >
              {danger ? <TrashIcon className="h-[18px] w-[18px]" /> : <CheckCircleOutlineIcon className="h-[18px] w-[18px]" />}
            </span>
            <p className="flex-1 text-sm font-bold text-[#111827]">{title}</p>
          </div>
          <p className="mt-3.5 text-[13px] leading-relaxed text-[#6B7280]">
            {message}
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div
          className="mt-5 flex justify-end gap-2.5 border-t px-6 py-4"
          style={{ borderColor: "rgba(0,0,0,0.05)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border px-4 py-2.5 text-[13px] font-medium text-[#6B7280] hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: confirmColor }}
          >
            {loading && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
