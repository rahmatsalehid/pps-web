"use client";

import { useMemo, useState } from "react";
import { createMappingLokasiAction } from "@/app/(app)/mapping/actions";
import {
  MappingJenisPairEditor,
  type JenisPairChange,
} from "./mapping-jenis-pair-editor";
import { MapCloseIcon } from "./mapping-icons";

export function MappingAddLokasiDialog({
  blok,
  namaWarehouse,
  existingIds,
  onSaved,
  onClose,
}: {
  blok: string;
  namaWarehouse?: string;
  existingIds: Set<number>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const initialId = useMemo(() => {
    if (existingIds.size === 0) return 1;
    return Math.max(...existingIds) + 1;
  }, [existingIds]);

  const [idText, setIdText] = useState(String(initialId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<JenisPairChange>({
    pairs: [],
    valid: false,
  });

  const parsedId = parseInt(idText.trim(), 10);
  const idValid = Number.isFinite(parsedId) && parsedId > 0;
  const duplicate = idValid && existingIds.has(parsedId);
  const idError = idText.trim().length === 0
    ? null
    : !idValid || duplicate
      ? !idValid
        ? "ID lokasi tidak valid"
        : `ID ${parsedId} sudah dipakai lokasi lain`
      : null;
  const isValid = idValid && !duplicate && pairs.valid;

  const save = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    const res = await createMappingLokasiAction(blok, {
      idLokasi: parsedId,
      jenisList: pairs.pairs,
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
        <div className="flex items-start gap-2.5 px-5 pt-5">
          <span className="rounded-md bg-[#0D47A1]/[0.08] px-2 py-1 text-xs font-extrabold text-[#0D47A1]">
            Blok {blok}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-gray-800">
              Tambah Lokasi
            </span>
            {namaWarehouse && (
              <span className="block truncate text-[11px] font-medium text-gray-500">
                {namaWarehouse}
              </span>
            )}
          </span>
        </div>

        <div className="px-5 pb-2 pt-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center">
            <span className="flex-1 text-xs font-semibold text-gray-700">
              ID Lokasi
            </span>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={3}
              value={idText}
              onChange={(e) => setIdText(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-[90px] rounded-lg border border-gray-300 px-2 text-center text-base font-bold text-gray-800 outline-none focus:border-2 focus:border-[#0D47A1]"
            />
          </div>
          {idError ? (
            <p className="mt-1 text-right text-[11px] text-red-500">{idError}</p>
          ) : existingIds.size > 0 ? (
            <p className="mt-1 text-right text-[11px] text-gray-500">
              ID disarankan otomatis, boleh diubah
            </p>
          ) : null}

          <div className="mt-3.5">
            <MappingJenisPairEditor
              onChange={(v) => setPairs(v)}
            />
          </div>
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
            disabled={!isValid || saving}
            onClick={() => void save()}
            className="flex h-9 min-w-[88px] items-center justify-center rounded-lg bg-[#0D47A1] px-4 text-[13px] font-semibold text-white hover:bg-[#0a3c8a] disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Tambah"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
