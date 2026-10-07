"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deletePermGroupAction,
  deletePermItemAction,
  getPermGroupDetailAction,
  getPermGroupListAction,
  getPermListAction,
  savePermGroupAction,
  savePermItemAction,
} from "@/app/(app)/master/permission-group/actions";
import type {
  PermGroupRow,
  PermListItem,
} from "@/services/master-permission-group-service";
import { Loader2Icon } from "@/components/dashboard/icons";

type EntryMode = "view" | "create" | "edit";

type GroupForm = {
  idUGroup: number | null;
  uGroupName: string;
  allowed: Record<string, boolean>;
};

type PermForm = {
  noPermission: string;
  permission: string;
};

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";

function emptyGroupForm(): GroupForm {
  return { idUGroup: null, uGroupName: "", allowed: {} };
}

export function PermissionGroupWorkspace({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [rows, setRows] = useState<PermGroupRow[]>([]);
  const [permItems, setPermItems] = useState<PermListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<EntryMode>("view");
  const [editor, setEditor] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyGroupForm());
  const [search, setSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const [managerOpen, setManagerOpen] = useState(false);
  const [mgrSearch, setMgrSearch] = useState("");
  const [mgrSelected, setMgrSelected] = useState<string | null>(null);
  const [mgrForm, setMgrForm] = useState<PermForm>({ noPermission: "", permission: "" });
  const [mgrEditNo, setMgrEditNo] = useState<string | null>(null);
  const [mgrFormOpen, setMgrFormOpen] = useState(false);
  const [mgrError, setMgrError] = useState<string | null>(null);
  const [mgrNotice, setMgrNotice] = useState<string | null>(null);
  const [mgrBusy, setMgrBusy] = useState(false);
  const [mgrConfirm, setMgrConfirm] = useState<PermListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [listRes, permRes] = await Promise.all([
        getPermGroupListAction(),
        getPermListAction(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (permRes.ok) {
        setPermItems(permRes.rows);
      } else {
        setLoadError(permRes.error);
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
      [String(row.idUGroup), row.uGroupName].join(" ").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const editorPerms = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return permItems;
    return permItems.filter((p) =>
      `${p.noPermission} ${p.permission}`.toLowerCase().includes(q),
    );
  }, [permItems, permSearch]);

  const managerPerms = useMemo(() => {
    const q = mgrSearch.trim().toLowerCase();
    if (!q) return permItems;
    return permItems.filter((p) =>
      `${p.noPermission} ${p.permission}`.toLowerCase().includes(q),
    );
  }, [permItems, mgrSearch]);

  const allowCount = useMemo(
    () => Object.values(form.allowed).filter(Boolean).length,
    [form.allowed],
  );

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function selectRow(row: PermGroupRow) {
    if (editor) return;
    setNotice(null);
    setError(null);
    setSelectedId(row.idUGroup);
  }

  function resetEditor() {
    setMode("view");
    setEditor(false);
    setForm(emptyGroupForm());
    setSelectedId(null);
    setError(null);
    setPermSearch("");
  }

  function startCreate() {
    if (!canCreate) return;
    setNotice(null);
    setMode("create");
    setSelectedId(null);
    setForm(emptyGroupForm());
    setError(null);
    setPermSearch("");
    setEditor(true);
  }

  async function openEdit(idUGroup: number) {
    if (!canUpdate) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await getPermGroupDetailAction(idUGroup);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const allowed: Record<string, boolean> = {};
    for (const p of res.detail.permissions) {
      if (p.allow) allowed[p.noPermission] = true;
    }
    setForm({
      idUGroup: res.detail.idUGroup,
      uGroupName: res.detail.uGroupName,
      allowed,
    });
    setSelectedId(res.detail.idUGroup);
    setPermSearch("");
    setMode("edit");
    setEditor(true);
  }

  function toggleAllowed(noPermission: string, value: boolean) {
    setForm((f) => ({ ...f, allowed: { ...f.allowed, [noPermission]: value } }));
  }

  async function save() {
    if (!form.uGroupName.trim()) {
      setError("Nama Group harus diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await savePermGroupAction(
      mode === "edit" ? form.idUGroup : null,
      {
        uGroupName: form.uGroupName.trim(),
        permissions: permItems.map((p) => ({
          noPermission: p.noPermission,
          allow: form.allowed[p.noPermission] === true,
        })),
      },
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice(
      mode === "edit"
        ? "Group berhasil diubah."
        : "Group baru berhasil disimpan.",
    );
    reload();
  }

  async function confirmDelete() {
    const idUGroup = form.idUGroup ?? selectedId;
    if (idUGroup == null) return;
    setBusy(true);
    setError(null);
    const res = await deletePermGroupAction(idUGroup);
    setBusy(false);
    setConfirm(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    resetEditor();
    setNotice("Data berhasil dihapus.");
    reload();
  }

  function openManager() {
    setManagerOpen(true);
    setMgrSearch("");
    setMgrSelected(null);
    setMgrNotice(null);
    setMgrError(null);
    setMgrFormOpen(false);
    setMgrEditNo(null);
    setMgrForm({ noPermission: "", permission: "" });
  }

  function startMgrCreate() {
    if (!canCreate) return;
    setMgrError(null);
    setMgrEditNo(null);
    setMgrForm({ noPermission: "", permission: "" });
    setMgrFormOpen(true);
  }

  function startMgrEdit(item: PermListItem) {
    if (!canUpdate) return;
    setMgrError(null);
    setMgrSelected(item.noPermission);
    setMgrEditNo(item.noPermission);
    setMgrForm({ noPermission: item.noPermission, permission: item.permission });
    setMgrFormOpen(true);
  }

  async function saveMgrForm() {
    const no = mgrForm.noPermission.trim();
    const desc = mgrForm.permission.trim();
    if (!no) {
      setMgrError("No Permission harus diisi.");
      return;
    }
    if (!desc) {
      setMgrError("Permission harus diisi.");
      return;
    }
    setMgrBusy(true);
    setMgrError(null);
    const res = await savePermItemAction(no, desc, mgrEditNo !== null);
    setMgrBusy(false);
    if (!res.ok) {
      setMgrError(res.error);
      return;
    }
    setMgrFormOpen(false);
    setMgrEditNo(null);
    setMgrForm({ noPermission: "", permission: "" });
    setMgrNotice(`Permission ${no} berhasil disimpan.`);
    reload();
  }

  async function confirmMgrDelete() {
    if (!mgrConfirm) return;
    setMgrBusy(true);
    setMgrError(null);
    const res = await deletePermItemAction(mgrConfirm.noPermission);
    setMgrBusy(false);
    setMgrConfirm(null);
    if (!res.ok) {
      setMgrError(res.error);
      return;
    }
    if (mgrSelected === mgrConfirm.noPermission) setMgrSelected(null);
    if (mgrEditNo === mgrConfirm.noPermission) {
      setMgrEditNo(null);
      setMgrFormOpen(false);
    }
    setMgrNotice(`Permission ${mgrConfirm.noPermission} berhasil dihapus.`);
    reload();
  }

  const activeError = error;
  const selectedRow = rows.find((row) => row.idUGroup === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[16px] font-bold text-gray-800">
            Master Permission Group
          </h1>
          <p className="text-[12px] text-gray-500">
            Kelola group role beserta daftar permission yang diizinkan
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
              Daftar Group Permission
            </h2>
            <div className="flex items-center gap-2">
              <ModeChip mode="view" />
              <span className="text-[12px] font-semibold text-gray-500">
                {`${rows.length} Data Group`}
              </span>
            </div>
          </header>

          <div className="px-3 pt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama group..."
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
                    Nama Group
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Total Allow
                  </th>
                  <th className="px-2 py-2 font-semibold text-gray-500">
                    Total Permission
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
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-gray-400"
                    >
                      Tidak ada data group
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((row) => (
                    <tr
                      key={row.idUGroup}
                      onClick={() => selectRow(row)}
                      onDoubleClick={() => void openEdit(row.idUGroup)}
                      className={`cursor-pointer ${
                        selectedId === row.idUGroup ? "bg-blue-50" : ""
                      } hover:bg-gray-50`}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td className="px-2 py-2 font-semibold text-gray-700">
                        {row.idUGroup}
                      </td>
                      <td className="px-2 py-2 text-gray-800">
                        {row.uGroupName || "-"}
                      </td>
                      <td className="px-2 py-2 text-emerald-700">
                        {row.totalAllow}
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {row.totalPermission}
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

            <div className="mt-3 grid grid-cols-4 gap-2">
              <ActionButton
                label="TAMBAH"
                title="Tambah group baru"
                disabled={!canCreate || busy}
                onClick={startCreate}
              />
              <ActionButton
                label="UBAH"
                title="Ubah group yang sedang dipilih"
                disabled={selectedId == null || !canUpdate || busy}
                onClick={() => {
                  if (selectedId != null) void openEdit(selectedId);
                }}
              />
              <ActionButton
                label="HAPUS"
                variant="danger"
                title="Hapus group yang sedang dipilih"
                disabled={selectedId == null || !canDelete || busy}
                onClick={() => {
                  setError(null);
                  setConfirm(true);
                }}
              />
              <ActionButton
                label="KELOLA PERMISSION"
                title="Kelola daftar master permission"
                disabled={busy}
                onClick={openManager}
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
                  ? "Tambah User Group"
                  : `Ubah User Group ${form.idUGroup ?? ""}`}
              </h2>
              <ModeChip mode={mode} />
            </div>
            <span className="text-[12px] font-semibold text-gray-500">
              Isi form lalu tekan SIMPAN
            </span>
          </header>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID Group">
                <input
                  type="text"
                  readOnly
                  value={form.idUGroup != null ? String(form.idUGroup) : ""}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </Field>
              <Field label="Nama Group" required>
                <input
                  type="text"
                  value={form.uGroupName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, uGroupName: e.target.value }))
                  }
                  maxLength={25}
                  placeholder="Maksimal 25 karakter"
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
            </div>

            <div
              className="mt-3 rounded-lg border"
              style={{ borderColor: BORDER }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2"
                style={{ borderColor: BORDER }}
              >
                <span className="text-[12px] font-bold text-gray-700">
                  Daftar Permission
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-500">
                    {`${allowCount} dari ${permItems.length} diizinkan`}
                  </span>
                  <input
                    type="text"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    placeholder="Filter permission..."
                    className="w-[190px] rounded-lg border px-2.5 py-1.5 text-[12px] outline-none focus:ring-2"
                    style={{ borderColor: BORDER }}
                  />
                </div>
              </div>
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="w-[70px] px-2 py-2 font-semibold text-gray-500">
                        Allow
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-500">
                        Permission
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-500">
                        No Permission
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorPerms.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-2 py-4 text-center text-gray-400"
                        >
                          Tidak ada data permission
                        </td>
                      </tr>
                    )}
                    {editorPerms.map((p) => (
                      <tr
                        key={p.noPermission}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={form.allowed[p.noPermission] === true}
                            onChange={(e) =>
                              toggleAllowed(p.noPermission, e.target.checked)
                            }
                            className="h-4 w-4 accent-[#1E6FD9]"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-gray-800">
                          {p.permission || "-"}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[12px] text-gray-600">
                          {p.noPermission}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          title="Konfirmasi Hapus Group"
          description={`Yakin hapus group ${
            selectedRow ? `${selectedRow.uGroupName}` : `ID ${selectedId}`
          }? Semua permission di dalam group ini juga akan terhapus.`}
          loading={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setConfirm(false);
            setError(null);
          }}
        />
      )}

      {managerOpen && (
        <PermissionManagerDialog
          rows={managerPerms}
          total={permItems.length}
          search={mgrSearch}
          selected={mgrSelected}
          onSelect={setMgrSelected}
          onSearch={setMgrSearch}
          formOpen={mgrFormOpen}
          form={mgrForm}
          editNo={mgrEditNo}
          busy={mgrBusy}
          error={mgrError}
          notice={mgrNotice}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onFormChange={setMgrForm}
          onStartCreate={startMgrCreate}
          onStartEdit={startMgrEdit}
          onSaveForm={() => void saveMgrForm()}
          onCloseForm={() => {
            setMgrFormOpen(false);
            setMgrEditNo(null);
            setMgrError(null);
          }}
          onAskDelete={setMgrConfirm}
          onClose={() => setManagerOpen(false)}
        />
      )}

      {mgrConfirm && (
        <ConfirmDeleteDialog
          title="Konfirmasi Hapus Permission"
          description={`Yakin hapus permission ${mgrConfirm.noPermission}?`}
          loading={mgrBusy}
          error={mgrError}
          onConfirm={() => void confirmMgrDelete()}
          onCancel={() => {
            setMgrConfirm(null);
            setMgrError(null);
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
    view: "Klik salah satu baris untuk memilih group, lalu tekan UBAH atau HAPUS. Tekan TAMBAH untuk group baru, atau KELOLA PERMISSION untuk mengelola daftar master permission.",
    create: "Isi nama group (maksimal 25 karakter), centang permission yang diizinkan, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar.",
    edit: "Ubah nama group atau centang/hapus centang permission, lalu tekan SIMPAN. Tekan BATAL untuk kembali ke daftar tanpa menyimpan.",
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

function PermissionManagerDialog({
  rows,
  total,
  search,
  selected,
  onSelect,
  onSearch,
  formOpen,
  form,
  editNo,
  busy,
  error,
  notice,
  canCreate,
  canUpdate,
  canDelete,
  onFormChange,
  onStartCreate,
  onStartEdit,
  onSaveForm,
  onCloseForm,
  onAskDelete,
  onClose,
}: {
  rows: PermListItem[];
  total: number;
  search: string;
  selected: string | null;
  onSelect: (no: string | null) => void;
  onSearch: (v: string) => void;
  formOpen: boolean;
  form: PermForm;
  editNo: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onFormChange: (f: PermForm) => void;
  onStartCreate: () => void;
  onStartEdit: (item: PermListItem) => void;
  onSaveForm: () => void;
  onCloseForm: () => void;
  onAskDelete: (item: PermListItem) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex w-full max-w-[720px] flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-[#1E6FD9] px-[18px] py-3">
          <p className="flex-1 text-[16px] font-bold tracking-wide text-white">
            Kelola Permission
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

        {notice && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700">
            {notice}
          </div>
        )}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div
          className="flex flex-wrap items-center gap-2 border-b bg-blue-50 px-4 py-2.5"
          style={{ borderColor: BORDER }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari No Permission / Permission..."
            className="min-w-[200px] flex-1 rounded-lg border bg-white px-3 py-1.5 text-[13px] outline-none focus:ring-2"
            style={{ borderColor: BORDER }}
          />
          <span className="text-[12px] font-semibold text-gray-500">
            {`${rows.length}/${total} data`}
          </span>
          <ActionButton
            label="TAMBAH"
            title="Tambah permission baru"
            disabled={!canCreate || busy}
            onClick={onStartCreate}
          />
          <ActionButton
            label="UBAH"
            title="Ubah permission yang sedang dipilih"
            disabled={selected == null || !canUpdate || busy}
            onClick={() => {
              const item = rows.find((r) => r.noPermission === selected);
              if (item) onStartEdit(item);
            }}
          />
          <ActionButton
            label="HAPUS"
            variant="danger"
            title="Hapus permission yang sedang dipilih"
            disabled={selected == null || !canDelete || busy}
            onClick={() => {
              const item = rows.find((r) => r.noPermission === selected);
              if (item) onAskDelete(item);
            }}
          />
        </div>

        {formOpen && (
          <div
            className="flex flex-wrap items-end gap-2 border-b px-4 py-3"
            style={{ borderColor: BORDER }}
          >
            <div className="min-w-[220px] flex-1">
              <Field label="No Permission" required>
                <input
                  type="text"
                  value={form.noPermission}
                  readOnly={editNo !== null}
                  onChange={(e) =>
                    onFormChange({ ...form, noPermission: e.target.value })
                  }
                  maxLength={50}
                  placeholder="contoh: modul:read"
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-[13px] outline-none focus:ring-2 read-only:bg-gray-50"
                  style={{ borderColor: BORDER }}
                />
              </Field>
            </div>
            <div className="min-w-[220px] flex-1">
              <Field label="Permission" required>
                <input
                  type="text"
                  value={form.permission}
                  onChange={(e) =>
                    onFormChange({ ...form, permission: e.target.value })
                  }
                  maxLength={50}
                  placeholder="Keterangan permission"
                  className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  style={{ borderColor: BORDER }}
                />
              </Field>
            </div>
            <ActionButton
              label={
                busy ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  "SIMPAN"
                )
              }
              variant="primary"
              title="Simpan permission"
              disabled={busy}
              onClick={onSaveForm}
            />
            <ActionButton
              label="BATAL"
              title="Batal mengubah"
              disabled={busy}
              onClick={onCloseForm}
            />
          </div>
        )}

        <div className="max-h-[340px] overflow-auto px-4 py-2">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-2 py-2 font-semibold text-gray-500">
                  No Permission
                </th>
                <th className="px-2 py-2 font-semibold text-gray-500">
                  Permission
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-2 py-6 text-center text-gray-400">
                    Tidak ada data permission
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.noPermission}
                  onClick={() => onSelect(row.noPermission)}
                  onDoubleClick={() => onStartEdit(row)}
                  className={`cursor-pointer hover:bg-blue-50 ${
                    selected === row.noPermission ? "bg-blue-50" : ""
                  }`}
                  style={{ borderBottom: `1px solid ${BORDER}` }}
                >
                  <td className="px-2 py-2 font-mono text-[12px] text-gray-700">
                    {row.noPermission}
                  </td>
                  <td className="px-2 py-2 text-gray-800">{row.permission}</td>
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
            Klik baris lalu UBAH/HAPUS, atau klik dua kali untuk ubah
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
            style={{ borderColor: "#CAC4D0" }}
          >
            TUTUP
          </button>
        </div>
      </div>
    </div>
  );
}
