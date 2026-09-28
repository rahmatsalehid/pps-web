"use client";

import { useState } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type { PbbRiwayat } from "@/services/penerimaan-bahan-baku-service";
import { formatTanggalShort } from "./pbb-format";

export function PbbDeleteDialog({
  header,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  header: PbbRiwayat;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [agree, setAgree] = useState(false);
  const submitting = loading ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[14px] bg-white shadow-2xl">
        {/* Banner judul ala _WarningBanner */}
        <div
          className="flex items-center gap-3 px-[18px] py-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(211,47,47,0.95), rgba(211,47,47,0.75))",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-7 w-7 shrink-0 text-white"
            aria-hidden
          >
            <path d="M12 2 1 21h22L12 2Zm1 14h-2v2h2v-2Zm0-7h-2v5h2V9Z" />
          </svg>
          <p className="flex-1 text-[18px] font-bold tracking-wide text-white">
            Konfirmasi Hapus
          </p>
        </div>

        <div className="px-5 pb-2 pt-3.5">
          <div className="rounded-[10px] border border-[#E0E0E0] bg-[#F5F5F5] px-3 py-3">
            <InfoRow label="No Penerimaan" value={header.noPenerimaan} />
            <div className="h-1.5" />
            <InfoRow label="Tim" value={header.namaTim} />
            <div className="h-1.5" />
            <InfoRow
              label="Tanggal"
              value={formatTanggalShort(header.tglPenerimaan)}
            />
          </div>

          <p className="mt-3.5 text-[13px] leading-[1.25] text-gray-700">
            Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Jika
            sebagian label sudah terpakai di proses lain, penghapusan akan
            ditolak oleh server.
          </p>

          <label className="mt-2.5 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 shrink-0 accent-[#B3261E]"
            />
            <span className="text-[13px] text-gray-800">
              Saya mengerti dan ingin menghapus data ini.
            </span>
          </label>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-[10px] border border-[#CAC4D0] px-4 py-3 text-[14px] font-medium text-[#49454F] hover:bg-gray-50 disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!agree || submitting}
            className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-[10px] bg-[#B3261E] px-[18px] py-3 text-[14px] font-semibold text-white shadow-sm disabled:bg-[#B3261E]/40"
          >
            {submitting && (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            )}
            HAPUS
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-[13px] font-semibold text-[#49454F]">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1C1B1F]">
        {value}
      </span>
    </div>
  );
}
