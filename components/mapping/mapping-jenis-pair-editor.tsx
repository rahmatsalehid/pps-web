"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MasterJenis, MasterKategori } from "@/services/mapping-service";
import {
  getMappingJenisAction,
  getMappingKategoriAction,
} from "@/app/(app)/mapping/actions";
import {
  MapCheckCircleIcon,
  MapCloseIcon,
  MapDoneAllIcon,
  MapPlusIcon,
  MapRemoveDoneIcon,
  MapSearchIcon,
} from "./mapping-icons";

export type JenisPairValue = {
  idKategori: number;
  idJenis: number;
};

export type JenisPairChange = {
  pairs: JenisPairValue[];
  valid: boolean;
};

type CategoryEntry = {
  kategori: MasterKategori | null;
  jenisOptions: MasterJenis[];
  selectedJenisIds: number[];
  loadingJenis: boolean;
};

export function MappingJenisPairEditor({
  initial,
  onChange,
}: {
  initial?: { idKategori: number; idJenis: number }[];
  onChange: (value: JenisPairChange) => void;
}) {
  const initialRef = useRef(initial);
  const [loadingKategori, setLoadingKategori] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kategoris, setKategoris] = useState<MasterKategori[]>([]);
  const [entries, setEntries] = useState<CategoryEntry[]>([]);
  const [picker, setPicker] = useState<number | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const emit = useCallback((list: CategoryEntry[]) => {
    const pairs: JenisPairValue[] = [];
    for (const entry of list) {
      if (!entry.kategori) continue;
      for (const jenis of entry.jenisOptions) {
        if (entry.selectedJenisIds.includes(jenis.idJenis)) {
          pairs.push({
            idKategori: entry.kategori.idKategori,
            idJenis: jenis.idJenis,
          });
        }
      }
    }
    const valid =
      list.length > 0 &&
      list.every((e) => e.kategori != null && e.selectedJenisIds.length > 0);
    onChangeRef.current({ pairs, valid });
  }, []);

  const loadJenis = useCallback(
    async (
      idKategori: number,
      preselect?: number[],
    ): Promise<Pick<CategoryEntry, "jenisOptions" | "selectedJenisIds">> => {
      const res = await getMappingJenisAction(idKategori);
      if (!res.ok) {
        setError(res.error);
        return { jenisOptions: [], selectedJenisIds: [] };
      }
      const selected = preselect
        ? res.jenises
            .filter((j) => preselect.includes(j.idJenis))
            .map((j) => j.idJenis)
        : [];
      return { jenisOptions: res.jenises, selectedJenisIds: selected };
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMappingKategoriAction();
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setLoadingKategori(false);
        return;
      }
      setKategoris(res.kategoris);
      setLoadingKategori(false);

      const initialList = initialRef.current ?? [];
      const grouped = new Map<number, number[]>();
      for (const j of initialList) {
        const list = grouped.get(j.idKategori) ?? [];
        list.push(j.idJenis);
        grouped.set(j.idKategori, list);
      }

      const built: CategoryEntry[] = [];
      for (const idKategori of grouped.keys()) {
        const kategori =
          res.kategoris.find((k) => k.idKategori === idKategori) ?? null;
        if (!kategori) continue;
        built.push({
          kategori,
          jenisOptions: [],
          selectedJenisIds: [],
          loadingJenis: true,
        });
      }
      if (built.length === 0) {
        emit([]);
        return;
      }
      setEntries(built.map((e) => ({ ...e })));

      const finalEntries: CategoryEntry[] = [];
      for (const [idKategori, preselect] of grouped) {
        const kategori =
          res.kategoris.find((k) => k.idKategori === idKategori) ?? null;
        if (!kategori) continue;
        const loaded = await loadJenis(idKategori, preselect);
        finalEntries.push({
          kategori,
          jenisOptions: loaded.jenisOptions,
          selectedJenisIds: loaded.selectedJenisIds,
          loadingJenis: false,
        });
        if (cancelled) return;
        setEntries(finalEntries.map((e) => ({ ...e })));
      }
      emit(finalEntries);
    })();
    return () => {
      cancelled = true;
    };
  }, [emit, loadJenis]);

  const updateEntry = (idx: number, patch: Partial<CategoryEntry>) => {
    const next = entries.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    setEntries(next);
    emit(next);
  };

  const addEntry = () => {
    const next: CategoryEntry[] = [
      ...entries,
      { kategori: null, jenisOptions: [], selectedJenisIds: [], loadingJenis: false },
    ];
    setEntries(next);
    emit(next);
  };

  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    emit(next);
  };

  const onKategoriChange = (idx: number, idKategori: number) => {
    const kategori = kategoris.find((k) => k.idKategori === idKategori) ?? null;
    const next = entries.map((e, i) =>
      i === idx
        ? { ...e, kategori, jenisOptions: [], selectedJenisIds: [], loadingJenis: kategori != null }
        : e,
    );
    setEntries(next);
    emit(next);
    if (kategori) {
      void (async () => {
        const loaded = await loadJenis(idKategori);
        updateEntry(idx, {
          jenisOptions: loaded.jenisOptions,
          selectedJenisIds: loaded.selectedJenisIds,
          loadingJenis: false,
        });
      })();
    }
  };

  const toggleJenis = (idx: number, idJenis: number, selected: boolean) => {
    const entry = entries[idx];
    const nextIds = selected
      ? [...entry.selectedJenisIds, idJenis]
      : entry.selectedJenisIds.filter((id) => id !== idJenis);
    updateEntry(idx, { selectedJenisIds: nextIds });
  };

  if (loadingKategori) {
    return (
      <div className="flex h-20 items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center">
        <p className="flex-1 text-xs font-semibold text-gray-700">
          Kategori &amp; Jenis <span className="text-red-500">*</span>
        </p>
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-0.5 rounded-md bg-[#1E6FD9]/10 px-2 py-1 text-[11px] font-bold text-[#1E6FD9] hover:bg-[#1E6FD9]/15"
        >
          <MapPlusIcon className="h-3.5 w-3.5" />
          Tambah Kategori
        </button>
      </div>

      <div className="mt-2">
        {entries.length === 0 ? (
          <p className="py-2.5 text-[11px] text-red-400">
            {
              'Minimal 1 kategori dengan 1 jenis wajib diisi. Tekan "Tambah Kategori" untuk menambahkan.'
            }
          </p>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className="mb-2.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5"
            >
              <div className="mb-1.5 flex items-center">
                <p className="flex-1 text-[10px] font-bold text-gray-500">
                  Kategori {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="text-red-500 hover:text-red-700"
                >
                  <MapCloseIcon className="h-4 w-4" />
                </button>
              </div>

              <select
                value={entry.kategori?.idKategori ?? ""}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) onKategoriChange(i, v);
                }}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-800 outline-none focus:border-2 focus:border-[#1E6FD9]"
              >
                <option value="">Pilih kategori</option>
                {kategoris.map((k) => (
                  <option key={k.idKategori} value={k.idKategori}>
                    {k.namaKategori}
                  </option>
                ))}
              </select>

              <div className="mt-2">
                {entry.loadingJenis ? (
                  <div className="flex h-10 items-center justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
                  </div>
                ) : entry.kategori == null ? (
                  <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-400">
                    Pilih kategori dahulu
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPicker(i)}
                    className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left hover:border-[#1E6FD9]"
                  >
                    {entry.selectedJenisIds.length === 0 ? (
                      <span className="text-[13px] text-gray-500">
                        Pilih jenis...
                      </span>
                    ) : (
                      entry.jenisOptions
                        .filter((j) => entry.selectedJenisIds.includes(j.idJenis))
                        .map((j) => (
                          <span
                            key={j.idJenis}
                            className="flex items-center gap-1 rounded bg-[#1E6FD9]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#1E6FD9]"
                          >
                            {j.namaJenis}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleJenis(i, j.idJenis, false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.stopPropagation();
                                  toggleJenis(i, j.idJenis, false);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <MapCloseIcon className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        ))
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {picker != null && entries[picker] && (
        <JenisPickerDialog
          kategoriName={entries[picker].kategori?.namaKategori ?? ""}
          options={entries[picker].jenisOptions}
          selected={entries[picker].selectedJenisIds}
          onClose={() => setPicker(null)}
          onApply={(ids) => {
            updateEntry(picker, { selectedJenisIds: ids });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function JenisPickerDialog({
  kategoriName,
  options,
  selected,
  onClose,
  onApply,
}: {
  kategoriName: string;
  options: MasterJenis[];
  selected: number[];
  onClose: () => void;
  onApply: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<number[]>(selected);

  const filtered = query
    ? options.filter((j) =>
        j.namaJenis.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-[300px] max-w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="px-4 pb-2 pt-4">
          <p className="text-[15px] font-bold text-gray-800">
            Pilih Jenis{kategoriName ? ` — ${kategoriName}` : ""}
          </p>
        </div>

        <div className="px-4">
          {options.length === 0 ? (
            <p className="py-5 text-center text-xs text-gray-400">
              Tidak ada jenis untuk kategori ini
            </p>
          ) : (
            <>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <MapSearchIcon className="h-4 w-4" />
                </span>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari jenis..."
                  className="h-9 w-full rounded-lg border border-gray-300 pl-8 pr-8 text-[13px] outline-none focus:border-2 focus:border-[#1E6FD9]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <MapCloseIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-1.5 flex items-center">
                <span className="flex-1 text-[11px] text-gray-500">
                  {tempSelected.length} dipilih
                </span>
                <button
                  type="button"
                  disabled={filtered.length === 0}
                  onClick={() =>
                    setTempSelected((prev) => [
                      ...new Set([...prev, ...filtered.map((j) => j.idJenis)]),
                    ])
                  }
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#1E6FD9] disabled:text-gray-300"
                >
                  <MapDoneAllIcon className="h-3.5 w-3.5" />
                  Pilih Semua
                </button>
                <button
                  type="button"
                  disabled={filtered.length === 0}
                  onClick={() =>
                    setTempSelected((prev) =>
                      prev.filter(
                        (id) => !filtered.some((j) => j.idJenis === id),
                      ),
                    )
                  }
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-400 disabled:text-gray-300"
                >
                  <MapRemoveDoneIcon className="h-3.5 w-3.5" />
                  Hapus Semua
                </button>
              </div>

              <div className="h-[280px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    Jenis tidak ditemukan
                  </div>
                ) : (
                  filtered.map((jenis) => {
                    const checked = tempSelected.includes(jenis.idJenis);
                    return (
                      <label
                        key={jenis.idJenis}
                        className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px] text-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setTempSelected((prev) =>
                              e.target.checked
                                ? [...prev, jenis.idJenis]
                                : prev.filter((id) => id !== jenis.idJenis),
                            )
                          }
                          className="h-4 w-4 accent-[#1E6FD9]"
                        />
                        {jenis.namaJenis}
                      </label>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onApply(tempSelected)}
            className="rounded-lg bg-[#1E6FD9] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#1a62c2]"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}

export function MappingJenisPairLoading() {
  return (
    <div className="flex h-20 items-center justify-center">
      <MapCheckCircleIcon className="h-6 w-6 text-gray-300" />
    </div>
  );
}
