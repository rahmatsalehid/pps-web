"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2Icon } from "@/components/dashboard/icons";
import type {
  LfwHeader,
  LfwInjectCandidate,
  LfwJenis,
  LfwOutputItem,
  LfwProcessOption,
  LfwSourceMode,
} from "@/services/label-furniture-wip-service";
import { fromYmd, toYmd } from "./lfw-format";
import { LfwOutputPanel } from "./lfw-output-panel";
import { LfwChairIcon, LfwCheckIcon } from "./lfw-icons";

type Props = {
  header: LfwHeader | null;
  jenis: LfwJenis[];
  fetchingJenis: boolean;
  onClose: () => void;
  fetchProduksiOptions: (
    mode: LfwSourceMode,
    tanggal: string,
  ) => Promise<
    { ok: true; options: LfwProcessOption[] } | { ok: false; error: string }
  >;
  fetchOutputs: (
    mode: LfwSourceMode,
    noProduksi: string,
  ) => Promise<
    { ok: true; outputs: LfwOutputItem[] } | { ok: false; error: string }
  >;
  fetchInjectCandidates: (
    noProduksi: string,
  ) => Promise<
    | { ok: true; candidates: LfwInjectCandidate[]; beratTimbang: number | null }
    | { ok: false; error: string }
  >;
  onSubmitCreate: (args: {
    mode: LfwSourceMode;
    noProduksi: string;
    dateCreate: string;
    pcs: number;
    berat: number | null;
    idJenisList: number[];
    printMode: "single" | "multiple" | "quick";
    quickCount: number;
  }) => Promise<
    { ok: true; nos: string[] } | { ok: false; error: string }
  >;
  onSubmitUpdate: (args: {
    noFurnitureWip: string;
    dateCreate: string;
    idJenis: number;
    pcs: number;
    berat: number | null;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const MODES: { value: LfwSourceMode; label: string; prefix: string; sourceLabel: string }[] = [
  { value: "INJECT", label: "Inject", prefix: "S.", sourceLabel: "No Inject (S.)" },
  { value: "HOTSTAMP", label: "Hot Stamping", prefix: "BH.", sourceLabel: "No Hot Stamp (BH.)" },
  { value: "KEYFITTING", label: "Pasang Kunci", prefix: "BI.", sourceLabel: "No Pasang Kunci (BI.)" },
  { value: "SPANNER", label: "Spanner", prefix: "BJ.", sourceLabel: "No Spanner (BJ.)" },
  { value: "RETUR", label: "Retur BJ", prefix: "L.", sourceLabel: "No Retur (L.)" },
];

const inputCls =
  "h-10 w-full rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-3 text-[14px] font-semibold text-[#172B4D] outline-none transition focus:border-[#1565C0] focus:bg-white disabled:opacity-60";

function parsePcs(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return { ok: false, error: "PCS wajib diisi." };
  if (!/^\d*\.?\d{0,3}$/.test(s)) return { ok: false, error: "Format PCS tidak valid." };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Format PCS tidak valid." };
  if (n <= 0) return { ok: false, error: "PCS harus > 0." };
  return { ok: true, value: n };
}

function parseBeratOptional(
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return { ok: true, value: null };
  if (!/^\d*\.?\d{0,3}$/.test(s)) return { ok: false, error: "Format berat tidak valid." };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Format berat tidak valid." };
  if (n <= 0) return { ok: false, error: "Berat harus > 0." };
  return { ok: true, value: n };
}

export function LfwFormDialog({
  header,
  jenis,
  fetchingJenis,
  onClose,
  fetchProduksiOptions,
  fetchOutputs,
  fetchInjectCandidates,
  onSubmitCreate,
  onSubmitUpdate,
}: Props) {
  const isEdit = header != null;

  const initialDate = (() => {
    if (header?.DateCreate) {
      const d = fromYmd(header.DateCreate);
      if (d) return d;
    }
    return new Date();
  })();

  const [mode, setMode] = useState<LfwSourceMode>("INJECT");
  const modeIsInject = mode === "INJECT";
  const isInjectCreate = !isEdit && modeIsInject;
  const [dateYmd, setDateYmd] = useState(() => toYmd(initialDate));
  const [idJenis, setIdJenis] = useState<string>(
    header && header.IdFurnitureWIP ? String(header.IdFurnitureWIP) : "",
  );
  const [selectedJenisIds, setSelectedJenisIds] = useState<number[]>([]);
  const [pcs, setPcs] = useState(header?.Pcs != null ? String(header.Pcs) : "");
  const [berat, setBerat] = useState(header?.Berat != null ? String(header.Berat) : "");
  const [noProduksi, setNoProduksi] = useState("");
  const [printMode, setPrintMode] = useState<"single" | "multiple" | "quick">("single");
  const [quickCount, setQuickCount] = useState("1");

  const [options, setOptions] = useState<LfwProcessOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [outputs, setOutputs] = useState<LfwOutputItem[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);
  const [injectCandidates, setInjectCandidates] = useState<LfwInjectCandidate[]>([]);
  const [beratTimbang, setBeratTimbang] = useState<number | null>(null);

  const [errors, setErrors] = useState<{
    mode?: string;
    noProduksi?: string;
    jenis?: string;
    pcs?: string;
    berat?: string;
    quickCount?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    void (async () => {
      setLoadingOptions(true);
      const res = await fetchProduksiOptions(mode, dateYmd);
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
  }, [isEdit, mode, dateYmd, fetchProduksiOptions]);

  useEffect(() => {
    if (isEdit || !noProduksi) return;
    let cancelled = false;
    void (async () => {
      setLoadingOutputs(true);
      const res = await fetchOutputs(mode, noProduksi);
      if (!cancelled) {
        setOutputs(res.ok ? res.outputs : []);
      }
      if (modeIsInject) {
        const cand = await fetchInjectCandidates(noProduksi);
        if (cancelled) return;
        if (cand.ok) {
          setInjectCandidates(cand.candidates);
          setBeratTimbang(cand.beratTimbang);
          setSelectedJenisIds((prev) =>
            prev.filter((id) => cand.candidates.some((c) => c.IdFurnitureWIP === id)),
          );
        } else {
          setInjectCandidates([]);
          setBeratTimbang(null);
        }
      } else {
        setInjectCandidates([]);
        setBeratTimbang(null);
      }
      if (!cancelled) setLoadingOutputs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, mode, modeIsInject, noProduksi, fetchOutputs, fetchInjectCandidates]);

  const autoBeratInject = (() => {
    if (!isInjectCreate || beratTimbang == null) return null;
    const rPcs = parsePcs(pcs);
    if (!rPcs.ok) return null;
    return (rPcs.value / 1000) * beratTimbang;
  })();

  const selectProduksi = useCallback((code: string) => {
    setNoProduksi(code);
    setOutputs([]);
    setInjectCandidates([]);
    setBeratTimbang(null);
    setSelectedJenisIds([]);
    setErrors((e) => ({ ...e, noProduksi: undefined, jenis: undefined }));
  }, []);

  const toggleInjectJenis = useCallback((id: number) => {
    setSelectedJenisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setErrors((e) => ({ ...e, jenis: undefined }));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};

    if (!isEdit && !noProduksi.trim()) next.noProduksi = "Pilih nomor sumber proses";

    const rPcs = parsePcs(pcs);
    if (!rPcs.ok) next.pcs = rPcs.error;

    let rBerat: { ok: true; value: number | null } | { ok: false; error: string };
    if (isInjectCreate) {
      if (autoBeratInject == null) {
        rBerat = { ok: false, error: "Berat tidak dapat dihitung (timbang inject belum siap)." };
        next.berat = rBerat.error;
      } else {
        rBerat = { ok: true, value: autoBeratInject };
      }
    } else {
      rBerat = parseBeratOptional(berat);
      if (!rBerat.ok) next.berat = rBerat.error;
    }

    if (isEdit) {
      if (!idJenis) next.jenis = "Wajib pilih jenis Furniture WIP";
    } else if (isInjectCreate) {
      if (selectedJenisIds.length === 0) next.jenis = "Pilih minimal 1 jenis Furniture WIP";
    } else if (!idJenis) {
      next.jenis = "Wajib pilih jenis Furniture WIP";
    }

    if (!isEdit && printMode === "quick") {
      const n = Number(quickCount);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        next.quickCount = "Jumlah label 1–99.";
      }
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);

    if (isEdit) {
      const res = await onSubmitUpdate({
        noFurnitureWip: header.NoFurnitureWIP,
        dateCreate: dateYmd,
        idJenis: Number(idJenis),
        pcs: rPcs.ok ? rPcs.value : 0,
        berat: rBerat.ok ? rBerat.value : null,
      });
      setBusy(false);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      onClose();
      return;
    }

    const idJenisList = isInjectCreate ? selectedJenisIds : [Number(idJenis)];
    const res = await onSubmitCreate({
      mode,
      noProduksi: noProduksi.trim(),
      dateCreate: dateYmd,
      pcs: rPcs.ok ? rPcs.value : 0,
      berat: rBerat.ok ? rBerat.value : null,
      idJenisList,
      printMode,
      quickCount: printMode === "quick" ? Number(quickCount) : 1,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    onClose();
  }

  const modeMeta = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[#EBECF0] px-5 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={
              isEdit
                ? { backgroundColor: "rgba(245,124,0,0.12)", color: "#E65100" }
                : { backgroundColor: "rgba(0,137,123,0.12)", color: "#00897B" }
            }
          >
            <LfwChairIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-[#172B4D]">
              {isEdit ? "Edit Label" : "Tambah Label Baru"}
            </p>
            {isEdit && (
              <p className="truncate text-[12px] font-semibold text-[#6B778C]">
                {header.NoFurnitureWIP}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Date Created
              </span>
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                disabled={busy}
                className={inputCls}
              />
            </label>

            {!isEdit && (
              <fieldset className="block">
                <legend className="mb-1.5 block text-[13px] font-semibold text-[#44546F]">
                  Proses
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setMode(m.value);
                        setNoProduksi("");
                        setOutputs([]);
                        setInjectCandidates([]);
                        setBeratTimbang(null);
                        setSelectedJenisIds([]);
                        setErrors((e) => ({ ...e, mode: undefined, noProduksi: undefined }));
                      }}
                      className="rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition"
                      style={
                        mode === m.value
                          ? {
                              backgroundColor: "rgba(0,137,123,0.12)",
                              borderColor: "rgba(0,137,123,0.40)",
                              color: "#00695C",
                            }
                          : {
                              backgroundColor: "#F3F4F6",
                              borderColor: "#DCDFE4",
                              color: "#44546F",
                            }
                      }
                    >
                      {m.label} <span className="opacity-70">({m.prefix})</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {!isEdit && (
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  {modeMeta.sourceLabel}
                </span>
                <select
                  value={noProduksi}
                  onChange={(e) => selectProduksi(e.target.value)}
                  disabled={loadingOptions || busy}
                  className={inputCls}
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat daftar produksi…"
                      : `Pilih ${modeMeta.sourceLabel}`}
                  </option>
                  {options.map((o) => (
                    <option key={o.noProduksi} value={o.noProduksi}>
                      {o.noProduksi} — {o.namaMesin || "-"}
                    </option>
                  ))}
                </select>
                {errors.noProduksi && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.noProduksi}
                  </span>
                )}
              </label>
            )}

            {isEdit && (
              <div
                className="rounded-lg border border-[#EBECF0] px-3 py-2.5"
                style={{ backgroundColor: "#F7F8F9" }}
              >
                <p className="text-[11px] font-semibold text-[#6B778C]">Proses</p>
                <p className="text-[13px] font-semibold text-[#172B4D]">
                  {(header.OutputCode ?? "").trim() || "-"}
                </p>
              </div>
            )}

            {!isEdit && isInjectCreate ? (
              <fieldset className="block">
                <legend className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  Jenis Furniture WIP (boleh lebih dari satu)
                </legend>
                {!noProduksi ? (
                  <p className="rounded-lg border border-dashed border-[#DCDFE4] px-3 py-3 text-[12px] text-gray-500">
                    Pilih No Inject terlebih dahulu untuk melihat kandidat jenis.
                  </p>
                ) : loadingOutputs ? (
                  <p className="px-1 py-2 text-[12px] text-gray-400">Memuat kandidat jenis…</p>
                ) : injectCandidates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#DCDFE4] px-3 py-3 text-[12px] text-gray-500">
                    Tidak ada kandidat jenis untuk inject ini.
                  </p>
                ) : (
                  <div className="max-h-[160px] space-y-1 overflow-y-auto rounded-lg border border-[#EBECF0] p-1.5">
                    {injectCandidates.map((c) => {
                      const checked = selectedJenisIds.includes(c.IdFurnitureWIP);
                      return (
                        <label
                          key={c.IdFurnitureWIP}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-[#F1F5FB]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInjectJenis(c.IdFurnitureWIP)}
                            disabled={busy}
                            className="h-4 w-4 accent-[#00897B]"
                          />
                          <span className="flex-1 font-semibold text-[#172B4D]">
                            {c.NamaFurnitureWIP}
                          </span>
                          {checked && <LfwCheckIcon className="h-3.5 w-3.5 text-[#00897B]" />}
                        </label>
                      );
                    })}
                  </div>
                )}
                {errors.jenis && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.jenis}
                  </span>
                )}
              </fieldset>
            ) : (
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                  Jenis Furniture WIP
                </span>
                <select
                  value={idJenis}
                  onChange={(e) => {
                    setIdJenis(e.target.value);
                    setErrors((x) => ({ ...x, jenis: undefined }));
                  }}
                  disabled={fetchingJenis || busy}
                  className={inputCls}
                >
                  <option value="">
                    {fetchingJenis ? "Memuat jenis…" : "Pilih jenis Furniture WIP"}
                  </option>
                  {jenis.map((j) => (
                    <option key={j.IdCabinetWIP} value={String(j.IdCabinetWIP)}>
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
            )}

            <label className="block max-w-[280px]">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">PCS</span>
              <input
                value={pcs}
                onChange={(e) => {
                  setPcs(e.target.value);
                  setErrors((x) => ({ ...x, pcs: undefined }));
                }}
                inputMode="decimal"
                placeholder="0"
                disabled={busy}
                className={inputCls}
              />
              {errors.pcs && (
                <span className="mt-1 block text-[11px] font-semibold text-red-600">
                  {errors.pcs}
                </span>
              )}
            </label>

            <label className="block max-w-[280px]">
              <span className="mb-1 block text-[13px] font-semibold text-[#44546F]">
                Berat (kg){isInjectCreate && autoBeratInject != null ? " — otomatis" : ""}
              </span>
              <span className="relative block">
                <input
                  value={
                    isInjectCreate && autoBeratInject != null
                      ? autoBeratInject.toFixed(3)
                      : berat
                  }
                  onChange={(e) => {
                    setBerat(e.target.value);
                    setErrors((x) => ({ ...x, berat: undefined }));
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  disabled={busy || (isInjectCreate && autoBeratInject != null)}
                  className={`${inputCls} pr-10`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#6B778C]">
                  kg
                </span>
              </span>
              {errors.berat && (
                <span className="mt-1 block text-[11px] font-semibold text-red-600">
                  {errors.berat}
                </span>
              )}
            </label>

            {!isEdit && (
              <fieldset className="block">
                <legend className="mb-1.5 block text-[13px] font-semibold text-[#44546F]">
                  Mode Cetak
                </legend>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { value: "single", label: "Single" },
                      { value: "multiple", label: "Multiple" },
                      { value: "quick", label: "Quick" },
                    ] as const
                  ).map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setPrintMode(pm.value)}
                      className="rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition"
                      style={
                        printMode === pm.value
                          ? {
                              backgroundColor: "rgba(21,101,192,0.10)",
                              borderColor: "rgba(21,101,192,0.35)",
                              color: "#1565C0",
                            }
                          : {
                              backgroundColor: "#F3F4F6",
                              borderColor: "#DCDFE4",
                              color: "#44546F",
                            }
                      }
                    >
                      {pm.label}
                    </button>
                  ))}
                  {printMode === "quick" && (
                    <span className="ml-1 inline-flex items-center gap-1.5">
                      <input
                        value={quickCount}
                        onChange={(e) => {
                          setQuickCount(e.target.value);
                          setErrors((x) => ({ ...x, quickCount: undefined }));
                        }}
                        inputMode="numeric"
                        disabled={busy}
                        className="h-8 w-16 rounded-lg border border-[#DCDFE4] bg-[#F7F8F9] px-2 text-center text-[13px] font-bold text-[#172B4D] outline-none focus:border-[#1565C0]"
                      />
                      <span className="text-[12px] font-semibold text-[#6B778C]">label</span>
                    </span>
                  )}
                </div>
                {errors.quickCount && (
                  <span className="mt-1 block text-[11px] font-semibold text-red-600">
                    {errors.quickCount}
                  </span>
                )}
              </fieldset>
            )}

            {formError && (
              <div
                className="rounded-xl border border-red-200 px-3.5 py-2.5"
                style={{ backgroundColor: "#FEF2F2" }}
              >
                <p className="whitespace-pre-line text-[12px] leading-relaxed text-red-700">
                  {formError}
                </p>
              </div>
            )}
          </div>

          <div className="hidden w-px shrink-0 bg-[#E4E6EB] md:block" />

          <div className="flex w-full shrink-0 flex-col md:w-[240px]">
            <div className="min-h-[220px] flex-1">
              <LfwOutputPanel
                title="Output Furniture WIP"
                items={outputs}
                isLoading={loadingOutputs}
                hasSource={!isEdit && noProduksi !== ""}
                noSourceMessage={
                  modeIsInject
                    ? "Pilih No Inject untuk melihat output"
                    : `Pilih ${modeMeta.sourceLabel}\nuntuk melihat output`
                }
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#EBECF0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[#DCDFE4] px-5 py-2.5 text-[13px] font-bold text-[#44546F] transition hover:bg-gray-50 disabled:opacity-50"
          >
            BATAL
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-55"
            style={{ backgroundColor: isEdit ? "#F57C00" : "#00897B" }}
          >
            {busy && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
            SIMPAN
          </button>
        </div>
      </form>
    </div>
  );
}
