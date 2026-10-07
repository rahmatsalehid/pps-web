"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteFormulaAction,
  getFormulaDetailAction,
  getFormulaItemsAction,
  getFormulaKategoriAction,
  getFormulaListAction,
  saveFormulaAction,
} from "@/app/(app)/master/formula/actions";
import type {
  FormulaRow,
  KategoriOption,
  MasterItem,
} from "@/services/master-formula-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type FormulaLineDraft = {
  kategoriId: number;
  kategoriNama: string;
  itemId: number;
  itemNama: string;
};

type FormulaForm = {
  idFormula: number | null;
  mainKategoriId: string;
  mainOutputId: string;
  inputs: FormulaLineDraft[];
  secondarys: FormulaLineDraft[];
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function emptyFormulaForm(): FormulaForm {
  return {
    idFormula: null,
    mainKategoriId: "",
    mainOutputId: "",
    inputs: [],
    secondarys: [],
  };
}

export function FormulaWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [kategori, setKategori] = useState<KategoriOption[]>([]);
  const [rows, setRows] = useState<FormulaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<EntryMode>("view");
  const [editor, setEditor] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormulaForm>(emptyFormulaForm());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const [itemsCache, setItemsCache] = useState<Record<number, MasterItem[]>>(
    {},
  );
  const [itemsLoading, setItemsLoading] = useState<number | null>(null);
  const [inputKategoriPick, setInputKategoriPick] = useState("");
  const [inputItemPick, setInputItemPick] = useState("");
  const [secondaryKategoriPick, setSecondaryKategoriPick] = useState("");
  const [secondaryItemPick, setSecondaryItemPick] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [katRes, listRes] = await Promise.all([
        getFormulaKategoriAction(),
        getFormulaListAction(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (katRes.ok) {
        setKategori(katRes.rows);
      } else {
        setLoadError(katRes.error);
        return;
      }
      if (listRes.ok) {
        setRows(listRes.rows);
        setLoadError(null);
      } else {
        setLoadError(listRes.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        String(row.idFormula),
        row.mainKategori,
        row.mainOutputNama,
        String(row.mainOutputId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const mainKategoriId = parseInt(form.mainKategoriId, 10) || 0;
  const mainOutputOptions = mainKategoriId ? itemsCache[mainKategoriId] ?? [] : [];
  const wasteKategori = useMemo(
    () => kategori.filter((k) => k.isWaste),
    [kategori],
  );

  function reload() {
    setReloadKey((k) => k + 1);
  }

  async function ensureItems(kategoriId: number) {
    if (!kategoriId || itemsCache[kategoriId]) return;
    setItemsLoading(kategoriId);
    const res = await getFormulaItemsAction(kategoriId);
    setItemsLoading(null);
    if (res.ok) {
      setItemsCache((c) => ({ ...c, [kategoriId]: res.rows }));
    } else {
      setError(res.error);
    }
  }

  function selectRow(row: FormulaRow) {
    if (editor) return;
    setNotice(null);
    setError(null);
    setSelectedId(row.idFormula);
  }

  function resetEditor() {
    setMode("view");
    setEditor(false);
    setForm(emptyFormulaForm());
    setSelectedId(null);
    setInputKategoriPick("");
    setInputItemPick("");
    setSecondaryKategoriPick("");
    setSecondaryItemPick("");
    setError(null);
  }

  function startCreate() {
    if (!canCreate) return;
    setNotice(null);
    setMode("create");
    setSelectedId(null);
    setForm(emptyFormulaForm());
    setInputKategoriPick("");
    setInputItemPick("");
    setSecondaryKategoriPick("");
    setSecondaryItemPick("");
    setError(null);
    setEditor(true);
  }

  async function openEdit(idFormula: number) {
    if (!canUpdate) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await getFormulaDetailAction(idFormula);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm({
      idFormula: res.detail.idFormula,
      mainKategoriId: String(res.detail.mainKategoriId),
      mainOutputId: String(res.detail.mainOutputId),
      inputs: res.detail.inputs.map((line) => ({
        kategoriId: line.kategoriId,
        kategoriNama: line.kategoriNama,
        itemId: line.itemId,
        itemNama: line.itemNama,
      })),
      secondarys: res.detail.secondarys.map((line) => ({
        kategoriId: line.kategoriId,
        kategoriNama: line.kategoriNama,
        itemId: line.itemId,
        itemNama: line.itemNama,
      })),
    });
    setSelectedId(res.detail.idFormula);
    void ensureItems(res.detail.mainKategoriId);
    setMode("edit");
    setEditor(true);
  }

  function changeMainKategori(value: string) {
    setForm((f) => ({ ...f, mainKategoriId: value, mainOutputId: "" }));
    const id = parseInt(value, 10) || 0;
    if (id) void ensureItems(id);
  }

  function addInputLine() {
    const kategoriId = parseInt(inputKategoriPick, 10) || 0;
    const itemId = parseInt(inputItemPick, 10) || 0;
    if (!kategoriId) {
      setError("Pilih kategori input terlebih dahulu.");
      return;
    }
    if (!itemId) {
      setError("Pilih item input yang ingin ditambahkan.");
      return;
    }
    const kategoriRow = kategori.find((k) => k.idKategori === kategoriId);
    const itemRow = (itemsCache[kategoriId] ?? []).find((i) => i.id === itemId);
    if (!kategoriRow || !itemRow) return;
    if (
      form.inputs.some(
        (line) => line.kategoriId === kategoriId && line.itemId === itemId,
      )
    ) {
      setError("Data Input ini sudah ada dalam daftar.");
      return;
    }
    setError(null);
    setForm((f) => ({
      ...f,
      inputs: [
        ...f.inputs,
        {
          kategoriId,
          kategoriNama: kategoriRow.namaKategori,
          itemId,
          itemNama: itemRow.nama,
        },
      ],
    }));
    setInputItemPick("");
  }

  function addSecondaryLine() {
    const kategoriId = parseInt(secondaryKategoriPick, 10) || 0;
    const itemId = parseInt(secondaryItemPick, 10) || 0;
    if (!kategoriId) {
      setError("Pilih kategori secondary output terlebih dahulu.");
      return;
    }
    if (!itemId) {
      setError("Pilih item secondary output yang ingin ditambahkan.");
      return;
    }
    const kategoriRow = kategori.find((k) => k.idKategori === kategoriId);
    const itemRow = (itemsCache[kategoriId] ?? []).find((i) => i.id === itemId);
    if (!kategoriRow || !itemRow) return;
    if (
      form.secondarys.some(
        (line) => line.kategoriId === kategoriId && line.itemId === itemId,
      )
    ) {
      setError("Data Secondary Output ini sudah ada dalam daftar.");
      return;
    }
    if (kategoriId === mainKategoriId && itemId === parseInt(form.mainOutputId, 10)) {
      setError("Secondary Output tidak boleh sama dengan Output utama.");
      return;
    }
    setError(null);
    setForm((f) => ({
      ...f,
      secondarys: [
        ...f.secondarys,
        {
          kategoriId,
          kategoriNama: kategoriRow.namaKategori,
          itemId,
          itemNama: itemRow.nama,
        },
      ],
    }));
    setSecondaryItemPick("");
  }

  async function save() {
    const kategoriId = parseInt(form.mainKategoriId, 10) || 0;
    const outputId = parseInt(form.mainOutputId, 10) || 0;
    if (!kategoriId) {
      setError("Pilih kategori utama formula.");
      return;
    }
    if (!outputId) {
      setError("Pilih output utama formula.");
      return;
    }
    if (!form.inputs.length && !form.secondarys.length) {
      setError("Formula minimal memiliki 1 Input atau 1 Secondary Output.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await saveFormulaAction({
      idFormula: mode === "edit" ? (form.idFormula ?? undefined) : undefined,
      mainKategoriId: kategoriId,
      mainOutputId: outputId,
      inputs: form.inputs.map((line) => ({
        kategoriId: line.kategoriId,
        itemId: line.itemId,
      })),
      secondarys: form.secondarys.map((line) => ({
        kategoriId: line.kategoriId,
        itemId: line.itemId,
      })),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice("Data formula berhasil disimpan.");
    reload();
  }

  async function confirmDelete() {
    if (form.idFormula == null && selectedId == null) return;
    const idFormula = form.idFormula ?? selectedId;
    if (idFormula == null) return;
    setBusy(true);
    setError(null);
    const res = await deleteFormulaAction(idFormula);
    setBusy(false);
    setConfirm(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice("Data formula berhasil dihapus.");
    reload();
  }

  const itemsFor = (id: number) => (id ? itemsCache[id] ?? [] : []);
  const activeError = error;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">
            Master Formula Produksi
          </h1>
          <p className="text-[12px] text-gray-500">
            Rumus input dan secondary output untuk tiap formula produksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loadError && (
            <span className="text-[12px] font-semibold text-[#B91C1C]">
              {loadError}
            </span>
          )}
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Muat Ulang
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
          {notice}
        </div>
      )}

      {activeError && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {activeError}
        </div>
      )}

      {!editor && (
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">
              Daftar Formula
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode="view" />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${rows.length} Data Formula`}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori / output formula..."
              className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
              style={{ borderColor: BORDER }}
            />
          </div>

          <div className="max-h-[420px] overflow-auto px-3 pt-2">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-2 py-2 font-semibold text-gray-500">ID</th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Main Kategori
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Main Output
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Input
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Secondary
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data formula
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((row) => (
                    <tr
                      key={row.idFormula}
                      onClick={() => selectRow(row)}
                      onDoubleClick={() => void openEdit(row.idFormula)}
                      className={`cursor-pointer ${
                        selectedId === row.idFormula ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.idFormula}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.mainKategori || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.mainOutputNama || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.jumlahInput}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.jumlahSecondary}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div
            className="mt-3 border-t px-3 py-3"
            style={{ borderColor: BORDER }}
          >
            <ModeHint mode="view" kind="formula" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah data baru"
                disabled={!canCreate || busy}
                onClick={startCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah data yang sedang dipilih"
                disabled={selectedId == null || !canUpdate || busy}
                onClick={() => {
                  if (selectedId != null) void openEdit(selectedId);
                }}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus data yang sedang dipilih"
                disabled={selectedId == null || !canDelete || busy}
                onClick={() => {
                  setForm(emptyFormulaForm());
                  setError(null);
                  setConfirm(true);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {editor && (
        <section
          className="overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-gray-800">
                {mode === "create"
                  ? "Tambah Formula"
                  : `Ubah Formula ${form.idFormula ?? ""}`}
              </h2>
              <ModeChip mode={mode} />
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Isi form lalu tekan SIMPAN
            </span>
          </header>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID Formula">
                <input
                  type="text"
                  readOnly
                  value={form.idFormula != null ? String(form.idFormula) : ""}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Main Kategori" required>
                <select
                  value={form.mainKategoriId}
                  onChange={(e) => changeMainKategori(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {kategori.map((k) => (
                    <option key={k.idKategori} value={String(k.idKategori)}>
                      {k.namaKategori}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Main Output" required>
                  <select
                    value={form.mainOutputId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mainOutputId: e.target.value }))
                    }
                    disabled={!mainKategoriId || itemsLoading === mainKategoriId}
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">
                      {!mainKategoriId
                        ? "-- Pilih Kategori Dulu --"
                        : itemsLoading === mainKategoriId
                          ? "Memuat item..."
                          : mainOutputOptions.length
                            ? "-- Pilih Output --"
                            : "Tidak ada item aktif pada kategori ini"}
                    </option>
                    {mainOutputOptions.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="mt-3 rounded-lg border" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: BORDER }}>
                <span className="text-[12px] font-bold text-gray-700">
                  Input
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  {`${form.inputs.length} baris`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 px-3 py-2.5">
                <select
                  value={inputKategoriPick}
                  onChange={(e) => {
                    setInputKategoriPick(e.target.value);
                    setInputItemPick("");
                    const id = parseInt(e.target.value, 10) || 0;
                    if (id) void ensureItems(id);
                  }}
                  className="min-w-[150px] flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Kategori Input --</option>
                  {kategori.map((k) => (
                    <option key={k.idKategori} value={String(k.idKategori)}>
                      {k.namaKategori}
                    </option>
                  ))}
                </select>
                <select
                  value={inputItemPick}
                  onChange={(e) => setInputItemPick(e.target.value)}
                  disabled={
                    !parseInt(inputKategoriPick, 10) ||
                    itemsLoading === parseInt(inputKategoriPick, 10)
                  }
                  className="min-w-[150px] flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Item Input --</option>
                  {itemsFor(parseInt(inputKategoriPick, 10) || 0).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.nama}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void addInputLine()}
                  className="rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                  style={{ background: PRIMARY }}
                >
                  Tambah
                </button>
              </div>
              <div className="max-h-[160px] overflow-auto border-t px-3 py-1" style={{ borderColor: BORDER }}>
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="px-2 py-1.5 font-semibold text-gray-500">
                        Kategori
                      </th>
                      <th className="px-2 py-1.5 font-semibold text-gray-500">
                        Input
                      </th>
                      <th className="px-2 py-1.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.inputs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-gray-400">
                          Belum ada input — pilih kategori lalu item, tekan Tambah
                        </td>
                      </tr>
                    )}
                    {form.inputs.map((line, index) => (
                      <tr
                        key={`${line.kategoriId}-${line.itemId}`}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-1.5 text-gray-600">
                          {line.kategoriNama}
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">
                          {line.itemNama}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            title="Hapus baris ini"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                inputs: f.inputs.filter((_, i) => i !== index),
                              }))
                            }
                            className="rounded border px-1.5 py-0.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                            style={{ borderColor: "#FCA5A5" }}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 rounded-lg border" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: BORDER }}>
                <span className="text-[12px] font-bold text-gray-700">
                  Secondary Output
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  {`${form.secondarys.length} baris`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 px-3 py-2.5">
                <select
                  value={secondaryKategoriPick}
                  onChange={(e) => {
                    setSecondaryKategoriPick(e.target.value);
                    setSecondaryItemPick("");
                    const id = parseInt(e.target.value, 10) || 0;
                    if (id) void ensureItems(id);
                  }}
                  className="min-w-[150px] flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Kategori Waste --</option>
                  {wasteKategori.map((k) => (
                    <option key={k.idKategori} value={String(k.idKategori)}>
                      {k.namaKategori}
                    </option>
                  ))}
                </select>
                <select
                  value={secondaryItemPick}
                  onChange={(e) => setSecondaryItemPick(e.target.value)}
                  disabled={
                    !parseInt(secondaryKategoriPick, 10) ||
                    itemsLoading === parseInt(secondaryKategoriPick, 10)
                  }
                  className="min-w-[150px] flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Item Output --</option>
                  {itemsFor(parseInt(secondaryKategoriPick, 10) || 0).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.nama}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void addSecondaryLine()}
                  className="rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                  style={{ background: PRIMARY }}
                >
                  Tambah
                </button>
              </div>
              <div className="max-h-[160px] overflow-auto border-t px-3 py-1" style={{ borderColor: BORDER }}>
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="px-2 py-1.5 font-semibold text-gray-500">
                        Kategori
                      </th>
                      <th className="px-2 py-1.5 font-semibold text-gray-500">
                        Output
                      </th>
                      <th className="px-2 py-1.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.secondarys.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-gray-400">
                          Belum ada secondary output — kategori hanya memakai
                          kategori bertanda Waste
                        </td>
                      </tr>
                    )}
                    {form.secondarys.map((line, index) => (
                      <tr
                        key={`${line.kategoriId}-${line.itemId}`}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-1.5 text-gray-600">
                          {line.kategoriNama}
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">
                          {line.itemNama}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            title="Hapus baris ini"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                secondarys: f.secondarys.filter(
                                  (_, i) => i !== index,
                                ),
                              }))
                            }
                            className="rounded border px-1.5 py-0.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                            style={{ borderColor: "#FCA5A5" }}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ModeHint mode={mode} kind="formula" />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton
                label={
                  busy ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "SIMPAN"
                  )
                }
                variant="primary"
                title="Simpan data ke database"
                disabled={busy || (mode === "create" ? !canCreate : !canUpdate)}
                onClick={() => void save()}
              />
              <ActionButton
                label="BATAL"
                title="Batalkan dan kembali ke daftar"
                disabled={busy}
                onClick={() => {
                  resetEditor();
                  setNotice(null);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {confirm && (
        <ConfirmDeleteDialog
          title="Konfirmasi Hapus Formula"
          description={`Yakin ingin menghapus formula ${
            rows.find((r) => r.idFormula === selectedId)?.mainOutputNama ||
            `ID ${selectedId}`
          } beserta seluruh baris input dan secondary outputnya?`}
          loading={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setConfirm(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
        {required && <span className="ml-0.5 text-[#B91C1C]">*</span>}
      </span>
      {children}
    </label>
  );
}

function ModeChip({ mode }: { mode: EntryMode }) {
  const map: Record<EntryMode, { label: string; cls: string }> = {
    view: { label: "Mode Lihat", cls: "bg-gray-100 text-gray-600" },
    create: { label: "Mode Baru", cls: "bg-emerald-50 text-emerald-700" },
    edit: { label: "Mode Ubah", cls: "bg-amber-50 text-amber-700" },
  };
  const item = map[mode];
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

function ModeHint({
  mode,
  kind,
}: {
  mode: EntryMode;
  kind: "formula";
}) {
  const texts: Record<string, Record<EntryMode, string>> = {
    formula: {
      view: "Klik salah satu baris pada daftar untuk memilih data, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk menambah formula baru.",
      create: "Pilih Main Kategori dan Main Output, tambahkan minimal 1 baris Input atau Secondary Output, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar.",
      edit: "Ubah data yang diinginkan, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
    },
  };
  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-relaxed text-blue-800">
      <span className="font-bold">Cara pakai: </span>
      {texts[kind][mode]}
    </div>
  );
}

function ActionButton({
  label,
  title,
  onClick,
  disabled,
  variant = "default",
}: {
  label: ReactNode;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const styles: Record<string, string> = {
    default: "border bg-white text-gray-700 hover:bg-gray-50",
    primary: "text-white",
    danger: "border bg-white text-red-600 hover:bg-red-50",
  };
  const background =
    variant === "primary"
      ? { background: PRIMARY }
      : variant === "danger"
        ? { borderColor: "#FCA5A5" }
        : { borderColor: BORDER };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-[12px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
      style={background}
    >
      {label}
    </button>
  );
}

function ConfirmDeleteDialog({
  title,
  description,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-[#B91C1C] px-[18px] py-3">
          <p className="flex-1 text-[16px] font-bold tracking-wide text-white">
            {title}
          </p>
        </div>
        <div className="px-5 pb-2 pt-3.5">
          <p className="text-[13px] leading-[1.4] text-gray-700">
            {description}
          </p>
          <p className="mt-2 text-[12px] leading-[1.4] text-gray-500">
            Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </p>
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
            disabled={loading}
            className="rounded-[10px] border px-4 py-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: "#CAC4D0" }}
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#B91C1C] px-[18px] py-2.5 text-[14px] font-semibold text-white shadow-sm disabled:bg-[#B91C1C]/40"
          >
            {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
            HAPUS
          </button>
        </div>
      </div>
    </div>
  );
}
