"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  createCetakanBaruAction,
  createWarnaBaruAction,
  deleteCetakanAction,
  getCetakanDetailAction,
  getCetakanListAction,
  getCetakanOptionsAction,
  saveCetakanAction,
} from "@/app/(app)/master/cetakan/actions";
import type {
  BarangJadiOption,
  CetakanWarnaKey,
  CetakanWarnaListQuery,
  CetakanWarnaOptions,
  CetakanWarnaRow,
  FurnitureWipOption,
} from "@/services/master-cetakan-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type CetakanForm = {
  idCetakan: string;
  idWarna: string;
  idMaterial: string;
  barangJadi: BarangJadiOption[];
  furnitureWip: FurnitureWipOption[];
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function emptyForm(): CetakanForm {
  return {
    idCetakan: "",
    idWarna: "",
    idMaterial: "",
    barangJadi: [],
    furnitureWip: [],
  };
}

export function CetakanWarnaWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [options, setOptions] = useState<CetakanWarnaOptions | null>(null);
  const [rows, setRows] = useState<CetakanWarnaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [topInput, setTopInput] = useState("100");
  const [qInput, setQInput] = useState("");
  const [listQuery, setListQuery] = useState<CetakanWarnaListQuery>({
    top: 100,
    q: "",
  });

  const [mode, setMode] = useState<EntryMode>("view");
  const [form, setForm] = useState<CetakanForm>(emptyForm());
  const [selectedKey, setSelectedKey] = useState<CetakanWarnaKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Tambah master Cetakan / Warna baru langsung dari form Tambah
  const [newKind, setNewKind] = useState<"cetakan" | "warna" | null>(null);
  const [newName, setNewName] = useState("");
  const [newBusy, setNewBusy] = useState(false);

  const [bjPick, setBjPick] = useState("");
  const [wipPick, setWipPick] = useState("");
  const [bjSel, setBjSel] = useState<number | null>(null);
  const [wipSel, setWipSel] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getCetakanOptionsAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setOptions(res.options);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setListLoading(true);
      const res = await getCetakanListAction(listQuery);
      if (cancelled) return;
      setListLoading(false);
      if (res.ok) {
        setRows(res.rows);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, listQuery]);

  const inputActive = mode !== "view";

  async function submitNewMaster() {
    if (!newKind) return;
    const nama = newName.trim();
    if (!nama) {
      setError(`Nama ${newKind} baru wajib diisi`);
      return;
    }
    setNewBusy(true);
    setError(null);
    if (newKind === "cetakan") {
      const res = await createCetakanBaruAction(nama);
      setNewBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const c = res.cetakan;
      setOptions((o) =>
        o
          ? {
              ...o,
              cetakan: [...o.cetakan, c].sort((a, b) =>
                a.namaCetakan.localeCompare(b.namaCetakan),
              ),
            }
          : o,
      );
      setForm((f) => ({ ...f, idCetakan: String(c.idCetakan) }));
      setNotice(`Cetakan "${c.namaCetakan}" ditambahkan ke master`);
    } else {
      const res = await createWarnaBaruAction(nama);
      setNewBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const w = res.warna;
      setOptions((o) =>
        o
          ? {
              ...o,
              warna: [...o.warna, w].sort((a, b) =>
                a.warna.localeCompare(b.warna),
              ),
            }
          : o,
      );
      setForm((f) => ({ ...f, idWarna: String(w.idWarna) }));
      setNotice(`Warna "${w.warna}" ditambahkan ke master`);
    }
    setNewKind(null);
    setNewName("");
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function applyListQuery() {
    const parsed = parseInt(topInput, 10);
    const top = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
    setListQuery({ top: Math.min(top, 1000), q: qInput });
  }

  function resetForm() {
    setNewKind(null);
    setNewName("");
    setMode("view");
    setForm(emptyForm());
    setSelectedKey(null);
    setError(null);
    setNotice(null);
    setBjPick("");
    setWipPick("");
    setBjSel(null);
    setWipSel(null);
  }

  function selectRow(row: CetakanWarnaRow) {
    if (inputActive) return;
    setNotice(null);
    const key: CetakanWarnaKey = {
      idCetakan: row.idCetakan,
      idWarna: row.idWarna,
      idMaterial: row.idMaterial,
    };
    setSelectedKey(key);
    setError(null);
    setBjSel(null);
    setWipSel(null);
    setBjPick("");
    setWipPick("");
    setForm({
      idCetakan: String(row.idCetakan),
      idWarna: String(row.idWarna),
      idMaterial: row.idMaterial > 0 ? String(row.idMaterial) : "",
      barangJadi: [],
      furnitureWip: [],
    });
    setDetailLoading(true);
    void (async () => {
      const res = await getCetakanDetailAction(key);
      setDetailLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setForm((f) =>
        f.idCetakan === String(key.idCetakan) &&
        f.idWarna === String(key.idWarna) &&
        (f.idMaterial || "0") === String(key.idMaterial)
          ? {
              ...f,
              barangJadi: res.detail.barangJadi,
              furnitureWip: res.detail.furnitureWip,
            }
          : f,
      );
    })();
  }

  function startCreate() {
    if (!canCreate) return;
    setNotice(null);
    setMode("create");
    setSelectedKey(null);
    setError(null);
    setForm(emptyForm());
    setBjPick("");
    setWipPick("");
    setBjSel(null);
    setWipSel(null);
  }

  function addBj() {
    if (!inputActive) {
      setError("Silahkan klik Data Baru atau Ubah terlebih dulu.");
      return;
    }
    if (!(parseInt(form.idCetakan, 10) > 0)) {
      setError("Silahkan pilih Cetakan lebih dulu.");
      return;
    }
    if (!(parseInt(form.idWarna, 10) > 0)) {
      setError("Silahkan pilih Warna lebih dulu.");
      return;
    }
    if (form.furnitureWip.length > 0) {
      setError("Tidak boleh campur Barang Jadi dengan Furniture WIP.");
      return;
    }
    if (form.barangJadi.length >= 1) {
      setError("Barang Jadi hanya boleh 1 item saja.");
      return;
    }
    const id = parseInt(bjPick, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Silahkan pilih Barang Jadi.");
      return;
    }
    const found = options?.barangJadi.find((o) => o.idBJ === id);
    if (!found) return;
    setError(null);
    setForm((f) => ({ ...f, barangJadi: [found] }));
    setBjPick("");
    setBjSel(null);
  }

  function addWip() {
    if (!inputActive) {
      setError("Silahkan klik Data Baru atau Ubah terlebih dulu.");
      return;
    }
    if (!(parseInt(form.idCetakan, 10) > 0)) {
      setError("Silahkan pilih Cetakan lebih dulu.");
      return;
    }
    if (!(parseInt(form.idWarna, 10) > 0)) {
      setError("Silahkan pilih Warna lebih dulu.");
      return;
    }
    if (form.barangJadi.length > 0) {
      setError("Tidak boleh campur Furniture WIP dengan Barang Jadi.");
      return;
    }
    if (form.furnitureWip.length >= 4) {
      setError("Furniture WIP maksimal 4 item saja.");
      return;
    }
    const id = parseInt(wipPick, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Silahkan pilih Furniture WIP.");
      return;
    }
    if (form.furnitureWip.some((w) => w.idCabinetWIP === id)) {
      setError(
        "Furniture WIP ini sudah ada di input, tidak boleh ditambahkan lagi.",
      );
      return;
    }
    const found = options?.furnitureWip.find((o) => o.idCabinetWIP === id);
    if (!found) return;
    setError(null);
    setForm((f) => ({ ...f, furnitureWip: [...f.furnitureWip, found] }));
    setWipPick("");
    setWipSel(null);
  }

  function removeBj() {
    if (!inputActive) return;
    setForm((f) => ({
      ...f,
      barangJadi: bjSel == null ? f.barangJadi : f.barangJadi.filter((b) => b.idBJ !== bjSel),
    }));
    setBjSel(null);
  }

  function clearBj() {
    if (!inputActive) return;
    setForm((f) => ({ ...f, barangJadi: [] }));
    setBjSel(null);
  }

  function removeWip() {
    if (!inputActive) return;
    setForm((f) => ({
      ...f,
      furnitureWip:
        wipSel == null
          ? f.furnitureWip
          : f.furnitureWip.filter((w) => w.idCabinetWIP !== wipSel),
    }));
    setWipSel(null);
  }

  function clearWip() {
    if (!inputActive) return;
    setForm((f) => ({ ...f, furnitureWip: [] }));
    setWipSel(null);
  }

  async function save() {
    const idCetakan = parseInt(form.idCetakan, 10);
    const idWarna = parseInt(form.idWarna, 10);
    const idMaterial = parseInt(form.idMaterial, 10) || 0;

    if (!Number.isFinite(idCetakan) || idCetakan <= 0) {
      setError("Silahkan pilih Cetakan lebih dulu.");
      return;
    }
    if (!Number.isFinite(idWarna) || idWarna <= 0) {
      setError("Silahkan pilih Warna lebih dulu.");
      return;
    }
    if (form.barangJadi.length === 0 && form.furnitureWip.length === 0) {
      setError("Silahkan isi Barang Jadi atau Furniture WIP lebih dulu.");
      return;
    }
    if (form.barangJadi.length > 0 && form.furnitureWip.length > 0) {
      setError(
        "Tidak boleh campur Barang Jadi dan Furniture WIP dalam 1 data cetakan.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    const res = await saveCetakanAction(
      {
        idCetakan,
        idWarna,
        idMaterial,
        barangJadi: form.barangJadi.map((b) => b.idBJ),
        furnitureWip: form.furnitureWip.map((w) => w.idCabinetWIP),
      },
      mode === "edit" ? (selectedKey ?? undefined) : undefined,
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetForm();
    setNotice("Data cetakan berhasil disimpan.");
    applyListQuery();
  }

  async function confirmDelete() {
    if (!selectedKey) return;
    setBusy(true);
    setError(null);
    const res = await deleteCetakanAction(selectedKey);
    setBusy(false);
    setConfirm(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetForm();
    setNotice("Data cetakan berhasil dihapus.");
    applyListQuery();
  }

  const optionCount = options
    ? `${options.cetakan.length} Cetakan / ${options.warna.length} Warna`
    : "";

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">
            Master Cetakan Warna Material
          </h1>
          <p className="text-[12px] text-gray-500">
            Hubungan cetakan + warna dengan barang jadi atau furniture WIP
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

      {error && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {inputActive && (
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">
              Input Cetakan
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode={mode} />
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
                {loading ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin text-gray-400" />
                ) : (
                  optionCount
                )}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Cetakan" required>
                <select
                  value={form.idCetakan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idCetakan: e.target.value }))
                  }
                  disabled={!inputActive}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Cetakan --</option>
                  {(options?.cetakan ?? []).map((c) => (
                    <option key={c.idCetakan} value={String(c.idCetakan)}>
                      {c.namaCetakan}
                    </option>
                  ))}
                </select>
                {mode === "create" && canCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewKind("cetakan");
                      setNewName("");
                    }}
                    className="mt-1 text-[11px] font-semibold text-[#0B3B6F] hover:underline"
                  >
                    + Cetakan baru (tidak ada di daftar)
                  </button>
                )}
              </Field>
              <Field label="Warna" required>
                <select
                  value={form.idWarna}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idWarna: e.target.value }))
                  }
                  disabled={!inputActive}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Warna --</option>
                  {(options?.warna ?? []).map((w) => (
                    <option key={w.idWarna} value={String(w.idWarna)}>
                      {w.warna}
                    </option>
                  ))}
                </select>
                {mode === "create" && canCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewKind("warna");
                      setNewName("");
                    }}
                    className="mt-1 text-[11px] font-semibold text-[#0B3B6F] hover:underline"
                  >
                    + Warna baru (tidak ada di daftar)
                  </button>
                )}
              </Field>
              <Field label="Material (opsional)">
                <select
                  value={form.idMaterial}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idMaterial: e.target.value }))
                  }
                  disabled={!inputActive}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">- Tanpa Material -</option>
                  {(options?.materials ?? []).map((m) => (
                    <option
                      key={m.idCabinetMaterial}
                      value={String(m.idCabinetMaterial)}
                    >
                      {m.nama}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {newKind && (
              <div
                className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border bg-gray-50 p-2"
                style={{ borderColor: BORDER }}
              >
                <div className="min-w-[14rem] flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {newKind === "cetakan" ? "Nama Cetakan Baru" : "Nama Warna Baru"}
                  </span>
                  <input
                    type="text"
                    value={newName}
                    maxLength={newKind === "cetakan" ? 50 : 15}
                    autoFocus
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submitNewMaster();
                      }
                    }}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-[13px] uppercase outline-none focus:ring-2"
                    style={{ borderColor: BORDER }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submitNewMaster()}
                  disabled={newBusy}
                  className="rounded-lg bg-[#0B3B6F] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {newBusy ? "Menyimpan…" : "Simpan ke Master"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewKind(null);
                    setNewName("");
                  }}
                  disabled={newBusy}
                  className="rounded-lg border bg-white px-3 py-2 text-[12px] font-bold text-gray-600"
                  style={{ borderColor: BORDER }}
                >
                  Batal
                </button>
              </div>
            )}

            <p className="mt-2 text-[11.5px] leading-relaxed text-gray-500">
              Isi berurutan: pilih Cetakan dan Warna lebih dulu, lalu tambahkan
              minimal satu item — Barang Jadi{" "}
              <span className="font-bold text-gray-700">ATAU</span> Furniture
              WIP (tidak boleh campur dalam 1 data).
            </p>

            <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
              <div
                className="rounded-lg border p-2.5"
                style={{ borderColor: BORDER }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-gray-700">
                    Barang Jadi (maks. 1)
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    Jumlah: {form.barangJadi.length}
                  </span>
                </div>
                <p className="mb-2 text-[11px] leading-snug text-gray-500">
                  Maksimal 1 item, tidak boleh campur dengan Furniture WIP.
                </p>
                <div className="flex gap-2">
                  <select
                    value={bjPick}
                    onChange={(e) => setBjPick(e.target.value)}
                    disabled={!inputActive}
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">-- Pilih Barang Jadi --</option>
                    {(options?.barangJadi ?? []).map((b) => (
                      <option key={b.idBJ} value={String(b.idBJ)}>
                        {b.namaBJ}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Tambahkan ke daftar Barang Jadi"
                    onClick={addBj}
                    disabled={!inputActive}
                    className="rounded-lg px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ background: PRIMARY }}
                  >
                    Tambah
                  </button>
                </div>
                <div
                  className="mt-2 max-h-[130px] overflow-auto rounded-lg border"
                  style={{ borderColor: BORDER }}
                >
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <tbody>
                      {detailLoading && (
                        <tr>
                          <td className="px-2 py-4 text-center">
                            <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                          </td>
                        </tr>
                      )}
                      {!detailLoading && form.barangJadi.length === 0 && (
                        <tr>
                          <td className="px-2 py-4 text-center text-gray-400">
                            Belum ada barang jadi
                          </td>
                        </tr>
                      )}
                      {!detailLoading &&
                        form.barangJadi.map((b) => (
                          <tr
                            key={b.idBJ}
                            onClick={() => setBjSel(b.idBJ)}
                            className={`cursor-pointer ${
                              bjSel === b.idBJ ? "bg-blue-50" : ""
                            } hover:bg-gray-50`}
                            style={{ borderBottom: `1px solid ${BORDER}` }}
                          >
                            <td className="px-2 py-1.5 font-semibold text-gray-700">
                              {b.idBJ}
                            </td>
                            <td className="px-2 py-1.5 text-gray-800">
                              {b.namaBJ}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={removeBj}
                    title="Hapus item terpilih"
                    disabled={!inputActive}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-40"
                    style={{ borderColor: "#FCA5A5" }}
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={clearBj}
                    title="Hapus semua item"
                    disabled={!inputActive}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                    style={{ borderColor: BORDER }}
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg border p-2.5"
                style={{ borderColor: BORDER }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-gray-700">
                    Furniture WIP (maks. 4)
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    Jumlah: {form.furnitureWip.length}
                  </span>
                </div>
                <p className="mb-2 text-[11px] leading-snug text-gray-500">
                  Maksimal 4 item, tidak boleh campur dengan Barang Jadi.
                </p>
                <div className="flex gap-2">
                  <select
                    value={wipPick}
                    onChange={(e) => setWipPick(e.target.value)}
                    disabled={!inputActive}
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">-- Pilih Furniture WIP --</option>
                    {(options?.furnitureWip ?? []).map((w) => (
                      <option key={w.idCabinetWIP} value={String(w.idCabinetWIP)}>
                        {w.nama}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Tambahkan ke daftar Furniture WIP"
                    onClick={addWip}
                    disabled={!inputActive}
                    className="rounded-lg px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ background: PRIMARY }}
                  >
                    Tambah
                  </button>
                </div>
                <div
                  className="mt-2 max-h-[130px] overflow-auto rounded-lg border"
                  style={{ borderColor: BORDER }}
                >
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <tbody>
                      {detailLoading && (
                        <tr>
                          <td className="px-2 py-4 text-center">
                            <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                          </td>
                        </tr>
                      )}
                      {!detailLoading && form.furnitureWip.length === 0 && (
                        <tr>
                          <td className="px-2 py-4 text-center text-gray-400">
                            Belum ada furniture WIP
                          </td>
                        </tr>
                      )}
                      {!detailLoading &&
                        form.furnitureWip.map((w) => (
                          <tr
                            key={w.idCabinetWIP}
                            onClick={() => setWipSel(w.idCabinetWIP)}
                            className={`cursor-pointer ${
                              wipSel === w.idCabinetWIP ? "bg-blue-50" : ""
                            } hover:bg-gray-50`}
                            style={{ borderBottom: `1px solid ${BORDER}` }}
                          >
                            <td className="px-2 py-1.5 font-semibold text-gray-700">
                              {w.idCabinetWIP}
                            </td>
                            <td className="px-2 py-1.5 text-gray-800">
                              {w.nama}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={removeWip}
                    title="Hapus item terpilih"
                    disabled={!inputActive}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-40"
                    style={{ borderColor: "#FCA5A5" }}
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={clearWip}
                    title="Hapus semua item"
                    disabled={!inputActive}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                    style={{ borderColor: BORDER }}
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>
            </div>

            <ModeHint mode={mode} />

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
                disabled={
                  busy || (mode === "create" ? !canCreate : !canUpdate)
                }
                onClick={() => void save()}
              />
              <ActionButton
                label="BATAL"
                title="Batalkan dan kembali ke daftar"
                disabled={busy}
                onClick={resetForm}
              />
            </div>
          </div>
        </section>
        )}

        {!inputActive && (
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">
              Daftar Cetakan
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode="view" />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${rows.length} Data`}
              </span>
            </div>
          </header>

          <form
            className="flex flex-wrap items-end gap-2 px-3 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyListQuery();
            }}
          >
            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Cari
              </span>
              <input
                type="text"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                disabled={inputActive}
                placeholder="Nama cetakan / warna / material..."
                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                style={{ borderColor: BORDER }}
              />
            </label>
            <label className="w-[90px]">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Tampil
              </span>
              <input
                type="number"
                min={1}
                max={1000}
                value={topInput}
                onChange={(e) => setTopInput(e.target.value)}
                disabled={inputActive}
                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                style={{ borderColor: BORDER }}
              />
            </label>
            <button
              type="submit"
              disabled={inputActive}
              className="rounded-lg px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
              style={{ background: PRIMARY }}
            >
              Tampilkan
            </button>
          </form>

          <div className="max-h-[420px] overflow-auto px-3 pt-2">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    CETAKAN
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    WARNA
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    MATERIAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {listLoading && (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!listLoading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data cetakan
                    </td>
                  </tr>
                )}
                {!listLoading &&
                  rows.map((row) => {
                    const key = `${row.idCetakan}-${row.idWarna}-${row.idMaterial}`;
                    const selected =
                      selectedKey != null &&
                      selectedKey.idCetakan === row.idCetakan &&
                      selectedKey.idWarna === row.idWarna &&
                      selectedKey.idMaterial === row.idMaterial;
                    return (
                      <tr
                        key={key}
                        onClick={() => selectRow(row)}
                        onDoubleClick={() => {
                          if (canUpdate) {
                            selectRow(row);
                            setMode("edit");
                          }
                        }}
                        className={`cursor-pointer ${
                          selected ? "bg-blue-50" : ""
                        } hover:bg-gray-50`}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-2 font-semibold text-gray-700">
                          {row.namaCetakan}
                        </td>
                        <td className="px-2 py-2 text-gray-800">{row.warna}</td>
                        <td className="px-2 py-2 text-gray-600">
                          {row.namaMaterial || "-"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div
            className="mt-3 border-t px-3 py-3"
            style={{ borderColor: BORDER }}
          >
            <div className="grid grid-cols-3 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah data baru"
                disabled={!canCreate || busy}
                onClick={startCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah data yang sedang dipilih"
                disabled={selectedKey == null || !canUpdate || busy}
                onClick={() => setMode("edit")}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus data yang sedang dipilih"
                disabled={selectedKey == null || !canDelete || busy}
                onClick={() => setConfirm(true)}
              />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-gray-500">
              Klik baris pada daftar untuk memilih data, lalu tekan UBAH atau
              HAPUS. Klik ganda baris untuk langsung mode ubah. Tekan TAMBAH
              untuk data baru.
            </p>
          </div>
        </section>
        )}
      </div>

      {confirm && selectedKey && (
        <ConfirmDeleteDialog
          title="Konfirmasi Hapus Cetakan"
          description={`Yakin ingin menghapus data ${
            options?.cetakan.find((c) => c.idCetakan === selectedKey.idCetakan)
              ?.namaCetakan ?? selectedKey.idCetakan
          } - ${
            options?.warna.find((w) => w.idWarna === selectedKey.idWarna)
              ?.warna ?? selectedKey.idWarna
          } beserta daftar barang jadi / furniture WIP-nya?`}
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

function ModeHint({ mode }: { mode: EntryMode }) {
  const texts: Record<EntryMode, string> = {
    view: "Klik baris pada daftar untuk memilih data, lalu UBAH atau HAPUS. Tekan TAMBAH untuk data baru.",
    create: "Pilih Cetakan dan Warna (bertanda *), lalu tekan Tambah pada kotak Barang Jadi atau Furniture WIP, dan terakhir tekan SIMPAN. Tekan BATAL untuk kembali ke daftar.",
    edit: "Ubah data yang diinginkan, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
  };
  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-relaxed text-blue-800">
      <span className="font-bold">Cara pakai: </span>
      {texts[mode]}
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
