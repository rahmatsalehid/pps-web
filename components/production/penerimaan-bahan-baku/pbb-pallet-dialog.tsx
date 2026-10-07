"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PbbFormOptions,
  PbbKodeKategori,
  PbbOutput,
  PbbPotongan,
  PbbQcPayload,
} from "@/services/penerimaan-bahan-baku-service";
import {
  addPbbSaksAction,
  deletePbbPalletAction,
  deletePbbSakAction,
  getPbbFormOptionsAction,
  getPbbPotonganAction,
  updatePbbPalletAction,
  updatePbbQcAction,
} from "@/app/(app)/production/penerimaan-bahan-baku/actions";
import { printBsLabelAction } from "@/app/(app)/operasional/bongkar-susun/actions";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import { Loader2Icon } from "@/components/dashboard/icons";
import { CloseIcon, LabelIcon } from "./pbb-icons";
import { applyPotongan, fmt } from "./pbb-potongan";
import { ScaleConnection, isWebSerialSupported, webSerialUnsupportedReason } from "./pbb-scale";
import { useScaleDisplay, type DisplayState } from "./pbb-display";

const BORDER = "#E2E6EA";

export type PbbPalletView = {
  noBahanBaku: string;
  noPallet: number;
  saks: PbbOutput[];
};

type Mode = "view" | "edit" | "addSak" | "qc";

const QC_FIELDS: { key: keyof PbbQcPayload; label: string; src: keyof PbbOutput }[] = [
  { key: "Moisture", label: "Moisture", src: "moisture" },
  { key: "MeltingIndex", label: "Melting Index", src: "meltingIndex" },
  { key: "Elasticity", label: "Elasticity", src: "elasticity" },
  { key: "Tenggelam", label: "Tenggelam (%)", src: "tenggelam" },
  { key: "Density", label: "Density 1", src: "density" },
  { key: "Density2", label: "Density 2", src: "density2" },
  { key: "Density3", label: "Density 3", src: "density3" },
];

function parseNum(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function PbbPalletDialog({
  noPenerimaan,
  row,
  color,
  idSupplier,
  supplierName,
  totals,
  editable,
  onClose,
  onChanged,
}: {
  noPenerimaan: string;
  row: PbbPalletView;
  color: string;
  idSupplier: number | null;
  supplierName: string | null;
  totals: {
    jmlhPallet: number;
    jmlhSak: number;
    jmlhKg: number;
  } | null;
  /** false bila penerimaan sudah selesai */
  editable: boolean;
  onClose: () => void;
  /** dipanggil setelah ada perubahan data (reload detail) */
  onChanged: () => void;
}) {
  const kodeKategori: PbbKodeKategori = row.noBahanBaku.startsWith("AB.")
    ? "bahanbakupakai"
    : "bahanbaku";
  const meta = row.saks[0];
  const anyUsed = row.saks.some((s) => s.dateUsage);
  const totalBerat = row.saks.reduce((sum, s) => sum + s.berat, 0);

  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Ubah pallet
  const [options, setOptions] = useState<PbbFormOptions | null>(null);
  const [idJenis, setIdJenis] = useState(meta?.idJenisPlastik ?? 0);
  const [keterangan, setKeterangan] = useState(meta?.keterangan ?? "");

  // Tambah sak
  const [potongan, setPotongan] = useState<PbbPotongan | null>(null);
  const [beratText, setBeratText] = useState("");
  const [isLembab, setIsLembab] = useState(false);

  // Timbangan (opsional, sama seperti form input)
  const scaleRef = useRef<ScaleConnection | null>(null);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleActive, setScaleActive] = useState(false);
  const [scaleMessage, setScaleMessage] = useState<string | null>(null);
  const [lastKg, setLastKg] = useState<number | null>(null);
  const [lastBerat, setLastBerat] = useState<number | null>(null);
  const serialSupported = useMemo(() => isWebSerialSupported(), []);

  const displayState = useMemo<DisplayState>(
    () => ({
      supplier: supplierName ?? "",
      noPenerimaan,
      palletKe: row.noPallet,
      jmlhPallet: totals?.jmlhPallet ?? 1,
      jmlhSak: totals?.jmlhSak ?? row.saks.length,
      jmlhKg: totals?.jmlhKg ?? totalBerat,
      saks: row.saks.map((s) => ({
        noSak: s.noSak,
        jam: "-",
        berat: s.berat,
        kondisi: s.isLembab ? "LEMBAB" : "KERING",
      })),
      weight:
        lastBerat ?? (row.saks.length > 0 ? row.saks[row.saks.length - 1].berat : null),
      connected: scaleConnected,
      active: scaleActive,
    }),
    [
      supplierName,
      noPenerimaan,
      row,
      totals,
      totalBerat,
      lastBerat,
      scaleConnected,
      scaleActive,
    ],
  );

  const { openDisplay, closeDisplay } = useScaleDisplay(displayState);

  // QC
  const [qc, setQc] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of QC_FIELDS) {
      const v = meta?.[f.src] as number | null | undefined;
      init[f.key] = v == null ? "" : String(v);
    }
    return init;
  });

  useEffect(() => {
    if (mode !== "edit" || options) return;
    let cancelled = false;
    void (async () => {
      const res = await getPbbFormOptionsAction(kodeKategori);
      if (cancelled) return;
      if (res.ok) setOptions(res.options);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, options, kodeKategori]);

  useEffect(() => {
    if (mode !== "addSak" || potongan || !idSupplier) return;
    let cancelled = false;
    void (async () => {
      const res = await getPbbPotonganAction(idSupplier);
      if (cancelled) return;
      if (res.ok) setPotongan(res.potongan);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, potongan, idSupplier]);

  async function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done: string,
    close = false,
    stay = false,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice(done);
    onChanged();
    if (close) onClose();
    else if (!stay) setMode("view");
  }

  async function saveEdit() {
    if (!idJenis) return setError("Pilih jenis bahan baku");
    await run(
      () =>
        updatePbbPalletAction(noPenerimaan, row.noBahanBaku, row.noPallet, {
          idJenisPlastik: idJenis,
          keterangan: keterangan.trim() || null,
        }),
      "Pallet berhasil diubah",
    );
  }

  async function addSakValue(act: number) {
    if (!(act > 0)) return setError("Berat tidak valid");
    if (!potongan) return setError("Aturan potongan supplier belum dimuat");
    const berat = applyPotongan(act, potongan);
    setLastBerat(berat);
    await run(
      () => addPbbSaksAction(noPenerimaan, row.noBahanBaku, row.noPallet, [{ berat, beratAct: act, isLembab }]),
      "Sak berhasil ditambahkan",
      false,
      true,
    );
  }

  async function saveSak() {
    const act = parseNum(beratText);
    if (act == null || Number.isNaN(act)) return setError("Berat tidak valid");
    await addSakValue(act);
    setBeratText("");
  }

  // Callback timbangan memakai ref agar selalu memanggil versi terbaru.
  const addSakRef = useRef(addSakValue);
  const scaleActiveRef = useRef(scaleActive);
  const busyRef = useRef(busy);
  useEffect(() => {
    addSakRef.current = addSakValue;
    scaleActiveRef.current = scaleActive;
    busyRef.current = busy;
  });

  useEffect(() => {
    return () => {
      void scaleRef.current?.disconnect();
    };
  }, []);

  async function toggleConnect() {
    if (scaleConnected) {
      await scaleRef.current?.disconnect();
      scaleRef.current = null;
      setScaleConnected(false);
      setScaleActive(false);
      closeDisplay();
      return;
    }
    try {
      const conn = new ScaleConnection(
        (kg) => {
          setLastKg(kg);
          if (scaleActiveRef.current && !busyRef.current) void addSakRef.current(kg);
        },
        (err) => {
          setScaleConnected(false);
          setScaleActive(false);
          setScaleMessage(err ? `Timbangan terputus: ${err}` : "Timbangan terputus");
          closeDisplay();
        },
      );
      const connecting = conn.connect();
      openDisplay();
      await connecting;
      scaleRef.current = conn;
      setScaleConnected(true);
      setScaleMessage(null);
    } catch (e) {
      closeDisplay();
      setScaleMessage(e instanceof Error ? e.message : "Gagal menghubungkan timbangan");
    }
  }

  async function saveQc() {
    const payload = {} as PbbQcPayload;
    for (const f of QC_FIELDS) {
      const n = parseNum(qc[f.key] ?? "");
      if (Number.isNaN(n)) return setError(`${f.label} harus berupa angka`);
      payload[f.key] = n;
    }
    await run(() => updatePbbQcAction(row.noBahanBaku, row.noPallet, payload), "Hasil QC tersimpan");
  }

  async function removePallet() {
    setConfirmDelete(false);
    await run(
      () => deletePbbPalletAction(noPenerimaan, row.noBahanBaku, row.noPallet),
      "Pallet dihapus",
      true,
    );
  }

  async function printLabel() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const labelCode = `${row.noBahanBaku}-${row.noPallet}`;
    const res = await printBsLabelAction({
      path: `bahan-baku/${encodeURIComponent(row.noBahanBaku)}/pallet/${row.noPallet}`,
      lockCode: labelCode,
      labelCode,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    printPdfBase64(res.pdfBase64, labelCode);
    onChanged();
  }

  const inputCls =
    "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]";
  const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-3.5">
          <span className="grid place-items-center rounded-lg p-1.5" style={{ backgroundColor: `${color}1A`, color }}>
            <LabelIcon className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#1F2937]">{meta?.namaJenisPlastik ?? "-"}</p>
            <p className="truncate text-[11px] text-gray-500">
              {row.noBahanBaku}-{row.noPallet}
              {meta && meta.hasBeenPrinted > 0 ? ` • dicetak ${meta.hasBeenPrinted}x` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#9CA3AF] hover:bg-gray-100" aria-label="Tutup">
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="h-px" style={{ backgroundColor: BORDER }} />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
          {meta?.keterangan && mode === "view" && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Keterangan: {meta.keterangan}</p>
          )}

          {mode === "edit" && (
            <div className="space-y-2.5 rounded-xl border p-3" style={{ borderColor: BORDER }}>
              <select value={idJenis} onChange={(e) => setIdJenis(Number(e.target.value))} className={inputCls} style={{ borderColor: BORDER }}>
                <option value={0}>PILIH JENIS</option>
                {(options?.jenis ?? []).map((j) => (
                  <option key={j.idBB} value={j.idBB}>
                    {j.nama}
                  </option>
                ))}
              </select>
              <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} maxLength={200} placeholder="Keterangan (opsional)" className={inputCls} style={{ borderColor: BORDER }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode("view")} className={`${btn} flex-1 border`} style={{ borderColor: BORDER }}>
                  Batal
                </button>
                <button type="button" onClick={() => void saveEdit()} disabled={busy} className={`${btn} flex-1 text-white`} style={{ backgroundColor: color }}>
                  Simpan
                </button>
              </div>
            </div>
          )}

          {mode === "addSak" && (
            <div className="space-y-2.5 rounded-xl border p-3" style={{ borderColor: BORDER }}>
              {serialSupported ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void toggleConnect()} className={`${btn} border`} style={{ borderColor: BORDER }}>
                      {scaleConnected ? "Putuskan Timbangan" : "Hubungkan Timbangan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleActive((v) => !v)}
                      disabled={!scaleConnected || !potongan}
                      className={`${btn} text-white disabled:bg-gray-200 disabled:text-gray-400`}
                      style={scaleConnected && potongan ? { backgroundColor: scaleActive ? "#DC2626" : color } : undefined}
                    >
                      {scaleActive ? "Stop" : "Mulai (otomatis)"}
                    </button>
                  </div>
                  {scaleConnected && (
                    <button type="button" onClick={() => openDisplay()} className={`${btn} w-full border`} style={{ borderColor: BORDER }}>
                      Tampilkan Display
                    </button>
                  )}
                  {scaleConnected && lastKg != null && (
                    <p className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-center text-[11px] text-gray-500">
                      Timbangan: <span className="text-lg font-bold text-[#111827]">{fmt(lastKg)}</span> Kg
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                  {webSerialUnsupportedReason()} Berat tetap bisa diisi manual.
                </p>
              )}
              {scaleActive && (
                <p className="rounded-lg bg-green-50 px-2.5 py-2 text-[11px] text-green-700">
                  Menunggu timbangan… setiap hasil timbang langsung ditambahkan sebagai sak baru.
                </p>
              )}
              {scaleMessage && <p className="rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">{scaleMessage}</p>}
              <input
                autoFocus
                inputMode="decimal"
                value={beratText}
                onChange={(e) => setBeratText(e.target.value.replace(/[^0-9.,]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveSak();
                }}
                placeholder="Berat timbangan (kg)"
                className={inputCls}
                style={{ borderColor: BORDER }}
              />
              <div className="grid grid-cols-2 gap-1.5">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIsLembab(v)}
                    className="h-8 rounded-lg border text-xs font-bold"
                    style={isLembab === v ? { backgroundColor: color, borderColor: color, color: "#fff" } : { borderColor: BORDER, color: "#4B5563" }}
                  >
                    {v ? "LEMBAB" : "KERING"}
                  </button>
                ))}
              </div>
              {potongan && (
                <p className="text-[10px] text-gray-500">
                  {potongan.mode === "tetap" ? `Potongan supplier: ${potongan.percent}%` : `Potongan acak ${potongan.lower / 10}%–${potongan.upper / 10}%`}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode("view")} className={`${btn} flex-1 border`} style={{ borderColor: BORDER }}>
                  Batal
                </button>
                <button type="button" onClick={() => void saveSak()} disabled={busy || !potongan} className={`${btn} flex-1 text-white`} style={{ backgroundColor: color }}>
                  Tambah Sak
                </button>
              </div>
            </div>
          )}

          {mode === "qc" && (
            <div className="space-y-2.5 rounded-xl border p-3" style={{ borderColor: BORDER }}>
              <div className="grid grid-cols-2 gap-2.5">
                {QC_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[11px] font-medium text-gray-600">{f.label}</span>
                    <input
                      inputMode="decimal"
                      value={qc[f.key] ?? ""}
                      onChange={(e) => setQc((p) => ({ ...p, [f.key]: e.target.value.replace(/[^0-9.,-]/g, "") }))}
                      className={inputCls}
                      style={{ borderColor: BORDER }}
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode("view")} className={`${btn} flex-1 border`} style={{ borderColor: BORDER }}>
                  Batal
                </button>
                <button type="button" onClick={() => void saveQc()} disabled={busy} className={`${btn} flex-1 text-white`} style={{ backgroundColor: color }}>
                  Simpan QC
                </button>
              </div>
            </div>
          )}

          {mode === "view" && (
            <>
              {row.saks.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">Belum ada sak</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {row.saks.map((s) => (
                    <div key={s.noSak} className="relative flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-[#A5D6A7] bg-[#E8F5E9] px-1 py-2">
                      <span className="text-[13px] font-extrabold text-[#00695C]">Sak {s.noSak}</span>
                      <span className="mt-0.5 text-[11px] font-semibold text-[#374151]">{fmt(s.berat)} kg</span>
                      <span className="text-[9px] text-gray-500">{s.isLembab ? "LEMBAB" : "KERING"}</span>
                      {s.dateUsage && <span className="text-[9px] font-bold text-orange-600">TERPAKAI</span>}
                      {editable && !s.dateUsage && row.saks.length > 1 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => deletePbbSakAction(noPenerimaan, row.noBahanBaku, row.noPallet, s.noSak),
                              `Sak ${s.noSak} dihapus`,
                            )
                          }
                          className="absolute right-1 top-1 rounded bg-white/80 p-0.5 text-red-400 hover:bg-red-50 disabled:opacity-50"
                          aria-label={`Hapus sak ${s.noSak}`}
                        >
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {meta && QC_FIELDS.some((f) => meta[f.src] != null) && (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                  QC:{" "}
                  {QC_FIELDS.filter((f) => meta[f.src] != null)
                    .map((f) => `${f.label} ${meta[f.src] as number}`)
                    .join(" • ")}
                </p>
              )}
            </>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {notice && !error && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{notice}</p>}
        </div>

        <div className="h-px" style={{ backgroundColor: BORDER }} />
        <div className="space-y-2.5 px-[18px] py-[11px]">
          <p className="text-xs font-bold" style={{ color }}>
            {`Total: ${row.saks.length} sak  ·  ${fmt(totalBerat)} kg`}
          </p>
          {mode === "view" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void printLabel()} disabled={busy} className={`${btn} border`} style={{ borderColor: BORDER }}>
                {busy ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : null} Cetak Label
              </button>
              <button type="button" onClick={() => setMode("qc")} className={`${btn} border`} style={{ borderColor: BORDER }}>
                Input QC
              </button>
              {editable && (
                <>
                  <button type="button" onClick={() => setMode("edit")} className={`${btn} border`} style={{ borderColor: BORDER }}>
                    Ubah
                  </button>
                  <button type="button" onClick={() => setMode("addSak")} disabled={!idSupplier} className={`${btn} border`} style={{ borderColor: BORDER }}>
                    + Sak
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={anyUsed}
                    title={anyUsed ? "Ada sak yang sudah terpakai" : undefined}
                    className={`${btn} ml-auto bg-red-50 text-red-600`}
                  >
                    Hapus Pallet
                  </button>
                </>
              )}
            </div>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="flex-1 text-xs text-red-700">Hapus pallet {row.noPallet} beserta semua sak-nya?</p>
              <button type="button" onClick={() => setConfirmDelete(false)} className={`${btn} border bg-white`} style={{ borderColor: BORDER }}>
                Batal
              </button>
              <button type="button" onClick={() => void removePallet()} disabled={busy} className={`${btn} bg-red-600 text-white`}>
                Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
