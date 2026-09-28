"use client";

import { useState } from "react";
import type { LokasiJenis } from "@/services/mapping-service";
import { updateMappingLokasiAction } from "@/app/(app)/mapping/actions";
import {
  MappingJenisPairEditor,
  type JenisPairChange,
} from "./mapping-jenis-pair-editor";
import { MapCloseIcon } from "./mapping-icons";

export function MappingEditLokasiDialog({
  blok,
  idLokasi,
  lokasiLabel,
  initialJenisList,
  onSaved,
  onClose,
}: {
  blok: string;
  idLokasi: number;
  lokasiLabel: string;
  initialJenisList: LokasiJenis[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<JenisPairChange>({
    pairs: [],
    valid: false,
  });

  const save = async () => {
    if (!editor.valid || saving) return;
    setSaving(true);
    setError(null);
    const res = await updateMappingLokasiAction(blok, idLokasi, {
      jenisList: editor.pairs,
    });
    if (res.ok) {
      onSaved();
      return;
    }
    setError(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-[380px] max-w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center gap-2.5 px-5 pt-5">
          <span className="rounded-md bg-[#0D47A1]/[0.08] px-2 py-1 text-xs font-extrabold text-[#0D47A1]">
            {lokasiLabel}
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-bold text-gray-800">
            Edit Lokasi
          </span>
        </div>

        <div className="px-5 pb-2 pt-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
              {error}
            </div>
          )}
          <MappingJenisPairEditor
            initial={initialJenisList.map((j) => ({
              idKategori: j.idKategori,
              idJenis: j.idJenis,
            }))}
            onChange={(v) => setEditor(v)}
          />
        </div>

        <div className="flex justify-end gap-2 px-5 pb-4 pt-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <MapCloseIcon className="h-4 w-4" />
            Batal
          </button>
          <button
            type="button"
            disabled={!editor.valid || saving}
            onClick={() => void save()}
            className="flex h-9 min-w-[88px] items-center justify-center rounded-lg bg-[#0D47A1] px-4 text-[13px] font-semibold text-white hover:bg-[#0a3c8a] disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
