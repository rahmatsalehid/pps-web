"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteOperatorAction,
  deleteReguAction,
  getMasterDataAction,
  getReguDetailAction,
  saveOperatorAction,
  saveReguAction,
} from "@/app/(app)/master/operator-regu/actions";
import type {
  BagianOption,
  OperatorRow,
  ReguMember,
  ReguRow,
} from "@/services/master-operator-regu-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type OperatorForm = {
  idOperator: number | null;
  nama: string;
  idBagian: string;
  status: string;
};

type ReguForm = {
  idRegu: number | null;
  nama: string;
  idBagian: string;
  members: ReguMember[];
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function emptyOperatorForm(): OperatorForm {
  return { idOperator: null, nama: "", idBagian: "", status: "" };
}

function emptyReguForm(): ReguForm {
  return { idRegu: null, nama: "", idBagian: "", members: [] };
}

export function OperatorReguWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [bagian, setBagian] = useState<BagianOption[]>([]);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [regus, setRegus] = useState<ReguRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [opMode, setOpMode] = useState<EntryMode>("view");
  const [opForm, setOpForm] = useState<OperatorForm>(emptyOperatorForm());
  const [opSelectedId, setOpSelectedId] = useState<number | null>(null);
  const [opSearch, setOpSearch] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [opBusy, setOpBusy] = useState(false);
  const [opConfirm, setOpConfirm] = useState(false);

  const [rgMode, setRgMode] = useState<EntryMode>("view");
  const [rgForm, setRgForm] = useState<ReguForm>(emptyReguForm());
  const [rgSelectedId, setRgSelectedId] = useState<number | null>(null);
  const [rgSearch, setRgSearch] = useState("");
  const [rgError, setRgError] = useState<string | null>(null);
  const [rgBusy, setRgBusy] = useState(false);
  const [rgConfirm, setRgConfirm] = useState(false);
  const [rgPick, setRgPick] = useState("");
  const [rgMemberSel, setRgMemberSel] = useState<number | null>(null);
  const [rgDetailLoading, setRgDetailLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<"operator" | "regu" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getMasterDataAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setBagian(res.bagian);
        setOperators(res.operators);
        setRegus(res.regus);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const opFiltered = useMemo(() => {
    const q = opSearch.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter((op) =>
      [String(op.idOperator), op.namaOperator, op.namaBagianMesin, op.status]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [operators, opSearch]);

  const rgFiltered = useMemo(() => {
    const q = rgSearch.trim().toLowerCase();
    if (!q) return regus;
    return regus.filter((rg) =>
      [String(rg.idRegu), rg.namaRegu, rg.namaBagianMesin]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [regus, rgSearch]);

  const memberOptions = useMemo(() => {
    const idBagian = parseInt(rgForm.idBagian, 10) || 0;
    const chosen = new Set(rgForm.members.map((m) => m.idOperator));
    return operators.filter(
      (op) =>
        op.enable &&
        !chosen.has(op.idOperator) &&
        (idBagian === 0 || op.idBagian === idBagian),
    );
  }, [operators, rgForm.idBagian, rgForm.members]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function selectOperatorRow(row: OperatorRow) {
    if (opMode !== "view") return;
    setNotice(null);
    setOpSelectedId(row.idOperator);
    setOpError(null);
    setOpForm({
      idOperator: row.idOperator,
      nama: row.namaOperator,
      idBagian: row.idBagian ? String(row.idBagian) : "",
      status: row.enable ? "AKTIF" : "TIDAK AKTIF",
    });
  }

  function startOperatorCreate() {
    if (!canCreate) return;
    const nextId =
      operators.reduce((max, op) => Math.max(max, op.idOperator), 0) + 1;
    setNotice(null);
    setOpMode("create");
    setOpSelectedId(null);
    setOpError(null);
    setEditor("operator");
    setOpForm({
      idOperator: nextId,
      nama: "",
      idBagian: "",
      status: "AKTIF",
    });
  }

  async function saveOperator() {
    const nama = opForm.nama.trim();
    if (!nama) {
      setOpError("Nama operator wajib diisi.");
      return;
    }
    const idBagian = parseInt(opForm.idBagian, 10);
    if (!Number.isFinite(idBagian) || idBagian <= 0) {
      setOpError("Pilih bagian operator.");
      return;
    }
    if (!opForm.status) {
      setOpError("Pilih status operator.");
      return;
    }

    setOpBusy(true);
    setOpError(null);
    const res = await saveOperatorAction(
      { namaOperator: nama, idBagian, enable: opForm.status === "AKTIF" },
      opMode === "edit" ? (opForm.idOperator ?? undefined) : undefined,
    );
    setOpBusy(false);
    if (!res.ok) {
      setOpError(res.error);
      return;
    }
    setOpMode("view");
    setOpForm(emptyOperatorForm());
    setOpSelectedId(null);
    setNotice("Data operator berhasil disimpan.");
    setEditor(null);
    reload();
  }

  async function confirmDeleteOperator() {
    if (opForm.idOperator == null) return;
    setOpBusy(true);
    setOpError(null);
    const res = await deleteOperatorAction(opForm.idOperator);
    setOpBusy(false);
    setOpConfirm(false);
    if (!res.ok) {
      setOpError(res.error);
      return;
    }
    setOpMode("view");
    setOpForm(emptyOperatorForm());
    setOpSelectedId(null);
    setNotice("Data operator berhasil dihapus.");
    reload();
  }

  async function selectReguRow(row: ReguRow) {
    if (rgMode !== "view") return;
    setNotice(null);
    setRgSelectedId(row.idRegu);
    setRgError(null);
    setRgMemberSel(null);
    setRgPick("");
    setRgForm({
      idRegu: row.idRegu,
      nama: row.namaRegu,
      idBagian: row.idBagian ? String(row.idBagian) : "",
      members: [],
    });
    setRgDetailLoading(true);
    const res = await getReguDetailAction(row.idRegu);
    setRgDetailLoading(false);
    if (!res.ok) {
      setRgError(res.error);
      return;
    }
    setRgForm((f) =>
      f.idRegu === row.idRegu ? { ...f, members: res.detail.operators } : f,
    );
  }

  function startReguCreate() {
    if (!canCreate) return;
    const nextId = regus.reduce((max, rg) => Math.max(max, rg.idRegu), 0) + 1;
    setNotice(null);
    setRgMode("create");
    setRgSelectedId(null);
    setRgError(null);
    setRgMemberSel(null);
    setRgPick("");
    setEditor("regu");
    setRgForm({ idRegu: nextId, nama: "", idBagian: "", members: [] });
  }

  function changeReguBagian(value: string) {
    setRgForm((f) => ({ ...f, idBagian: value, members: [] }));
    setRgPick("");
    setRgMemberSel(null);
  }

  function addReguMember() {
    const id = parseInt(rgPick, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setRgError("Pilih operator yang ingin dimasukkan ke regu.");
      return;
    }
    if (rgForm.members.some((m) => m.idOperator === id)) {
      setRgError("Operator ini sudah ada di daftar regu.");
      return;
    }
    const found = memberOptions.find((m) => m.idOperator === id);
    if (!found) return;
    setRgError(null);
    setRgForm((f) => ({
      ...f,
      members: [
        ...f.members,
        {
          idOperator: found.idOperator,
          namaOperator: found.namaOperator,
          enable: found.enable,
        },
      ],
    }));
    setRgPick("");
  }

  function removeReguMember() {
    if (rgMemberSel == null) {
      setRgError("Pilih operator yang ingin dikeluarkan dari regu.");
      return;
    }
    setRgError(null);
    setRgForm((f) => ({
      ...f,
      members: f.members.filter((m) => m.idOperator !== rgMemberSel),
    }));
    setRgMemberSel(null);
  }

  async function saveRegu() {
    const nama = rgForm.nama.trim();
    if (!nama) {
      setRgError("Nama regu wajib diisi.");
      return;
    }
    if (nama.length > 15) {
      setRgError("Nama regu maksimal 15 karakter sesuai struktur lama.");
      return;
    }
    const idBagian = parseInt(rgForm.idBagian, 10);
    if (!Number.isFinite(idBagian) || idBagian <= 0) {
      setRgError("Pilih bagian regu.");
      return;
    }
    if (rgForm.members.length === 0) {
      setRgError("Minimal masukkan 1 operator ke dalam regu.");
      return;
    }

    setRgBusy(true);
    setRgError(null);
    const res = await saveReguAction(
      {
        namaRegu: nama,
        idBagian,
        operatorIds: rgForm.members.map((m) => m.idOperator),
      },
      rgMode === "edit" ? (rgForm.idRegu ?? undefined) : undefined,
    );
    setRgBusy(false);
    if (!res.ok) {
      setRgError(res.error);
      return;
    }
    setRgMode("view");
    setRgForm(emptyReguForm());
    setRgSelectedId(null);
    setRgMemberSel(null);
    setRgPick("");
    setNotice("Data regu berhasil disimpan.");
    setEditor(null);
    reload();
  }

  async function confirmDeleteRegu() {
    if (rgForm.idRegu == null) return;
    setRgBusy(true);
    setRgError(null);
    const res = await deleteReguAction(rgForm.idRegu);
    setRgBusy(false);
    setRgConfirm(false);
    if (!res.ok) {
      setRgError(res.error);
      return;
    }
    setRgMode("view");
    setRgForm(emptyReguForm());
    setRgSelectedId(null);
    setRgMemberSel(null);
    setRgPick("");
    setNotice("Data regu berhasil dihapus.");
    reload();
  }

  const opInputActive = opMode !== "view";
  const rgInputActive = rgMode !== "view";
  const activeError =
    editor === "operator"
      ? opError
      : editor === "regu"
        ? rgError
        : opError || rgError;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">
            Master Operator &amp; Regu
          </h1>
          <p className="text-[12px] text-gray-500">
            Data operator per bagian dan susunan anggota tiap regu
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
      <div className="grid gap-3 xl:grid-cols-2">
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">
              Master Operator
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode={opMode} />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${operators.length} Data Operator`}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <input
              type="text"
              value={opSearch}
              onChange={(e) => setOpSearch(e.target.value)}
              disabled={opInputActive}
              placeholder="Cari nama / bagian operator..."
              className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
              style={{ borderColor: BORDER }}
            />
          </div>

          <div className="max-h-[300px] overflow-auto px-3 pt-2">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-2 py-2 font-semibold text-gray-500">ID</th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Nama Operator
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Bagian
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!loading && opFiltered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data operator
                    </td>
                  </tr>
                )}
                {!loading &&
                  opFiltered.map((row) => (
                    <tr
                      key={row.idOperator}
                      onClick={() => selectOperatorRow(row)}
                      onDoubleClick={() => {
                        if (canUpdate) {
                          selectOperatorRow(row);
                          setOpMode("edit");
                          setEditor("operator");
                        }
                      }}
                      className={`cursor-pointer ${
                        opSelectedId === row.idOperator ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.idOperator}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.namaOperator}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.namaBagianMesin || "-"}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            row.enable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
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
            <ModeHint mode={opMode} kind="operator" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah data baru"
                disabled={!canCreate || opBusy}
                onClick={startOperatorCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah data yang sedang dipilih"
                disabled={opSelectedId == null || !canUpdate || opBusy}
                onClick={() => {
                  setOpMode("edit");
                  setEditor("operator");
                }}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus data yang sedang dipilih"
                disabled={opSelectedId == null || !canDelete || opBusy}
                onClick={() => setOpConfirm(true)}
              />
            </div>
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
            <h2 className="text-[14px] font-bold text-gray-800">Master Regu</h2>
            <div className="flex items-center gap-2">
              <ModeChip mode={rgMode} />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${regus.length} Data Regu`}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <input
              type="text"
              value={rgSearch}
              onChange={(e) => setRgSearch(e.target.value)}
              disabled={rgInputActive}
              placeholder="Cari nama regu / bagian..."
              className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:bg-gray-50"
              style={{ borderColor: BORDER }}
            />
          </div>

          <div className="max-h-[220px] overflow-auto px-3 pt-2">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-2 py-2 font-semibold text-gray-500">ID</th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Nama Regu
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Bagian
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Operator
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!loading && rgFiltered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data regu
                    </td>
                  </tr>
                )}
                {!loading &&
                  rgFiltered.map((row) => (
                    <tr
                      key={row.idRegu}
                      onClick={() => void selectReguRow(row)}
                      onDoubleClick={() => {
                        if (canUpdate) {
                          void selectReguRow(row);
                          setRgMode("edit");
                          setEditor("regu");
                        }
                      }}
                      className={`cursor-pointer ${
                        rgSelectedId === row.idRegu ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.idRegu}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.namaRegu}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.namaBagianMesin || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.jumlahOperator}
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
            <ModeHint mode={rgMode} kind="regu" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah data baru"
                disabled={!canCreate || rgBusy}
                onClick={startReguCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah data yang sedang dipilih"
                disabled={rgSelectedId == null || !canUpdate || rgBusy}
                onClick={() => {
                  setRgMode("edit");
                  setEditor("regu");
                }}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus data yang sedang dipilih"
                disabled={rgSelectedId == null || !canDelete || rgBusy}
                onClick={() => setRgConfirm(true)}
              />
            </div>
          </div>
        </section>
      </div>
      )}

      {editor === "operator" && (
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
                {opMode === "create"
                  ? "Tambah Operator"
                  : `Ubah Operator ${opForm.idOperator ?? ""}`}
              </h2>
              <ModeChip mode={opMode} />
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Isi form lalu tekan SIMPAN
            </span>
          </header>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID Operator">
                <input
                  type="text"
                  readOnly
                  value={
                    opForm.idOperator != null ? String(opForm.idOperator) : ""
                  }
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Nama Operator" required>
                <input
                  type="text"
                  value={opForm.nama}
                  onChange={(e) =>
                    setOpForm((f) => ({ ...f, nama: e.target.value }))
                  }
                  maxLength={40}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Bagian" required>
                <select
                  value={opForm.idBagian}
                  onChange={(e) =>
                    setOpForm((f) => ({ ...f, idBagian: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Bagian --</option>
                  {bagian.map((b) => (
                    <option
                      key={b.idBagianMesin}
                      value={String(b.idBagianMesin)}
                    >
                      {b.namaBagianMesin}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status" required>
                <select
                  value={opForm.status}
                  onChange={(e) =>
                    setOpForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                >
                  <option value="">-- Pilih Status --</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="TIDAK AKTIF">TIDAK AKTIF</option>
                </select>
              </Field>
            </div>

            <ModeHint mode={opMode} kind="operator" />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton
                label={
                  opBusy ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "SIMPAN"
                  )
                }
                variant="primary"
                title="Simpan data ke database"
                disabled={
                  opBusy || (opMode === "create" ? !canCreate : !canUpdate)
                }
                onClick={() => void saveOperator()}
              />
              <ActionButton
                label="BATAL"
                title="Batalkan dan kembali ke daftar"
                disabled={opBusy}
                onClick={() => {
                  setOpMode("view");
                  setOpForm(emptyOperatorForm());
                  setOpSelectedId(null);
                  setOpError(null);
                  setNotice(null);
                  setEditor(null);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {editor === "regu" && (
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
                {rgMode === "create"
                  ? "Tambah Regu"
                  : `Ubah Regu ${rgForm.idRegu ?? ""}`}
              </h2>
              <ModeChip mode={rgMode} />
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Isi form lalu tekan SIMPAN
            </span>
          </header>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID Regu">
                <input
                  type="text"
                  readOnly
                  value={rgForm.idRegu != null ? String(rgForm.idRegu) : ""}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Nama Regu (maks. 15)" required>
                <input
                  type="text"
                  value={rgForm.nama}
                  onChange={(e) =>
                    setRgForm((f) => ({ ...f, nama: e.target.value }))
                  }
                  maxLength={15}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Bagian" required>
                  <select
                    value={rgForm.idBagian}
                    onChange={(e) => changeReguBagian(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">-- Pilih Bagian --</option>
                    {bagian.map((b) => (
                      <option
                        key={b.idBagianMesin}
                        value={String(b.idBagianMesin)}
                      >
                        {b.namaBagianMesin}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="mt-2">
              <Field label="Tambah Operator ke Regu">
                <div className="flex gap-2">
                  <select
                    value={rgPick}
                    onChange={(e) => setRgPick(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                    style={{ borderColor: BORDER }}
                  >
                    <option value="">
                      {rgForm.idBagian
                        ? "-- Pilih Operator --"
                        : "-- Pilih Bagian Dulu --"}
                    </option>
                    {memberOptions.map((op) => (
                      <option key={op.idOperator} value={String(op.idOperator)}>
                        {op.namaOperator}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addReguMember}
                    className="rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                    style={{ background: PRIMARY }}
                  >
                    Tambah
                  </button>
                  <button
                    type="button"
                    onClick={removeReguMember}
                    className="rounded-lg border px-3 py-2 text-[12px] font-bold text-gray-600"
                    style={{ borderColor: BORDER }}
                  >
                    Keluarkan
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Pilih bagian dulu — daftar operator mengikuti bagian
                  tersebut. Regu minimal berisi 1 operator.
                </p>
              </Field>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Anggota Regu
              </span>
              <span className="text-[11px] font-semibold text-gray-500">
                {`${rgForm.members.length} operator terpilih`}
              </span>
            </div>

            <div
              className="mt-1 max-h-[150px] overflow-auto rounded-lg border"
              style={{ borderColor: BORDER }}
            >
              <table className="w-full border-collapse text-left text-[12.5px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-2 py-1.5 font-semibold text-gray-500">
                      ID
                    </th>
                    <th className="px-2 py-1.5 font-semibold text-gray-500">
                      Nama Operator
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rgDetailLoading && (
                    <tr>
                      <td colSpan={2} className="px-2 py-4 text-center">
                        <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                      </td>
                    </tr>
                  )}
                  {!rgDetailLoading && rgForm.members.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-2 py-4 text-center text-gray-400"
                      >
                        Belum ada operator dalam regu
                      </td>
                    </tr>
                  )}
                  {!rgDetailLoading &&
                    rgForm.members.map((m) => (
                      <tr
                        key={m.idOperator}
                        onClick={() => setRgMemberSel(m.idOperator)}
                        className={`cursor-pointer ${
                          rgMemberSel === m.idOperator ? "bg-blue-50" : ""
                        } hover:bg-gray-50`}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-1.5 font-semibold text-gray-700">
                          {m.idOperator}
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">
                          {m.namaOperator}
                          {!m.enable && (
                            <span className="ml-1.5 text-[11px] font-bold text-red-600">
                              (TIDAK AKTIF)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <ModeHint mode={rgMode} kind="regu" />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton
                label={
                  rgBusy ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "SIMPAN"
                  )
                }
                variant="primary"
                title="Simpan data ke database"
                disabled={
                  rgBusy || (rgMode === "create" ? !canCreate : !canUpdate)
                }
                onClick={() => void saveRegu()}
              />
              <ActionButton
                label="BATAL"
                title="Batalkan dan kembali ke daftar"
                disabled={rgBusy}
                onClick={() => {
                  setRgMode("view");
                  setRgForm(emptyReguForm());
                  setRgSelectedId(null);
                  setRgMemberSel(null);
                  setRgPick("");
                  setRgError(null);
                  setNotice(null);
                  setEditor(null);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {opConfirm && opForm.idOperator != null && (
        <ConfirmDeleteDialog
          title="Konfirmasi Hapus Operator"
          description={`Yakin ingin menghapus operator ${opForm.nama || "terpilih"} (ID ${opForm.idOperator})? Operator yang sudah masuk ke regu tidak dapat dihapus.`}
          loading={opBusy}
          error={opError}
          onConfirm={() => void confirmDeleteOperator()}
          onCancel={() => {
            setOpConfirm(false);
            setOpError(null);
          }}
        />
      )}

      {rgConfirm && rgForm.idRegu != null && (
        <ConfirmDeleteDialog
          title="Konfirmasi Hapus Regu"
          description={`Yakin ingin menghapus regu ${rgForm.nama} beserta daftar operatornya?`}
          loading={rgBusy}
          error={rgError}
          onConfirm={() => void confirmDeleteRegu()}
          onCancel={() => {
            setRgConfirm(false);
            setRgError(null);
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
  kind: "operator" | "regu";
}) {
  const texts: Record<typeof kind, Record<EntryMode, string>> = {
    operator: {
      view: "Klik salah satu baris pada daftar untuk memilih data, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk menambah data baru.",
      create: "Isi Nama Operator, pilih Bagian dan Status, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar.",
      edit: "Ubah kolom yang diinginkan, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
    },
    regu: {
      view: "Klik baris pada daftar untuk memilih regu, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk menambah regu baru.",
      create: "Isi Nama Regu dan Bagian, tambahkan minimal 1 operator, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar.",
      edit: "Ubah kolom yang diinginkan, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
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
