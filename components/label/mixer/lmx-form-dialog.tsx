"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type {
  LmxDetail,
  LmxHeader,
  LmxJenis,
  LmxMaxSak,
  LmxOutputItem,
  LmxProcessOption,
  LmxSavePayload,
} from "@/services/label-mixer-service";
import { fmtBerat, fromYmd, toYmd } from "./lmx-format";
import { LmxOutputPanel } from "./lmx-output-panel";
import { LmxPlusIcon, LmxWeightIcon } from "./lmx-icons";

type Mode = "production" | "inject";

type Props = {
  header: LmxHeader | null;
  initialDetails: LmxDetail[];
  jenis: LmxJenis[];
  fetchingJenis: boolean;
  maxSak: LmxMaxSak;
  onClose: () => void;
  fetchProduksiOptions: (args: {
    tanggal: string;
    mode: Mode;
  }) => Promise<
    { ok: true; options: LmxProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (args: {
    noProduksi: string;
    mode: Mode;
  }) => Promise<{ ok: true; outputs: LmxOutputItem[] } | { ok: false; error: string }>;
  onSubmitCreate: (
    payload: LmxSavePayload,
  ) => Promise<{ ok: true; noMixer: string | null } | { ok: false; error: string }>;
  onSubmitUpdate: (args: {
    noMixer: string;
    payload: LmxSavePayload;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

type DraftDetail = {
  noSak: number;
  berat: string;
};

function detectMode(header: LmxHeader | null): Mode {
  if (!header) return "production";
  const code = (header.OutputCode ?? header.NoProduksi ?? "").trim().toUpperCase();
  if (code.startsWith("S.")) return "inject";
  return "production";
}

function initialCode(header: LmxHeader | null): string {
  if (!header) return "";
  const code = (header.OutputCode ?? "").trim();
  if (code.toUpperCase().startsWith("I.") || code.toUpperCase().startsWith("S.")) return code;
  return (header.NoProduksi ?? "").trim();
}

export function LmxFormDialog({
  header,
  initialDetails,
  jenis,
  fetchingJenis,
  maxSak,
  onClose,
  fetchProduksiOptions,
  fetchOutputs,
  onSubmitCreate,
  onSubmitUpdate,
}: Props) {
  const isEdit = header != null;
  const [mode, setMode] = useState<Mode>(() => detectMode(header));

  const initialDate = (() => {
    if (header?.DateCreate) {
      const d = fromYmd(header.DateCreate);
      if (d) return d;
    }
    return new Date();
  })();

  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [idMixer, setIdMixer] = useState<string>(
    header && header.IdMixer ? String(header.IdMixer) : "",
  );
  const [noProduksi, setNoProduksi] = useState(() => initialCode(header));
  const [drafts, setDrafts] = useState<DraftDetail[]>(() =>
    initialDetails.map((d) => ({
      noSak: d.NoSak,
      berat: d.Berat != null ? String(d.Berat) : "",
    })),
  );

  const [options, setOptions] = useState<LmxProcessOption[]>(() =>
    isEdit && initialCode(header)
      ? [{ noProduksi: initialCode(header), namaMesin: header?.NamaMesin ?? "" }]
      : [],
  );
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LmxOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    void (async () => {
      setLoadingOptions(true);
      const res = await fetchProduksiOptions({ tanggal: dateYmd, mode });
      setLoadingOptions(false);
      if (cancelled) return;
      if (res.ok) {
        setOptions(res.options);
        setNoProduksi((prev) =>
          prev && res.options.some((o) => o.noProduksi === prev) ? prev : "",
        );
      } else {
        setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, dateYmd, mode, fetchProduksiOptions]);

  useEffect(() => {
    let cancelled = false;
    if (!noProduksi) return;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs({ noProduksi, mode });
      setLoadingOutputs(false);
      if (cancelled) return;
      if (res.ok) setOutputs(res.outputs);
      else setOutputs([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [noProduksi, mode, fetchOutputs]);

  const totalBerat = drafts.reduce((a, d) => a + (Number(d.berat.replace(",", ".")) || 0), 0);
  const remaining = Math.max(0, maxSak.JlhSak - drafts.length);
  const nextSak = drafts.reduce((m, d) => Math.max(m, d.noSak), 0) + 1;

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      const next: Record<string, string> = {};
      if (!idMixer) next.jenis = "Wajib pilih jenis mixer";
      if (!noProduksi.trim()) next.noProduksi = "Wajib pilih Proses Produksi atau Inject";
      if (drafts.length === 0) next.details = "Tambah minimal 1 detail SAK.";
      for (const d of drafts) {
        const b = Number(d.berat.replace(",", "."));
        if (!Number.isFinite(b) || b <= 0) {
          next.details = "Semua berat sak harus diisi dan > 0.";
          break;
        }
      }
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setErrors({});
      setFormError(null);
      setBusy(true);

      const outputCode = noProduksi.trim();
      const payload: LmxSavePayload = {
        header: {
          IdMixer: Number(idMixer),
        },
        details: drafts.map((d) => ({
          NoSak: d.noSak,
          Berat: Number(d.berat.replace(",", ".")),
        })),
        ...(isEdit ? {} : { outputCode }),
      };

      const res = isEdit
        ? await onSubmitUpdate({ noMixer: header.NoMixer, payload })
        : await onSubmitCreate(payload);
      setBusy(false);
      if (!res.ok) {
        setFormError({ title: "Gagal Menyimpan Label", message: res.error });
        return;
      }
      onClose();
    },
    [busy, idMixer, noProduksi, drafts, isEdit, header, onSubmitCreate, onSubmitUpdate, onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[92vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-[#EBECF0] bg-[#F8F9FB] px-5 py-3.5">
          <span
            className="rounded-lg p-2"
            style={
              isEdit
                ? { backgroundColor: "#FFF3E0", color: "#E65100" }
                : { backgroundColor: "#E8F5E9", color: "#00897B" }
            }
          >
            {isEdit ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            ) : (
              <LmxPlusIcon className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label Mixer" : "Tambah Label Mixer"}
            </p>
            <p className="truncate text-[12px] font-semibold text-[#44546F]">
              {isEdit ? header.NoMixer : "Label Mixer"}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-xl bg-[#F8F9FB] p-4">
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  Date Created
                </span>
                <input
                  type="date"
                  value={dateYmd}
                  disabled={isEdit}
                  onChange={(e) => {
                    setDateYmd(e.target.value);
                    if (!isEdit) {
                      setNoProduksi("");
                      setOutputs([]);
                    }
                  }}
                  className={inputCls}
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  Jenis Mixer
                </span>
                <select
                  value={idMixer}
                  onChange={(e) => setIdMixer(e.target.value)}
                  disabled={fetchingJenis}
                  className={inputCls}
                >
                  <option value="">
                    {fetchingJenis ? "Memuat jenis…" : "Pilih jenis mixer…"}
                  </option>
                  {jenis.map((j) => (
                    <option key={j.IdMixer} value={String(j.IdMixer)}>
                      {j.Nama}
                    </option>
                  ))}
                </select>
                {errors.jenis && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.jenis}
                  </span>
                )}
              </label>

              <div className="mt-3">
                <span className="mb-1.5 block text-[13px] font-semibold text-[#44546F]">
                  Sumber Proses
                </span>
                <div className="flex gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-[#172B4D]">
                    <input
                      type="radio"
                      name="lmx-mode"
                      checked={mode === "production"}
                      disabled={isEdit}
                      onChange={() => {
                        setMode("production");
                        setNoProduksi("");
                        setOutputs([]);
                      }}
                      className="h-4 w-4"
                    />
                    Produksi Mixer
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-[#172B4D]">
                    <input
                      type="radio"
                      name="lmx-mode"
                      checked={mode === "inject"}
                      disabled={isEdit}
                      onChange={() => {
                        setMode("inject");
                        setNoProduksi("");
                        setOutputs([]);
                      }}
                      className="h-4 w-4"
                    />
                    Inject
                  </label>
                </div>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  {mode === "inject" ? "No Inject" : "No Produksi"}
                </span>
                <select
                  value={noProduksi}
                  disabled={isEdit}
                  onChange={(e) => setNoProduksi(e.target.value)}
                  className={inputCls}
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat proses…"
                      : mode === "inject"
                        ? "Pilih no inject…"
                        : "Pilih no produksi…"}
                  </option>
                  {options.map((o) => (
                    <option key={o.noProduksi} value={o.noProduksi}>
                      {o.noProduksi}
                      {o.namaMesin ? ` — ${o.namaMesin}` : ""}
                    </option>
                  ))}
                </select>
                {errors.noProduksi && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.noProduksi}
                  </span>
                )}
              </label>
            </div>

            <div className="rounded-xl border border-[#E2E6EA] bg-white">
              <div className="flex items-center justify-between border-b border-[#EBECF0] px-4 py-3">
                <p className="text-[15px] font-bold text-[#172B4D]">Detail</p>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(true);
                    setEditIdx(null);
                  }}
                  disabled={remaining <= 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-3 py-1.5 text-[12px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <LmxPlusIcon className="h-3.5 w-3.5" />
                  Tambah
                </button>
              </div>
              <div className="flex items-center justify-around bg-[#E9F2FF] px-4 py-2 text-[13px] font-bold text-[#172B4D]">
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4 text-[#1565C0]"
                    aria-hidden
                  >
                    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                    <path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                    <path d="M10 12h4" />
                  </svg>
                  {drafts.length} sak
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LmxWeightIcon className="h-4 w-4 text-[#1565C0]" />
                  {fmtBerat(totalBerat)} kg
                </span>
              </div>
              {errors.details && (
                <p className="border-t border-red-200 bg-red-50 px-4 py-1.5 text-[11px] font-semibold text-red-700">
                  {errors.details}
                </p>
              )}
              <div className="max-h-[220px] overflow-y-auto">
                {drafts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] text-gray-500">
                    Belum ada detail. Klik &quot;Tambah&quot; untuk menambah sak.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-[#F7F8F9]">
                      <tr className="text-[11px] font-bold uppercase text-[#44546F]">
                        <th className="w-[60px] px-4 py-2">Sak</th>
                        <th className="px-3 py-2 text-right">Berat (kg)</th>
                        <th className="w-[90px] px-3 py-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d, i) => (
                        <tr key={d.noSak} className="border-t border-[#F1F2F4]">
                          <td className="px-4 py-2 text-[13px] font-bold text-[#172B4D]">
                            {d.noSak}
                          </td>
                          <td className="px-3 py-2 text-right text-[13px] text-[#44546F]">
                            {Number(d.berat.replace(",", ".") || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditIdx(i);
                                setAddOpen(true);
                              }}
                              className="rounded p-1 text-[#1565C0] hover:bg-[#E9F2FF]"
                              title="Edit"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                className="h-3.5 w-3.5"
                                aria-hidden
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                              className="ml-1 rounded p-1 text-[#C9372C] hover:bg-red-50"
                              title="Hapus"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                className="h-3.5 w-3.5"
                                aria-hidden
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="hidden w-[240px] shrink-0 border-l border-[#E2E6EA] lg:block">
            <LmxOutputPanel
              noProduksi={noProduksi}
              outputs={outputs}
              loading={loadingOutputs}
              mode={mode}
            />
          </div>
        </div>

        {formError && (
          <div className="border-t border-red-200 bg-red-50 px-5 py-3">
            <p className="text-[13px] font-bold text-red-700">{formError.title}</p>
            <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-red-600">
              {formError.message}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#EBECF0] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#DCDFE4] px-5 py-2.5 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F4F5F7] disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: isEdit ? "#F57C00" : "#00897B" }}
          >
            {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
            SIMPAN
          </button>
        </div>
      </form>

      {addOpen && (
        <AddDetailModal
          maxRemaining={editIdx != null ? remaining + 1 : remaining}
          defaultBerat={maxSak.DefaultKG}
          initial={
            editIdx != null
              ? { noSak: drafts[editIdx].noSak, berat: drafts[editIdx].berat }
              : { noSak: nextSak, berat: String(maxSak.DefaultKG) }
          }
          onCancel={() => {
            setAddOpen(false);
            setEditIdx(null);
          }}
          onConfirm={(noSak, berat) => {
            setDrafts((prev) => {
              if (editIdx != null) {
                return prev.map((d, i) => (i === editIdx ? { noSak, berat } : d));
              }
              return [...prev, { noSak, berat }];
            });
            setAddOpen(false);
            setEditIdx(null);
          }}
        />
      )}
    </div>
  );
}

function AddDetailModal({
  maxRemaining,
  defaultBerat,
  initial,
  onCancel,
  onConfirm,
}: {
  maxRemaining: number;
  defaultBerat: number;
  initial: { noSak: number; berat: string };
  onCancel: () => void;
  onConfirm: (noSak: number, berat: string) => void;
}) {
  const [noSak, setNoSak] = useState(String(initial.noSak));
  const [berat, setBerat] = useState(initial.berat || String(defaultBerat));
  const [noSakErr, setNoSakErr] = useState<string | null>(null);
  const [beratErr, setBeratErr] = useState<string | null>(null);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-xl">
        <p className="mb-3 text-[16px] font-bold text-[#172B4D]">Tambah Detail</p>
        <div className="flex items-end gap-3">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-[#44546F]">No Sak</span>
            <input
              type="number"
              min={1}
              value={noSak}
              onChange={(e) => {
                setNoSak(e.target.value);
                setNoSakErr(null);
              }}
              className={inputCls}
            />
            {noSakErr && (
              <span className="mt-1 block text-[11px] font-semibold text-red-600">{noSakErr}</span>
            )}
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[12px] font-semibold text-[#44546F]">Berat (kg)</span>
            <input
              inputMode="decimal"
              value={berat}
              onChange={(e) => {
                setBerat(e.target.value);
                setBeratErr(null);
              }}
              className={inputCls}
            />
            {beratErr && (
              <span className="mt-1 block text-[11px] font-semibold text-red-600">{beratErr}</span>
            )}
          </label>
        </div>
        {maxRemaining > 0 && (
          <p className="mt-2 text-[11px] text-gray-500">Sisa kapasitas: {maxRemaining} sak.</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#DCDFE4] px-4 py-2 text-[12px] font-bold text-[#44546F] hover:bg-[#F4F5F7]"
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={() => {
              const ns = Number(noSak);
              const b = Number(berat.replace(",", "."));
              let ok = true;
              if (!Number.isInteger(ns) || ns <= 0) {
                setNoSakErr("Minimal 1");
                ok = false;
              }
              if (!Number.isFinite(b) || b <= 0) {
                setBeratErr("Berat harus > 0");
                ok = false;
              }
              if (!ok) return;
              onConfirm(ns, String(b));
            }}
            className="rounded-xl bg-[#00897B] px-5 py-2 text-[12px] font-bold text-white"
          >
            SIMPAN
          </button>
        </div>
      </div>
    </div>
  );
}
