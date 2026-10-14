"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteUserAction,
  getEmployeesAction,
  getGroupsOfUserAction,
  getUserGroupsAction,
  getUserListAction,
  saveUserAction,
} from "@/app/(app)/user/actions";
import type {
  EmployeeRow,
  UserGroup,
  UserRow,
} from "@/services/mst-user-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type UserForm = {
  idUsername: number | null;
  fName: string;
  lName: string;
  username: string;
  password: string;
  employeeId: string;
  companyId: string;
  nik: string;
  idUGroups: string[];
  resetPassword: boolean;
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const DEFAULT_PASSWORD = "Utama1234";
const EMPLOYEE_SOURCES = [
  { value: "as_gsu", label: "AS_GSU (PT. GSU)" },
  { value: "as_ru", label: "AS_RU (PT. RU)" },
  { value: "as_uc_2017", label: "AS_UC_2017 (PT. UC)" },
];

function emptyUserForm(): UserForm {
  return {
    idUsername: null,
    fName: "",
    lName: "",
    username: "",
    password: "",
    employeeId: "",
    companyId: "",
    nik: "",
    idUGroups: [],
    resetPassword: false,
  };
}

export function UserWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<EntryMode>("view");
  const [editor, setEditor] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUserForm());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDb, setPickerDb] = useState("as_gsu");
  const [pickerRows, setPickerRows] = useState<EmployeeRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [listRes, groupRes] = await Promise.all([
        getUserListAction(),
        getUserGroupsAction(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (groupRes.ok) {
        setGroups(groupRes.rows);
      } else {
        setLoadError(groupRes.error);
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
        String(row.idUsername),
        row.username,
        row.fName,
        row.lName,
        row.nik,
        String(row.employeeId),
        row.groupName,
        row.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.idUsername === selectedId) ?? null,
    [rows, selectedId],
  );

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function selectRow(row: UserRow) {
    if (editor) return;
    setNotice(null);
    setError(null);
    setSelectedId(row.idUsername);
  }

  function resetEditor() {
    setMode("view");
    setEditor(false);
    setForm(emptyUserForm());
    setSelectedId(null);
    setError(null);
    setShowPassword(false);
  }

  function startCreate() {
    if (!canCreate) return;
    setNotice(null);
    setMode("create");
    setSelectedId(null);
    setForm(emptyUserForm());
    setError(null);
    setShowPassword(false);
    setEditor(true);
  }

  async function openEdit(idUsername: number) {
    if (!canUpdate) return;
    const row = rows.find((r) => r.idUsername === idUsername);
    if (!row) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await getGroupsOfUserAction(idUsername);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm({
      idUsername: row.idUsername,
      fName: row.fName,
      lName: row.lName,
      username: row.username,
      password: "",
      employeeId: String(row.employeeId),
      companyId: row.companyId,
      nik: row.nik,
      idUGroups: res.rows.map((g) => String(g.idUGroup)),
      resetPassword: false,
    });
    setSelectedId(row.idUsername);
    setMode("edit");
    setEditor(true);
  }

  async function loadPicker(db: string, q: string) {
    setPickerLoading(true);
    setPickerError(null);
    const res = await getEmployeesAction(db, q);
    setPickerLoading(false);
    if (res.ok) {
      setPickerRows(res.rows);
    } else {
      setPickerRows([]);
      setPickerError(res.error);
    }
  }

  function openPicker() {
    setPickerOpen(true);
    setPickerDb("as_gsu");
    setPickerRows([]);
    void loadPicker("as_gsu", "");
  }

  function pickEmployee(row: EmployeeRow) {
    setForm((f) => ({
      ...f,
      employeeId: String(row.employeeId),
      companyId: row.companyId,
      nik: row.employeeCode,
    }));
    setPickerOpen(false);
    setError(null);
  }

  function changeUsername(value: string) {
    setForm((f) => ({
      ...f,
      username: value,
      password:
        mode === "create" && value.trim() ? DEFAULT_PASSWORD : f.password,
    }));
  }

  function validate(): string | null {
    if (!form.fName.trim()) return "Silahkan isi Nama Depan.";
    if (mode === "create") {
      if (!form.username.trim()) return "Silahkan isi Username.";
      if (!form.password.trim()) return "Silahkan isi Password.";
      if (!form.companyId.trim())
        return "Silahkan gunakan tombol Cari Karyawan untuk memilih Employee ID dan database perusahaan.";
      if (!form.nik.trim())
        return "NIK / Employee Code belum terbaca. Silahkan pilih ulang karyawan dari tombol Cari.";
    }
    const empId = parseInt(form.employeeId, 10);
    if (!empId || empId <= 0) return "Employee ID harus berupa angka.";
    if (mode === "edit" || mode === "create") {
      if (!form.idUGroups.length)
        return "Pilih minimal 1 Group Permission untuk user ini.";
    }
    return null;
  }

  async function save() {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    const employeeId = parseInt(form.employeeId, 10);
    const idUGroup = form.idUGroups
      .map((v) => parseInt(v, 10))
      .filter((v) => v > 0);

    setBusy(true);
    setError(null);
    const res =
      mode === "edit" && form.idUsername != null
        ? await saveUserAction({
            idUsername: form.idUsername,
            fName: form.fName.trim(),
            lName: form.lName.trim(),
            employeeId,
            resetPassword: form.resetPassword,
            idUGroup,
          })
        : await saveUserAction({
            fName: form.fName.trim(),
            lName: form.lName.trim(),
            username: form.username.trim(),
            password: form.password,
            employeeId,
            companyId: form.companyId.trim(),
            nik: form.nik.trim(),
            idUGroup,
          });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice(
      mode === "edit"
        ? "Data user berhasil diubah."
        : "User baru berhasil disimpan.",
    );
    reload();
  }

  async function confirmDelete() {
    const idUsername = form.idUsername ?? selectedId;
    if (idUsername == null) return;
    setBusy(true);
    setError(null);
    const res = await deleteUserAction(idUsername);
    setBusy(false);
    setConfirm(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice("Data user berhasil dihapus.");
    reload();
  }

  const activeError = error;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">User</h1>
          <p className="text-[12px] text-gray-500">
            Data user aplikasi, karyawan terkait, dan group permission-nya
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
              Daftar User
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode="view" />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${rows.length} Data User`}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / username / NIK / group..."
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
                    Nama Depan
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Nama Belakang
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Username
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Employee ID
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    NIK
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Group
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-2 py-6 text-center">
                      <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data user
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((row) => (
                    <tr
                      key={row.idUsername}
                      onClick={() => selectRow(row)}
                      onDoubleClick={() => void openEdit(row.idUsername)}
                      className={`cursor-pointer ${
                        selectedId === row.idUsername ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.idUsername}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.fName || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.lName || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.username || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.employeeId || "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.nik || "-"}
                      </td>
                      <td className="px-2 py-2">
                        {row.groupName ? (
                          <span className="flex flex-wrap gap-1">
                            {row.groupName.split(",").map((g, i) => (
                              <span
                                key={`${row.idUsername}-g-${i}`}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700"
                              >
                                {g.trim()}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            row.status === "ONLINE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.status || "-"}
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
            <ModeHint mode="view" />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah user baru"
                disabled={!canCreate || busy}
                onClick={startCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah user yang sedang dipilih"
                disabled={selectedId == null || !canUpdate || busy}
                onClick={() => {
                  if (selectedId != null) void openEdit(selectedId);
                }}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus user yang sedang dipilih"
                disabled={selectedId == null || !canDelete || busy}
                onClick={() => {
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
                  ? "Tambah User"
                  : `Ubah User ${form.username}`}
              </h2>
              <ModeChip mode={mode} />
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Isi form lalu tekan SIMPAN
            </span>
          </header>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID User">
                <input
                  type="text"
                  readOnly
                  value={form.idUsername != null ? String(form.idUsername) : ""}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Nama Depan" required>
                <input
                  type="text"
                  value={form.fName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fName: e.target.value }))
                  }
                  maxLength={25}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Nama Belakang">
                <input
                  type="text"
                  value={form.lName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lName: e.target.value }))
                  }
                  maxLength={25}
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Username" required>
                <input
                  type="text"
                  value={form.username}
                  readOnly={mode === "edit"}
                  onChange={(e) => changeUsername(e.target.value)}
                  maxLength={25}
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-800 outline-none focus:ring-2 disabled:bg-gray-50 read-only:bg-gray-50"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Employee ID" required>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, employeeId: e.target.value }))
                    }
                    placeholder="Pilih dari Cari Karyawan"
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                    style={{ borderColor: BORDER }}
                  />
                  <button
                    type="button"
                    onClick={openPicker}
                    title="Cari karyawan dari database perusahaan"
                    className="whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-bold text-white"
                    style={{ background: PRIMARY }}
                  >
                    Cari
                  </button>
                </div>
              </Field>
              <Field label="Company ID">
                <input
                  type="text"
                  readOnly
                  value={form.companyId}
                  placeholder="Hasil pilihan karyawan"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="NIK / Employee Code">
                <input
                  type="text"
                  readOnly
                  value={form.nik}
                  placeholder="Hasil pilihan karyawan"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              {mode === "create" && (
                <div className="col-span-2">
                  <Field label="Password" required>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                        style={{ borderColor: BORDER }}
                      />
                      <button
                        type="button"
                        title={
                          showPassword ? "Sembunyikan password" : "Tampilkan password"
                        }
                        onClick={() => setShowPassword((v) => !v)}
                        className="rounded-lg border bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                        style={{ borderColor: BORDER }}
                      >
                        {showPassword ? "Sembunyi" : "Tampil"}
                      </button>
                    </div>
                  </Field>
                </div>
              )}
              {mode === "edit" && (
                <div className="col-span-2 flex items-center gap-2 rounded-lg border px-3 py-2.5"
                  style={{ borderColor: BORDER }}
                >
                  <input
                    id="reset-pass"
                    type="checkbox"
                    checked={form.resetPassword}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        resetPassword: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#1E6FD9]"
                  />
                  <label
                    htmlFor="reset-pass"
                    className="text-[13px] text-gray-700"
                  >
                    Reset password ke default{" "}
                    <span className="font-semibold">{DEFAULT_PASSWORD}</span>
                  </label>
                </div>
              )}
              <div className="col-span-2">
                <Field label="Group Permission" required>
                  <div
                    className="max-h-40 overflow-y-auto rounded-lg border bg-white px-2 py-1.5"
                    style={{ borderColor: BORDER }}
                  >
                    {groups.length === 0 ? (
                      <p className="py-1 text-[12px] text-gray-400">
                        Memuat group…
                      </p>
                    ) : (
                      groups.map((g) => {
                        const checked = form.idUGroups.includes(
                          String(g.idUGroup),
                        );
                        return (
                          <label
                            key={g.idUGroup}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-blue-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  idUGroups: checked
                                    ? f.idUGroups.filter(
                                        (v) => v !== String(g.idUGroup),
                                      )
                                    : [...f.idUGroups, String(g.idUGroup)],
                                }))
                              }
                              className="h-3.5 w-3.5 accent-[#1E6FD9]"
                            />
                            <span className="text-[12px] text-gray-700">
                              {g.uGroupName}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </Field>
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
          title="Konfirmasi Hapus User"
          description={`Yakin ingin menghapus user ${
            selectedRow
              ? `${selectedRow.username} (ID ${selectedRow.idUsername})`
              : `ID ${selectedId}`
          } beserta data group member-nya?`}
          loading={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setConfirm(false);
            setError(null);
          }}
        />
      )}

      {pickerOpen && (
        <EmployeePickerDialog
          db={pickerDb}
          rows={pickerRows}
          loading={pickerLoading}
          error={pickerError}
          onDbChange={(db) => {
            setPickerDb(db);
            void loadPicker(db, "");
          }}
          onSearch={(q) => {
            void loadPicker(pickerDb, q);
          }}
          onPick={pickEmployee}
          onClose={() => setPickerOpen(false)}
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
    view: "Klik salah satu baris pada daftar untuk memilih user, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk menambah user baru.",
    create: "Isi nama, username, password, lalu tekan Cari untuk memilih karyawan (Employee ID, NIK, Company ID). Pilih 1 group permission, lalu tekan SIMPAN.",
    edit: "Ubah data yang diinginkan, centang reset password bila perlu, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
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

function EmployeePickerDialog({
  db,
  rows,
  loading,
  error,
  onDbChange,
  onSearch,
  onPick,
  onClose,
}: {
  db: string;
  rows: EmployeeRow[];
  loading: boolean;
  error: string | null;
  onDbChange: (db: string) => void;
  onSearch: (q: string) => void;
  onPick: (row: EmployeeRow) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-[#1E6FD9] px-[18px] py-3">
          <p className="flex-1 text-[16px] font-bold tracking-wide text-white">
            Cari Karyawan
          </p>
          <button
            type="button"
            onClick={onClose}
            title="Tutup"
            className="rounded-lg px-2.5 py-1 text-[13px] font-bold text-white hover:bg-white/20"
          >
            ✖
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b bg-blue-50 px-4 py-2.5"
          style={{ borderColor: BORDER }}
        >
          <span className="text-[12px] font-semibold text-gray-600">
            Sumber database:
          </span>
          <select
            value={db}
            onChange={(e) => {
              setText("");
              onDbChange(e.target.value);
            }}
            className="rounded-lg border bg-white px-3 py-1.5 text-[13px] outline-none focus:ring-2"
            style={{ borderColor: BORDER }}
          >
            {EMPLOYEE_SOURCES.map((src) => (
              <option key={src.value} value={src.value}>
                {src.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch(text.trim());
            }}
            placeholder="Cari nama / Employee ID / NIK..."
            className="min-w-[180px] flex-1 rounded-lg border bg-white px-3 py-1.5 text-[13px] outline-none focus:ring-2"
            style={{ borderColor: BORDER }}
          />
          <button
            type="button"
            onClick={() => onSearch(text.trim())}
            className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-white"
            style={{ background: PRIMARY }}
          >
            Cari
          </button>
        </div>

        <div className="max-h-[320px] overflow-auto px-4 py-2">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-2 py-2 font-semibold text-gray-500">
                  Employee ID
                </th>
                <th className="px-2 py-2 font-semibold text-gray-500">NIK</th>
                <th className="px-2 py-2 font-semibold text-gray-500">
                  Nama Karyawan
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center">
                    <Loader2Icon className="mx-auto h-4 w-4 animate-spin text-gray-400" />
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-2 py-4 text-center text-[12px] text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-2 py-6 text-center text-gray-400"
                  >
                    Tidak ada data karyawan
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((row) => (
                  <tr
                    key={`${row.employeeId}-${row.employeeCode}`}
                    onClick={() => onPick(row)}
                    className="cursor-pointer hover:bg-blue-50"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <td className="px-2 py-2 font-semibold text-gray-700">
                      {row.employeeId}
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {row.employeeCode}
                    </td>
                    <td className="px-2 py-2 text-gray-800">{row.fullName}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-center justify-between gap-2 border-t px-4 py-3"
          style={{ borderColor: BORDER }}
        >
          <span className="text-[12px] font-semibold text-gray-500">
            Klik baris untuk memilih karyawan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
            style={{ borderColor: "#CAC4D0" }}
          >
            BATAL
          </button>
        </div>
      </div>
    </div>
  );
}
