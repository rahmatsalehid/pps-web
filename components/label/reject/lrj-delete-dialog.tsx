"use client";

import { useState } from "react";
import type { LrjHeader } from "@/services/label-reject-service";
import { fmtTanggalLong } from "./lrj-format";
import { LrjTrashIcon } from "./lrj-icons";

type Props = {
  header: LrjHeader;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function LrjDeleteDialog({ header, onClose, onConfirm }: Props) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setBusy(true);
    setError(null);
    const res = await onConfirm();
    setBusy(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-[#C9372C] px-5 py-4">
          <LrjTrashIcon width={24} height={24} className="text-white" />
          <p className="text-[16px] font-bold text-white">Delete Confirmation</p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-lg border border-[#E2E6EA] bg-[#F7F8F9] p-3 text-[13px]">
            <div className="flex gap-2">
              <span className="w-28 font-semibold text-[#6B778C]">No. Label</span>
              <span className="font-bold text-[#172B4D]">{header.NoReject}</span>
            </div>
            {header.NamaReject && (
              <div className="mt-1.5 flex gap-2">
                <span className="w-28 font-semibold text-[#6B778C]">Jenis</span>
                <span className="font-semibold text-[#172B4D]">{header.NamaReject}</span>
              </div>
            )}
            <div className="mt-1.5 flex gap-2">
              <span className="w-28 font-semibold text-[#6B778C]">Berat</span>
              <span className="font-semibold text-[#172B4D]">
                {header.Berat != null ? `${header.Berat} kg` : "-"}
              </span>
            </div>
            {header.DateCreate && (
              <div className="mt-1.5 flex gap-2">
                <span className="w-28 font-semibold text-[#6B778C]">Created</span>
                <span className="font-semibold text-[#172B4D]">
                  {fmtTanggalLong(header.DateCreate)}
                </span>
              </div>
            )}
          </div>

          <p className="text-[13px] leading-relaxed text-[#44546F]">
            Tindakan ini permanen dan tidak dapat dibatalkan.
          </p>

          <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[#172B4D]">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            Saya mengerti dan ingin menghapus label ini.
          </label>

          {error && (
            <p className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12px] font-semibold text-[#7F1D1D]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E6EA] px-5 py-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCDFE4] bg-white px-4 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F7F8F9] disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="button"
            disabled={!agree || busy}
            onClick={() => void handle()}
            className="h-10 rounded-lg bg-[#C9372C] px-4 text-[13px] font-bold text-white transition hover:bg-[#AE2E24] disabled:opacity-50"
          >
            {busy ? "Menghapus…" : "DELETE"}
          </button>
        </div>
      </div>
    </div>
  );
}
