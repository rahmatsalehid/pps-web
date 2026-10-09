"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  addLokasiJenisAction,
  deleteBlokAction,
  deleteLokasiAction,
  getBlokListAction,
  getBlokLokasiMasterAction,
  getJenisListAction,
  getLokasiJenisListAction,
  getLokasiListAction,
  getNextLokasiIdAction,
  removeLokasiJenisAction,
  saveBlokAction,
  saveLokasiAction,
} from "@/app/(app)/master/blok-lokasi/actions";
import type {
  BlokRow,
  JenisOption,
  KategoriOption,
  LokasiJenisRow,
  LokasiRow,
  WarehouseOption,
} from "@/services/master-blok-lokasi-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type BlokForm = {
  blok: string;
  idWarehouse: string;
};

type LokasiForm = {
  idLokasi: number;
  description: string;
  enable: boolean;
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function emptyBlokForm(): BlokForm {
  return { blok: "", idWarehouse: "" };
}

function emptyLokasiForm(): LokasiForm {
  return { idLokasi: 0, description: "", enable: true };
}

export function BlokLokasiWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [kategoris, setKategoris] = useState<KategoriOption[]>([]);
  const [bloks, setBloks] = useState<BlokRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const [blokMode, setBlokMode] = useState<EntryMode>("view");
  const [blokForm, setBlokForm] = useState<BlokForm>(emptyBlokForm());
  const [selectedBlok, setSelectedBlok] = useState<string | null>(null);
  const [blokError, setBlokError] = useState<string | null>(null);
  const [blokBusy, setBlokBusy] = useState(false);
  const [blokConfirm, setBlokConfirm] = useState(false);

  const [lokasis, setLokasis] = useState<LokasiRow[]>([]);
  const [lokasiLoading, setLokasiLoading] = useState(false);
  const [lokasiMode, setLokasiMode] = useState<EntryMode>("view");
  const [lokasiForm, setLokasiForm] = useState<LokasiForm>(emptyLokasiForm());
  const [selectedLokasi, setSelectedLokasi] = useState<LokasiRow | null>(null);
  const [lokasiError, setLokasiError] = useState<string | null>(null);
  const [lokasiBusy, setLokasiBusy] = useState(false);
  const [lokasiConfirm, setLokasiConfirm] = useState(false);

  const [idKategoriPick, setIdKategoriPick] = useState("");
  const [jenisOptions, setJenisOptions] = useState<JenisOption[]>([]);
  const [idJenisPick, setIdJenisPick] = useState("");
  const [lokasiJenis, setLokasiJenis] = useState<LokasiJenisRow[]>([]);
  const [jenisSel, setJenisSel] = useState<LokasiJenisRow | null>(null);
  const [jenisError, setJenisError] = useState<string | null>(null);
  const [jenisBusy, setJenisBusy] = useState(false);
  const [jenisConfirm, setJenisConfirm] = useState(false);
  const [jenisLoading, setJenisLoading] = useState(false);

  const selectedBlokRef = useRef<string | null>(null);
  useEffect(() => {
    selectedBlokRef.current = selectedBlok;
  }, [selectedBlok]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [m, b] = await Promise.all([
        getBlokLokasiMasterAction(),
        getBlokListAction(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!m.ok) {
        setLoadError(m.error);
        return;
      }
      if (!b.ok) {
        setLoadError(b.error);
        return;
      }
      setLoadError(null);
      setWarehouses(m.master.warehouses);
      setKategoris(m.master.kategoris);
      setBloks(b.bloks);
      const sel = selectedBlokRef.current;
      if (sel && !b.bloks.some((x) => x.blok === sel)) {
        setSelectedBlok(null);
        setBlokForm(emptyBlokForm());
        setBlokMode("view");
        setLokasis([]);
        setSelectedLokasi(null);
        setLokasiForm(emptyLokasiForm());
        setLokasiMode("view");
        setLokasiJenis([]);
        setJenisSel(null);
        setIdKategoriPick("");
        setIdJenisPick("");
        setJenisOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const id = parseInt(idKategoriPick, 10);
    if (!idKategoriPick || !Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    void (async () => {
      const res = await getJenisListAction(id);
      if (cancelled) return;
      if (!res.ok) {
        setJenisError(res.error);
        setJenisOptions([]);
        return;
      }
      setJenisError(null);
      setJenisOptions(res.jenis);
    })();
    return () => {
      cancelled = true;
    };
  }, [idKategoriPick]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function resetJenisPick() {
    setIdKategoriPick("");
    setIdJenisPick("");
    setJenisOptions([]);
    setJenisError(null);
  }

  function clearLokasiContext() {
    setSelectedLokasi(null);
    setLokasiForm(emptyLokasiForm());
    setLokasiMode("view");
    setLokasiError(null);
    setLokasiJenis([]);
    setJenisSel(null);
    resetJenisPick();
  }

  async function loadLokasi(blok: string) {
    setLokasiLoading(true);
    const res = await getLokasiListAction(blok);
    setLokasiLoading(false);
    if (!res.ok) {
      setLokasiError(res.error);
      return;
    }
    setLokasiError(null);
    setLokasis(res.lokasis);
  }

  async function loadLokasiJenis(blok: string, idLokasi: number) {
    setJenisLoading(true);
    const res = await getLokasiJenisListAction(blok, idLokasi);
    setJenisLoading(false);
    if (!res.ok) {
      setJenisError(res.error);
      return;
    }
    setJenisError(null);
    setLokasiJenis(res.rows);
  }

  function selectBlokRow(row: BlokRow) {
    if (blokMode !== "view") return;
    setNotice(null);
    setBlokError(null);
    setSelectedBlok(row.blok);
    setBlokForm({
      blok: row.blok,
      idWarehouse: row.idWarehouse ? String(row.idWarehouse) : "",
    });
    clearLokasiContext();
    setLokasis([]);
    void loadLokasi(row.blok);
  }

  function startBlokCreate() {
    if (!canCreate) return;
    setNotice(null);
    setBlokError(null);
    setSelectedBlok(null);
    setBlokForm(emptyBlokForm());
    setBlokMode("create");
    clearLokasiContext();
    setLokasis([]);
  }

  function cancelBlok() {
    const row = bloks.find((x) => x.blok === selectedBlok);
    setBlokForm(
      row
        ? {
            blok: row.blok,
            idWarehouse: row.idWarehouse ? String(row.idWarehouse) : "",
          }
        : emptyBlokForm(),
    );
    setBlokMode("view");
    setBlokError(null);
  }

  async function saveBlok() {
    const blok = blokForm.blok.trim().toUpperCase();
    if (!blok) {
      setBlokError("Kode blok wajib diisi.");
      return;
    }
    if (blok.length > 3) {
      setBlokError("Kode blok maksimal 3 karakter.");
      return;
    }
    if (!/^[A-Z0-9]+$/.test(blok)) {
      setBlokError("Kode blok hanya boleh huruf dan angka.");
      return;
    }
    const idWarehouse = parseInt(blokForm.idWarehouse, 10);
    if (!Number.isFinite(idWarehouse) || idWarehouse <= 0) {
      setBlokError("Warehouse wajib dipilih.");
      return;
    }

    setBlokBusy(true);
    setBlokError(null);
    const res = await saveBlokAction(
      { blok, idWarehouse },
      blokMode === "edit" ? blokForm.blok : undefined,
    );
    setBlokBusy(false);
    if (!res.ok) {
      setBlokError(res.error);
      return;
    }
    setBlokMode("view");
    setBlokForm(emptyBlokForm());
    setSelectedBlok(null);
    setLokasis([]);
    clearLokasiContext();
    setNotice("Data blok berhasil disimpan.");
    reload();
  }

  async function confirmDeleteBlok() {
    if (!selectedBlok) return;
    setBlokBusy(true);
    setBlokError(null);
    const res = await deleteBlokAction(selectedBlok);
    setBlokBusy(false);
    setBlokConfirm(false);
    if (!res.ok) {
      setBlokError(res.error);
      return;
    }
    setBlokMode("view");
    setBlokForm(emptyBlokForm());
    setSelectedBlok(null);
    setLokasis([]);
    clearLokasiContext();
    setNotice("Data blok berhasil dihapus.");
    reload();
  }

  function selectLokasiRow(row: LokasiRow) {
    if (lokasiMode !== "view" || !selectedBlok) return;
    setNotice(null);
    setLokasiError(null);
    setSelectedLokasi(row);
    setLokasiForm({
      idLokasi: row.idLokasi,
      description: row.description,
      enable: row.enable,
    });
    setLokasiJenis([]);
    setJenisSel(null);
    setJenisError(null);
    resetJenisPick();
    void loadLokasiJenis(selectedBlok, row.idLokasi);
  }

  function startLokasiCreate() {
    if (!canCreate) return;
    if (!selectedBlok) {
      setLokasiError("Pilih blok terlebih dahulu dari tabel sebelah kiri.");
      return;
    }
    setNotice(null);
    setLokasiError(null);
    setSelectedLokasi(null);
    setLokasiForm(emptyLokasiForm());
    setLokasiMode("create");
    setLokasiJenis([]);
    setJenisSel(null);
    resetJenisPick();
    void (async () => {
      const res = await getNextLokasiIdAction(selectedBlok);
      if (res.ok) {
        setLokasiForm((f) => ({ ...f, idLokasi: res.nextId }));
      }
    })();
  }

  function cancelLokasi() {
    if (selectedLokasi) {
      setLokasiForm({
        idLokasi: selectedLokasi.idLokasi,
        description: selectedLokasi.description,
        enable: selectedLokasi.enable,
      });
    } else {
      setLokasiForm(emptyLokasiForm());
    }
    setLokasiMode("view");
    setLokasiError(null);
  }

  async function saveLokasi() {
    if (!selectedBlok) {
      setLokasiError("Pilih blok terlebih dahulu.");
      return;
    }
    const description = lokasiForm.description.trim();
    if (!description) {
      setLokasiError("Deskripsi lokasi wajib diisi.");
      return;
    }
    if (description.length > 150) {
      setLokasiError("Deskripsi lokasi maksimal 150 karakter.");
      return;
    }

    setLokasiBusy(true);
    setLokasiError(null);
    const res = await saveLokasiAction(
      { blok: selectedBlok, description, enable: lokasiForm.enable },
      lokasiMode === "edit" && selectedLokasi
        ? { blok: selectedBlok, idLokasi: selectedLokasi.idLokasi }
        : undefined,
    );
    setLokasiBusy(false);
    if (!res.ok) {
      setLokasiError(res.error);
      return;
    }
    setLokasiMode("view");
    setLokasiForm(emptyLokasiForm());
    setSelectedLokasi(null);
    setLokasiJenis([]);
    setJenisSel(null);
    resetJenisPick();
    setNotice("Data lokasi berhasil disimpan.");
    await loadLokasi(selectedBlok);
  }

  async function confirmDeleteLokasi() {
    if (!selectedBlok || !selectedLokasi) return;
    setLokasiBusy(true);
    setLokasiError(null);
    const res = await deleteLokasiAction(selectedBlok, selectedLokasi.idLokasi);
    setLokasiBusy(false);
    setLokasiConfirm(false);
    if (!res.ok) {
      setLokasiError(res.error);
      return;
    }
    setLokasiMode("view");
    setLokasiForm(emptyLokasiForm());
    setSelectedLokasi(null);
    setLokasiJenis([]);
    setJenisSel(null);
    resetJenisPick();
    setNotice("Data lokasi berhasil dihapus.");
    await loadLokasi(selectedBlok);
  }

  async function addJenis() {
    if (!selectedBlok || !selectedLokasi) {
      setJenisError("Pilih lokasi terlebih dahulu.");
      return;
    }
    const idKategori = parseInt(idKategoriPick, 10);
    if (!Number.isFinite(idKategori) || idKategori <= 0) {
      setJenisError("Pilih kategori terlebih dahulu.");
      return;
    }
    const idJenis = parseInt(idJenisPick, 10);
    if (!Number.isFinite(idJenis) || idJenis <= 0) {
      setJenisError("Pilih jenis terlebih dahulu.");
      return;
    }

    setJenisBusy(true);
    setJenisError(null);
    const res = await addLokasiJenisAction({
      blok: selectedBlok,
      idLokasi: selectedLokasi.idLokasi,
      idKategori,
      idJenis,
    });
    setJenisBusy(false);
    if (!res.ok) {
      setJenisError(res.error);
      return;
    }
    setIdJenisPick("");
    await loadLokasiJenis(selectedBlok, selectedLokasi.idLokasi);
  }

  async function confirmRemoveJenis() {
    if (!selectedBlok || !selectedLokasi || !jenisSel) return;
    setJenisBusy(true);
    setJenisError(null);
    const res = await removeLokasiJenisAction({
      blok: selectedBlok,
      idLokasi: selectedLokasi.idLokasi,
      idKategori: jenisSel.idKategori,
      idJenis: jenisSel.idJenis,
    });
    setJenisBusy(false);
    setJenisConfirm(false);
    if (!res.ok) {
      setJenisError(res.error);
      return;
    }
    setJenisSel(null);
    setNotice("Jenis berhasil dihapus dari lokasi.");
    await loadLokasiJenis(selectedBlok, selectedLokasi.idLokasi);
  }

  const blokInputActive = blokMode !== "view";
  const lokasiInputActive = lokasiMode !== "view" && !!selectedBlok;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">
            Master Blok &amp; Lokasi
          </h1>
          <p className="text-[12px] text-gray-500">
            Kode blok beserta daftar lokasi dan jenis di dalamnya
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

      <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">Data Blok</h2>
            <div className="flex items-center gap-2">
              <ModeChip mode={blokMode} />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${bloks.length} Data`}
              </span>
            </div>
          </header>

          <div className="border-b px-3 py-3" style={{ borderColor: BORDER }}>
            <div className="grid gap-2">
              <Field label="Kode Blok" required>
                <input
                  type="text"
                  value={blokForm.blok}
                  onChange={(e) =>
                    setBlokForm((f) => ({
                      ...f,
                      blok: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, ""),
                    }))
                  }
                  disabled={!blokInputActive}
                  readOnly={blokMode === "edit"}
                  maxLength={3}
                  placeholder="Kode blok (3 karakter)"
                  className="w-full rounded-lg border px-3 py-2 text-[13px] uppercase outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Warehouse" required>
                <select
                  value={blokForm.idWarehouse}
                  onChange={(e) =>
                    setBlokForm((f) => ({ ...f, idWarehouse: e.target.value }))
                  }
                  disabled={blokMode === "view"}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.idWarehouse} value={String(w.idWarehouse)}>
                      {w.namaWarehouse}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {blokError && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {blokError}
              </div>
            )}

            <ModeHint mode={blokMode} kind="blok" />

            {blokMode === "view" ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ActionButton
                  label="TAMBAH"
                  title="Tambah blok baru"
                  disabled={!canCreate || blokBusy}
                  onClick={startBlokCreate}
                />
                <ActionButton
                  label="UBAH"
                  title="Ubah blok yang sedang dipilih"
                  disabled={selectedBlok == null || !canUpdate || blokBusy}
                  onClick={() => {
                    setNotice(null);
                    setBlokError(null);
                    setBlokMode("edit");
                  }}
                />
                <ActionButton
                  label="HAPUS"
                  variant="danger"
                  title="Hapus blok yang sedang dipilih"
                  disabled={selectedBlok == null || !canDelete || blokBusy}
                  onClick={() => setBlokConfirm(true)}
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton
                  label={
                    blokBusy ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        SIMPAN
                      </span>
                    ) : (
                      "SIMPAN"
                    )
                  }
                  title="Simpan data ke database"
                  variant="primary"
                  disabled={
                    blokBusy || (blokMode === "create" ? !canCreate : !canUpdate)
                  }
                  onClick={() => void saveBlok()}
                />
                <ActionButton
                  label="BATAL"
                  title="Batalkan dan kembali ke daftar"
                  disabled={blokBusy}
                  onClick={cancelBlok}
                />
              </div>
            )}
          </div>

          <div className="max-h-[420px] overflow-auto px-3 py-2">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Blok
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Warehouse
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={2} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!loading && bloks.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data blok
                    </td>
                  </tr>
                )}
                {!loading &&
                  bloks.map((row) => (
                    <tr
                      key={row.blok}
                      onClick={() => selectBlokRow(row)}
                      onDoubleClick={() => {
                        if (canUpdate) {
                          selectBlokRow(row);
                          setBlokMode("edit");
                        }
                      }}
                      className={`cursor-pointer ${
                        selectedBlok === row.blok ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.blok}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.namaWarehouse || "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-3">
          <section
            className="flex flex-col overflow-hidden rounded-xl border bg-white"
            style={{ borderColor: BORDER }}
          >
            <header
              className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-gray-800">
                  Data Lokasi
                </h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: "#DBEAFE", color: PRIMARY }}
                >
                  {`Blok: ${selectedBlok ?? "--"}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ModeChip mode={lokasiMode} />
                <span className="text-[12px] font-semibold text-gray-500">
                  {`${lokasis.length} Data`}
                </span>
              </div>
            </header>

            {!selectedBlok ? (
              <div className="px-3 py-4 text-[12.5px] text-gray-500">
                Pilih blok terlebih dahulu dari tabel sebelah kiri untuk
                mengelola data lokasi.
              </div>
            ) : (
              <div className="border-b px-3 py-3" style={{ borderColor: BORDER }}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="ID Lokasi">
                    <input
                      type="text"
                      readOnly
                      value={
                        lokasiForm.idLokasi > 0
                          ? String(lokasiForm.idLokasi)
                          : ""
                      }
                      placeholder="Otomatis"
                      className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none disabled:bg-gray-50"
                      style={{ borderColor: BORDER }}
                    />
                  </Field>
                  <Field label="Deskripsi" required>
                    <input
                      type="text"
                      value={lokasiForm.description}
                      onChange={(e) =>
                        setLokasiForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      disabled={!lokasiInputActive}
                      maxLength={150}
                      placeholder="Deskripsi lokasi (contoh: Rak A - Baris 1)"
                      className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-600"
                      style={{ borderColor: BORDER }}
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={lokasiForm.enable}
                      onChange={(e) =>
                        setLokasiForm((f) => ({
                          ...f,
                          enable: e.target.checked,
                        }))
                      }
                      disabled={!lokasiInputActive}
                      className="h-4 w-4"
                    />
                    <span className="text-[13px] font-semibold text-gray-700">
                      Aktif
                    </span>
                  </label>
                </div>

                {lokasiError && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    {lokasiError}
                  </div>
                )}

                <ModeHint mode={lokasiMode} kind="lokasi" />

                {lokasiMode === "view" ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <ActionButton
                      label="TAMBAH"
                      title="Tambah lokasi baru pada blok ini"
                      disabled={!canCreate || blokBusy || lokasiBusy}
                      onClick={startLokasiCreate}
                    />
                    <ActionButton
                      label="UBAH"
                      title="Ubah lokasi yang sedang dipilih"
                      disabled={
                        selectedLokasi == null || !canUpdate || lokasiBusy
                      }
                      onClick={() => {
                        setNotice(null);
                        setLokasiError(null);
                        setLokasiMode("edit");
                      }}
                    />
                    <ActionButton
                      label="HAPUS"
                      variant="danger"
                      title="Hapus lokasi yang sedang dipilih"
                      disabled={
                        selectedLokasi == null || !canDelete || lokasiBusy
                      }
                      onClick={() => setLokasiConfirm(true)}
                    />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <ActionButton
                      label={
                        lokasiBusy ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            SIMPAN
                          </span>
                        ) : (
                          "SIMPAN"
                        )
                      }
                      title="Simpan data ke database"
                      variant="primary"
                      disabled={
                        lokasiBusy ||
                        (lokasiMode === "create" ? !canCreate : !canUpdate)
                      }
                      onClick={() => void saveLokasi()}
                    />
                    <ActionButton
                      label="BATAL"
                      title="Batalkan dan kembali ke daftar"
                      disabled={lokasiBusy}
                      onClick={cancelLokasi}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="max-h-[260px] overflow-auto px-3 py-2">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-2 py-2 font-semibold text-gray-500">
                      ID Lokasi
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-500">
                      Deskripsi
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-500">
                      Aktif
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lokasiLoading && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center">
                        <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                      </td>
                    </tr>
                  )}
                  {!lokasiLoading && !selectedBlok && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-6 text-center text-gray-400"
                      >
                        Pilih blok untuk melihat daftar lokasi
                      </td>
                    </tr>
                  )}
                  {!lokasiLoading && selectedBlok && lokasis.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-6 text-center text-gray-400"
                      >
                        Tidak ada data lokasi
                      </td>
                    </tr>
                  )}
                  {!lokasiLoading &&
                    selectedBlok &&
                    lokasis.map((row) => (
                      <tr
                        key={row.idLokasi}
                        onClick={() => selectLokasiRow(row)}
                        onDoubleClick={() => {
                          if (canUpdate) {
                            selectLokasiRow(row);
                            setLokasiMode("edit");
                          }
                        }}
                        className={`cursor-pointer ${
                          selectedLokasi?.idLokasi === row.idLokasi
                            ? "bg-blue-50"
                            : ""
                        } hover:bg-gray-50`}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-2 font-semibold text-gray-700">
                          {row.idLokasi}
                        </td>
                        <td className="px-2 py-2 text-gray-800">
                          {row.description}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              row.enable
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {row.enable ? "AKTIF" : "NONAKTIF"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="flex flex-col overflow-hidden rounded-xl border bg-white"
            style={{ borderColor: BORDER }}
          >
            <header
              className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
              style={{ borderColor: BORDER }}
            >
              <h2 className="text-[14px] font-bold text-gray-800">
                Daftar Jenis
              </h2>
              <span className="text-[12px] font-semibold text-gray-500">
                {`${lokasiJenis.length} Jenis`}
              </span>
            </header>

            {!selectedLokasi ? (
              <div className="px-3 py-4 text-[12.5px] text-gray-500">
                Pilih data lokasi dari tabel di atas untuk mengelola daftar
                jenis.
              </div>
            ) : (
              <div className="border-b px-3 py-3" style={{ borderColor: BORDER }}>
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Field label="Kategori">
                    <select
                      value={idKategoriPick}
                      onChange={(e) => {
                        setIdKategoriPick(e.target.value);
                        setIdJenisPick("");
                        setJenisOptions([]);
                        setJenisError(null);
                      }}
                      className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                      style={{ borderColor: BORDER }}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {kategoris.map((k) => (
                        <option key={k.idKategori} value={String(k.idKategori)}>
                          {k.namaKategori}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Jenis">
                    <select
                      value={idJenisPick}
                      onChange={(e) => setIdJenisPick(e.target.value)}
                      disabled={!idKategoriPick}
                      className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
                      style={{ borderColor: BORDER }}
                    >
                      <option value="">-- Pilih Jenis --</option>
                      {jenisOptions.map((j) => (
                        <option key={j.id} value={String(j.id)}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end gap-2 pb-0.5">
                    <ActionButton
                      label={
                        <span className="inline-flex items-center gap-1">
                          {jenisBusy ? (
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                          ) : null}
                          TAMBAH
                        </span>
                      }
                      title="Tambah jenis ke lokasi ini"
                      variant="primary"
                      disabled={
                        !canCreate || jenisBusy || selectedLokasi == null
                      }
                      onClick={() => void addJenis()}
                    />
                    <ActionButton
                      label="HAPUS"
                      variant="danger"
                      title="Hapus jenis dari lokasi ini"
                      disabled={
                        !canDelete || jenisBusy || jenisSel == null
                      }
                      onClick={() => setJenisConfirm(true)}
                    />
                  </div>
                </div>

                {jenisError && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    {jenisError}
                  </div>
                )}
              </div>
            )}

            <div className="max-h-[200px] overflow-auto px-3 py-2">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-2 py-2 font-semibold text-gray-500">
                      Kategori
                    </th>
                    <th className="px-2 py-2 font-semibold text-gray-500">
                      Jenis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jenisLoading && (
                    <tr>
                      <td colSpan={2} className="px-2 py-6 text-center">
                        <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                      </td>
                    </tr>
                  )}
                  {!jenisLoading && !selectedLokasi && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-2 py-6 text-center text-gray-400"
                      >
                        Pilih lokasi untuk melihat daftar jenis
                      </td>
                    </tr>
                  )}
                  {!jenisLoading && selectedLokasi && lokasiJenis.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-2 py-6 text-center text-gray-400"
                      >
                        Belum ada jenis pada lokasi ini
                      </td>
                    </tr>
                  )}
                  {!jenisLoading &&
                    selectedLokasi &&
                    lokasiJenis.map((row) => {
                      const key = `${row.idKategori}|${row.idJenis}`;
                      const isSelected =
                        jenisSel != null &&
                        jenisSel.idKategori === row.idKategori &&
                        jenisSel.idJenis === row.idJenis;
                      return (
                        <tr
                          key={key}
                          onClick={() => {
                            setJenisError(null);
                            setJenisSel(isSelected ? null : row);
                          }}
                          className={`cursor-pointer ${
                            isSelected ? "bg-blue-50" : ""
                          } hover:bg-gray-50`}
                          style={{ borderBottom: `1px solid ${BORDER}` }}
                        >
                          <td className="px-2 py-2 text-gray-700">
                            {row.namaKategori || "-"}
                          </td>
                          <td className="px-2 py-2 text-gray-800">
                            {row.namaJenis || "-"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {blokConfirm && selectedBlok && (
        <ConfirmDeleteDialog
          title="Hapus Blok"
          description={`Yakin ingin menghapus blok ${selectedBlok}? Semua lokasi dan daftar jenis di blok ini juga akan terhapus.`}
          loading={blokBusy}
          error={blokError}
          onConfirm={() => void confirmDeleteBlok()}
          onCancel={() => {
            setBlokConfirm(false);
            setBlokError(null);
          }}
        />
      )}

      {lokasiConfirm && selectedLokasi && (
        <ConfirmDeleteDialog
          title="Hapus Lokasi"
          description="Yakin ingin menghapus lokasi ini? Daftar jenis lokasi juga akan terhapus."
          loading={lokasiBusy}
          error={lokasiError}
          onConfirm={() => void confirmDeleteLokasi()}
          onCancel={() => {
            setLokasiConfirm(false);
            setLokasiError(null);
          }}
        />
      )}

      {jenisConfirm && jenisSel && (
        <ConfirmDeleteDialog
          title="Hapus Jenis"
          description="Yakin ingin menghapus jenis ini dari lokasi?"
          loading={jenisBusy}
          error={jenisError}
          onConfirm={() => void confirmRemoveJenis()}
          onCancel={() => {
            setJenisConfirm(false);
            setJenisError(null);
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
  kind: "blok" | "lokasi";
}) {
  const texts: Record<typeof kind, Record<EntryMode, string>> = {
    blok: {
      view: "Klik baris pada tabel untuk memilih blok, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk kode blok baru.",
      create: "Isi Kode Blok (maksimal 3 karakter) dan pilih Warehouse, lalu tekan SIMPAN. Memilih blok baru akan mereset panel lokasi di kanan.",
      edit: "Kode Blok tidak bisa diubah. Ubah Warehouse bila perlu, lalu tekan SIMPAN.",
    },
    lokasi: {
      view: "Klik baris untuk memilih lokasi (daftar jenis di bawah ikut termuat), lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk lokasi baru.",
      create: "Isi Deskripsi dan status Aktif, lalu tekan SIMPAN. ID Lokasi dibuat otomatis per blok.",
      edit: "Ubah Deskripsi atau status Aktif, lalu tekan SIMPAN.",
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
