"use client";

import { useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { LbrHeader } from "@/services/label-broker-service";
import { fmtTanggal } from "./lbr-format";

type Props = {
  header: LbrHeader;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function LbrDeleteDialog({ header, onClose, onConfirm }: Props) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agree || busy) return;
    setBusy(true);
    setError(null);
    const res = await onConfirm();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{
            background: "linear-gradient(135deg, rgba(207,55,44,0.95), rgba(207,55,44,0.75))",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 shrink-0 text-white"
            aria-hidden
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <p className="text-[17px] font-bold tracking-wide text-white">Konfirmasi Hapus</p>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <div
            className="space-y-1.5 rounded-xl border border-[#DCDFE4] px-3 py-2.5"
            style={{ backgroundColor: "#F4F5F7" }}
          >
            <div className="flex gap-2 text-[13px]">
              <span className="w-[100px] shrink-0 font-semibold text-[#6B778C]">No. Broker</span>
              <span className="min-w-0 break-all font-semibold text-[#172B4D]">
                {header.NoBroker}
              </span>
            </div>
            <div className="flex gap-2 text-[13px]">
              <span className="w-[100px] shrink-0 font-semibold text-[#6B778C]">Jenis</span>
              <span className="min-w-0 break-all font-semibold text-[#172B4D]">
                {header.NamaJenisPlastik ?? "-"}
              </span>
            </div>
            <div className="flex gap-2 text-[13px]">
              <span className="w-[100px] shrink-0 font-semibold text-[#6B778C]">Dibuat</span>
              <span className="min-w-0 font-semibold text-[#172B4D]">
                {fmtTanggal(header.DateCreate)}
              </span>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-gray-600">
            Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </p>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-gray-700">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={busy}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            Saya mengerti dan ingin menghapus label ini.
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#DCDFE4] px-4 py-2.5 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F4F5F7] disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={!agree || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C9372C] px-4 py-2.5 text-[13px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            )}
            HAPUS
          </button>
        </div>
      </form>
    </div>
  );
}
