"use client";

import { useEffect, useState, useActionState, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import type {
  PasangKunciMesinInfo,
  PasangKunciProduction,
  PasangKunciActiveShift,
  PasangKunciType,
} from "@/services/pasang-kunci-service";
import type { MstRegu, MstOperator } from "@/services/production-form-service";
import {
  createPasangKunciAction,
  updatePasangKunciAction,
  getPasangKunciTypesAction,
  getReguListAction,
  getOperatorsByReguAction,
  getShiftHourAction,
  type PasangKunciFormState,
} from "@/app/(app)/production/pasang-kunci/actions";
import {
  Loader2Icon,
  PlusIcon,
  UsersIcon,
  ClipboardIcon,
  X,
} from "@/components/dashboard/icons";

const initialState: PasangKunciFormState = { status: "idle" };

const inputCls =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#0277BD] focus:ring-2 focus:ring-[#0277BD]/20 readOnly:bg-gray-50 readOnly:text-gray-600";

const labelCls =
  "mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400";

function SubmitButton({
  children,
  editMode,
  saving,
  disabled,
}: {
  children: React.ReactNode;
  editMode?: boolean;
  saving?: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const busy = editMode ? Boolean(saving) : pending;
  const off = busy || disabled;
  return (
    <button
      type="submit"
      disabled={off}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition disabled:opacity-60"
      style={{ backgroundColor: editMode ? "#F57C00" : "#0277BD" }}
    >
      {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function defaultDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDisplayDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function toMin(hhmm: string): number | null {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function durationBetween(start: string, end: string): number | null {
  const s = toMin(start);
  const e = toMin(end);
  if (s == null || e == null) return null;
  if (e === s) return null;
  return e > s ? e - s : e + 24 * 60 - s;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} j`;
  if (h === 0) return `${m} m`;
  return `${h}j ${m}m`;
}

function TotalHoursPill({
  duration,
  isError,
  errorText,
}: {
  duration: number | null;
  isError?: boolean;
  errorText?: string | null;
}) {
  if (isError) {
    return (
      <span
        title={errorText ?? "Durasi tidak valid"}
        className="inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-700"
      >
        <span aria-hidden>!</span> –
      </span>
    );
  }
  if (duration == null) {
    return (
      <span className="inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 text-[13px] text-gray-600">
        ⏱ –
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 text-[13px] font-semibold text-green-700">
      ? {formatDuration(duration)}
    </span>
  );
}

function ReguOperatorField({
  regu,
  operators,
  loading,
  error,
  onOpen,
}: {
  regu: MstRegu | null;
  operators: MstOperator[];
  loading?: boolean;
  error?: string | null;
  onOpen: () => void;
}) {
  const hasError = Boolean(error);
  const reguName = regu?.namaRegu ?? null;
  const opNames = operators.map((o) => o.namaOperator).join(", ") || null;

  return (
    <div className="min-w-0 flex-1">
      <span className={labelCls}>Regu &amp; Operator</span>
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className={`flex h-14 w-full items-stretch rounded-lg border bg-white px-3 text-left transition ${
          hasError
            ? "border-red-500"
            : regu || operators.length
              ? "border-gray-400"
              : "border-gray-300"
        } hover:border-gray-500`}
      >
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-2">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
            <UsersIcon className="h-2.5 w-2.5" /> Regu
          </span>
          <span
            className={`truncate text-xs font-semibold ${
              reguName ? "text-gray-800" : "text-gray-300"
            }`}
          >
            {reguName ?? "Pilih regu"}
          </span>
        </span>
        <span className="my-1 w-px bg-gray-200" />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pl-2">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
            <ClipboardIcon className="h-2.5 w-2.5" /> Operator
            {operators.length > 0 && (
              <span className="rounded bg-blue-50 px-1 text-[8px] font-semibold text-blue-700">
                {operators.length} orang
              </span>
            )}
          </span>
          <span
            className={`truncate text-xs font-semibold ${
              opNames ? "text-gray-800" : "text-gray-300"
            }`}
          >
            {opNames ?? "Pilih operator"}
          </span>
        </span>
        <span className="flex items-center pl-1 text-gray-400">
          {loading ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          ) : regu || operators.length ? (
            <span className="text-[10px]">Edit</span>
          ) : (
            <span className="text-lg leading-none">›</span>
          )}
        </span>
      </button>
      {hasError && (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

function ReguOperatorPickerDialog({
  reguList,
  initialRegu,
  initialOperators,
  onCancel,
  onConfirm,
}: {
  reguList: MstRegu[];
  initialRegu: MstRegu | null;
  initialOperators: MstOperator[];
  onCancel: () => void;
  onConfirm: (regu: MstRegu, operators: MstOperator[]) => void;
}) {
  const [regu, setRegu] = useState<MstRegu | null>(initialRegu);
  const [ops, setOps] = useState<MstOperator[]>(initialOperators);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);

  const loadOps = useCallback(async (idRegu: number) => {
    setOpsLoading(true);
    setOpsError(null);
    const res = await getOperatorsByReguAction(idRegu);
    setOpsLoading(false);
    if (res.ok) setOps(res.items);
    else {
      setOpsError(res.error);
      setOps([]);
    }
  }, []);

  function selectRegu(r: MstRegu) {
    setRegu(r);
    setOps([]);
    void loadOps(r.idRegu);
  }

  function toggleOp(op: MstOperator) {
    setOps((prev) =>
      prev.some((x) => x.idOperator === op.idOperator)
        ? prev.filter((x) => x.idOperator !== op.idOperator)
        : [...prev, op],
    );
  }

  const available = regu ? ops : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-bold text-gray-900">
            Pilih Regu &amp; Operator
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-0">
          <div className="min-h-0 overflow-y-auto border-r border-gray-100">
            <div className="sticky top-0 bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Regu
            </div>
            {reguList.length === 0 ? (
              <p className="p-4 text-xs text-gray-400">Tidak ada regu</p>
            ) : (
              reguList.map((r) => (
                <button
                  key={r.idRegu}
                  type="button"
                  onClick={() => selectRegu(r)}
                  className={`block w-full border-l-2 px-3 py-2.5 text-left text-sm transition ${
                    regu?.idRegu === r.idRegu
                      ? "border-l-[#0277BD] bg-blue-50 font-semibold text-blue-900"
                      : "border-l-transparent text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {r.namaRegu}
                  {r.namaKepalaRegu && (
                    <span className="block text-[11px] font-normal text-gray-400">
                      Kepala: {r.namaKepalaRegu}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="sticky top-0 bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Operator
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!regu ? (
                <p className="p-3 text-xs text-gray-400">
                  Pilih regu terlebih dahulu
                </p>
              ) : opsLoading ? (
                <p className="p-3 text-xs text-gray-400">Memuat operator…</p>
              ) : opsError ? (
                <p className="p-3 text-xs text-red-600">{opsError}</p>
              ) : available.length === 0 ? (
                <p className="p-3 text-xs text-gray-400">
                  Operator tidak ditemukan
                </p>
              ) : (
                available.map((op) => {
                  const checked = ops.some(
                    (x) => x.idOperator === op.idOperator,
                  );
                  return (
                    <label
                      key={op.idOperator}
                      className="mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOp(op)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#0277BD]"
                      />
                      {op.namaOperator}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          <span className="text-xs text-gray-500">
            {regu ? `${ops.length} operator dipilih` : "Belum pilih regu"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 rounded-full border border-gray-300 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              BATAL
            </button>
            <button
              type="button"
              disabled={!regu || ops.length === 0}
              onClick={() => regu && onConfirm(regu, ops)}
              className="h-9 rounded-full bg-[#0277BD] px-5 text-xs font-bold text-white disabled:opacity-50"
            >
              SIMPAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductionFormDialog({
  header,
  initialMesin,
  activeShift,
  isDateEditable,
  onClose,
  onSaved,
}: {
  header?: PasangKunciProduction | null;
  initialMesin?: PasangKunciMesinInfo | null;
  activeShift?: PasangKunciActiveShift | null;
  isDateEditable?: boolean;
  onClose: () => void;
  onSaved?: (noProduksi: string) => void;
}) {
  const editMode = Boolean(header);
  const allowDateEdit = isDateEditable === true && !editMode;
  const mesinName =
    header?.namaMesin ?? initialMesin?.namaMesin ?? "Pilih data produksi";

  const [state, formAction] = useActionState<PasangKunciFormState, FormData>(
    createPasangKunciAction,
    initialState,
  );

  const [PasangKunciTypes, setPasangKunciTypes] = useState<PasangKunciType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [tglProduksi, setTglProduksi] = useState(
    header?.tglProduksi?.slice(0, 10) ?? defaultDate(),
  );
  const [shift, setShift] = useState(
    String(header?.shift ?? activeShift?.shift ?? 1),
  );
  const [hourStart, setHourStart] = useState(
    header?.hourStart ?? activeShift?.hourStart ?? "",
  );
  const [hourEnd, setHourEnd] = useState(
    header?.hourEnd ?? activeShift?.hourEnd ?? "",
  );
  const [outputJenisId, setOutputJenisId] = useState(
    header?.outputJenisId != null ? String(header.outputJenisId) : "",
  );

  const [reguList, setReguList] = useState<MstRegu[]>([]);
  const [selectedRegu, setSelectedRegu] = useState<MstRegu | null>(null);
  const [selectedOps, setSelectedOps] = useState<MstOperator[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reguError, setReguError] = useState<string | null>(null);
  const [reguLoading, setReguLoading] = useState(true);

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const lockShift = !editMode && activeShift != null && !allowDateEdit;

  const idMesin = header?.idMesin ?? initialMesin?.idMesin ?? null;

  const duration = durationBetween(hourStart, hourEnd);
  const startFilled = hourStart.trim().length > 0;
  const endFilled = hourEnd.trim().length > 0;
  const hasDurationError =
    startFilled && endFilled && duration == null;
  const canSave = !hasDurationError && duration != null && idMesin != null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPasangKunciTypesAction();
      if (cancelled) return;
      setTypesLoading(false);
      if (res.ok) setPasangKunciTypes(res.types.filter((t) => t.enable !== false));
      else setTypesError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getReguListAction();
      if (cancelled) return;
      setReguLoading(false);
      if (res.ok) {
        setReguList(res.items);
        if (header?.idRegu != null) {
          const found =
            res.items.find((r) => r.idRegu === header.idRegu) ?? null;
          if (found) {
            setSelectedRegu(found);
            const opRes = await getOperatorsByReguAction(found.idRegu);
            if (cancelled) return;
            if (opRes.ok) {
              const selected = opRes.items.filter((o) =>
                header.idOperators.includes(o.idOperator),
              );
              setSelectedOps(
                selected.length
                  ? selected
                  : header.idOperators.map((id) => ({
                      idOperator: id,
                      namaOperator:
                        header.namaOperators.split(",")[id] ??
                        `Operator ${id}`,
                      enable: true,
                    })),
              );
            }
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [header]);

  const shiftRef = useRef(shift);
  useEffect(() => {
    if (lockShift || editMode) return;
    if (shiftRef.current === shift) return;
    shiftRef.current = shift;
    let cancelled = false;
    void (async () => {
      const res = await getShiftHourAction(tglProduksi, parseInt(shift, 10) || 1);
      if (cancelled || !res.ok || !res.hour) return;
      setHourStart(res.hour.hourStart);
      setHourEnd(res.hour.hourEnd);
    })();
    return () => {
      cancelled = true;
    };
  }, [shift, tglProduksi, lockShift, editMode]);

  useEffect(() => {
    if (state.status === "success" && state.noProduksi) {
      onSaved?.(state.noProduksi);
      onClose();
    }
  }, [state, onSaved, onClose]);

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!header) return;
    if (hasDurationError || !selectedRegu || selectedOps.length === 0) {
      if (!selectedRegu || selectedOps.length === 0) {
        setReguError("Regu & operator wajib dipilih");
      }
      return;
    }
    setEditSaving(true);
    setEditError(null);
    const jamKerja =
      duration != null ? Math.max(1, Math.round(duration / 60)) : header.jamKerja;
    const result = await updatePasangKunciAction(header.noProduksi, {
      tglProduksi,
      shift: parseInt(shift, 10) || 1,
      hourStart: hourStart || undefined,
      hourEnd: hourEnd || undefined,
      idOperators: selectedOps.map((o) => o.idOperator),
      idRegu: selectedRegu?.idRegu,
      outputJenisId: outputJenisId ? parseInt(outputJenisId, 10) : undefined,
      jamKerja,
    });
    setEditSaving(false);
    if (result.status === "success") {
      setEditSuccess(true);
      setTimeout(() => {
        onSaved?.(header.noProduksi);
        onClose();
      }, 600);
    } else {
      setEditError(result.message ?? "Gagal memperbarui data");
    }
  }

  const createError = state.status === "error" ? state.message : null;
  const error = editError ?? createError;

  const formContent = (
    <>
      <div className="mb-5 flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: editMode ? "#FFF3E0" : "#E3F2FD",
            color: editMode ? "#E65100" : "#0277BD",
          }}
        >
          {editMode ? (
            <ClipboardIcon className="h-5 w-5" />
          ) : (
            <PlusIcon className="h-5 w-5" />
          )}
        </span>
        <span className="min-w-0 flex-[3] truncate text-[17px] font-bold text-gray-900">
          {mesinName}
        </span>
        <span className="shrink-0 text-xs text-gray-500">
          {!allowDateEdit && fmtDisplayDate(tglProduksi)}
        </span>
        {allowDateEdit && (
          <input
            type="date"
            name="tglProduksi"
            value={tglProduksi}
            onChange={(e) => setTglProduksi(e.target.value)}
            className="h-9 w-[9.5rem] rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-[#0277BD]"
            required
          />
        )}
        {!allowDateEdit && (
          <input type="hidden" name="tglProduksi" value={tglProduksi} />
        )}
      </div>

      <div className="space-y-4">
        <div
          className={`grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] ${
            lockShift ? "opacity-55" : ""
          }`}
        >
          <div>
            <span className={labelCls}>Shift</span>
            <select
              name="shift"
              value={shift}
              aria-readonly={lockShift}
              onChange={(e) => {
                if (lockShift) return;
                setShift(e.target.value);
              }}
              className={`${inputCls} ${lockShift ? "cursor-not-allowed" : ""}`}
            >
              {[1, 2, 3].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={labelCls}>Jam Mulai</span>
            <input
              type="time"
              name="hourStart"
              value={hourStart}
              readOnly={lockShift}
              aria-readonly={lockShift}
              onChange={(e) => {
                if (lockShift) return;
                setHourStart(e.target.value);
              }}
              className={inputCls}
              required
            />
          </div>
          <div>
            <span className={labelCls}>Jam Selesai</span>
            <input
              type="time"
              name="hourEnd"
              value={hourEnd}
              readOnly={lockShift}
              aria-readonly={lockShift}
              onChange={(e) => {
                if (lockShift) return;
                setHourEnd(e.target.value);
              }}
              className={inputCls}
              required
            />
          </div>
          <div className="flex items-end pb-1">
            <TotalHoursPill
              duration={duration}
              isError={hasDurationError}
              errorText={
                hasDurationError
                  ? "Durasi tidak boleh 0 menit"
                  : "Durasi tidak valid"
              }
            />
          </div>
        </div>

        {hasDurationError && (
          <p className="-mt-2 text-[11px] font-medium text-red-600">
            Durasi jam mulai &amp; selesai tidak valid (0 menit)
          </p>
        )}

        <div className="flex items-start gap-3">
          <ReguOperatorField
            regu={selectedRegu}
            operators={selectedOps}
            loading={reguLoading}
            error={reguError}
            onOpen={() => setPickerOpen(true)}
          />
          <input type="hidden" name="idRegu" value={selectedRegu?.idRegu ?? ""} />
          <input
            type="hidden"
            name="idOperators"
            value={selectedOps.map((o) => o.idOperator).join(",")}
          />
        </div>

        <div>
          <span className={labelCls}>Jenis Furniture WIP</span>
          <select
            name="outputJenisId"
            value={outputJenisId}
            onChange={(e) => setOutputJenisId(e.target.value)}
            className={inputCls}
            required={!editMode}
          >
            <option value="" disabled>
              {typesLoading
                ? "Memuat jenis Furniture WIP..."
                : typesError
                  ? "Gagal memuat jenis"
                  : "Pilih jenis Furniture WIP"}
            </option>
            {PasangKunciTypes.map((t) => (
              <option key={t.idCabinetWip} value={t.idCabinetWip}>
                {t.nama}
              </option>
            ))}
          </select>
          {typesError && (
            <span className="mt-1 block text-[11px] text-red-600">
              {typesError}
            </span>
          )}
        </div>

        {!editMode && (
          <>
            <input type="hidden" name="idMesin" value={idMesin ?? ""} />
            <input
              type="hidden"
              name="jamKerja"
              value={duration != null ? Math.max(1, Math.round(duration / 60)) : 8}
            />
          </>
        )}
        {editMode && (
          <input
            type="hidden"
            name="jamKerja"
            value={
              duration != null
                ? Math.max(1, Math.round(duration / 60))
                : header?.jamKerja ?? 8
            }
          />
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {editSuccess && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Berhasil diperbarui.
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center rounded-full border border-gray-300 px-6 text-sm font-bold uppercase tracking-wide text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <SubmitButton editMode={editMode} saving={editSaving} disabled={!canSave}>
          {editMode ? "Simpan" : "Simpan"}
        </SubmitButton>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h2 className="text-sm font-bold text-gray-800">
            {editMode ? "Edit produksi pasang kunci" : "Tambah produksi pasang kunci"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-3.5rem)] overflow-y-auto px-5 pb-5">
          {editMode ? (
            <form onSubmit={handleEditSubmit}>{formContent}</form>
          ) : (
            <form action={formAction}>{formContent}</form>
          )}
        </div>
      </div>

      {pickerOpen && (
        <ReguOperatorPickerDialog
          reguList={reguList}
          initialRegu={selectedRegu}
          initialOperators={selectedOps}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(regu, ops) => {
            setSelectedRegu(regu);
            setSelectedOps(ops);
            setReguError(null);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
