"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PbbFormOptions,
  PbbKodeKategori,
  PbbPotongan,
  PbbSakPayload,
} from "@/services/penerimaan-bahan-baku-service";
import {
  addPbbPalletsAction,
  getPbbFormOptionsAction,
  getPbbPotonganAction,
} from "@/app/(app)/production/penerimaan-bahan-baku/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { AddIcon, CloseIcon, ScaleIcon } from "./pbb-icons";
import { PbbStatusDialog } from "./pbb-status-dialog";
import { ScaleConnection, isWebSerialSupported, webSerialUnsupportedReason } from "./pbb-scale";
import { applyPotongan, fmt } from "./pbb-potongan";

const BORDER = "#E2E6EA";

type SakRow = PbbSakPayload;

type PalletRow = {
  id: number;
  idJenis: number;
  keterangan: string;
  saks: SakRow[];
};

export function PbbEntryDialog({
  noPenerimaan,
  kodeKategori,
  onClose,
  onSaved,
}: {
  noPenerimaan: string;
  kodeKategori: PbbKodeKategori;
  onClose: () => void;
  onSaved: (noBahanBaku: string) => void;
}) {
  const label = kodeKategori === "bahanbakupakai" ? "Bahan Baku Pakai" : "Bahan Baku Proses";
  const accent = kodeKategori === "bahanbakupakai" ? "#00695C" : "#0D47A1";

  const [options, setOptions] = useState<PbbFormOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [idSupplier, setIdSupplier] = useState(0);
  const [noPlat, setNoPlat] = useState("");
  const [potongan, setPotongan] = useState<PbbPotongan | null>(null);
  const [potonganError, setPotonganError] = useState<string | null>(null);

  const [pallets, setPallets] = useState<PalletRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const nextPalletId = useRef(1);

  const [isLembab, setIsLembab] = useState(false);
  const [beratText, setBeratText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Timbangan
  const scaleRef = useRef<ScaleConnection | null>(null);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleActive, setScaleActive] = useState(false);
  const [scaleMessage, setScaleMessage] = useState<string | null>(null);
  const serialSupported = useMemo(() => isWebSerialSupported(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getPbbFormOptionsAction(kodeKategori);
      if (cancelled) return;
      if (res.ok) setOptions(res.options);
      else setLoadError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [kodeKategori]);

  useEffect(() => {
    if (!idSupplier) return;
    let cancelled = false;
    void (async () => {
      const res = await getPbbPotonganAction(idSupplier);
      if (cancelled) return;
      if (res.ok) {
        setPotongan(res.potongan);
        setPotonganError(null);
      } else {
        setPotongan(null);
        setPotonganError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idSupplier]);

  useEffect(() => {
    return () => {
      void scaleRef.current?.disconnect();
    };
  }, []);

  const activePallet = pallets.find((p) => p.id === activeId) ?? null;
  const totalSak = pallets.reduce((s, p) => s + p.saks.length, 0);
  const totalKg = pallets.reduce(
    (s, p) => s + p.saks.reduce((x, k) => x + k.berat, 0),
    0,
  );

  const addPallet = useCallback(() => {
    const id = nextPalletId.current++;
    setPallets((prev) => [...prev, { id, idJenis: 0, keterangan: "", saks: [] }]);
    setActiveId(id);
  }, []);

  const patchPallet = (id: number, patch: Partial<PalletRow>) =>
    setPallets((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePallet = (id: number) => {
    setPallets((prev) => prev.filter((p) => p.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const addSak = useCallback(
    (beratAct: number): boolean => {
      if (!activePallet) {
        setFormError("Pilih atau tambah pallet terlebih dahulu");
        return false;
      }
      if (!activePallet.idJenis) {
        setFormError("Pilih jenis bahan baku pada pallet terlebih dahulu");
        return false;
      }
      if (!potongan) {
        setFormError("Pilih supplier terlebih dahulu (aturan potongan belum dimuat)");
        return false;
      }
      if (!(beratAct > 0)) {
        setFormError("Berat tidak valid");
        return false;
      }
      setFormError(null);
      const berat = applyPotongan(beratAct, potongan);
      setPallets((prev) =>
        prev.map((p) => {
          if (p.id !== activePallet.id) return p;
          const noSak = p.saks.length === 0 ? 1 : Math.max(...p.saks.map((s) => s.noSak)) + 1;
          return { ...p, saks: [...p.saks, { noSak, berat, beratAct, isLembab }] };
        }),
      );
      return true;
    },
    [activePallet, potongan, isLembab],
  );

  // Callback timbangan memakai ref agar selalu memanggil addSak terbaru.
  const addSakRef = useRef(addSak);
  const scaleActiveRef = useRef(scaleActive);
  useEffect(() => {
    addSakRef.current = addSak;
    scaleActiveRef.current = scaleActive;
  });

  async function toggleConnect() {
    if (scaleConnected) {
      await scaleRef.current?.disconnect();
      scaleRef.current = null;
      setScaleConnected(false);
      setScaleActive(false);
      return;
    }
    try {
      const conn = new ScaleConnection(
        (kg) => {
          if (scaleActiveRef.current) addSakRef.current(kg);
        },
        (err) => {
          setScaleConnected(false);
          setScaleActive(false);
          setScaleMessage(err ? `Timbangan terputus: ${err}` : "Timbangan terputus");
        },
      );
      await conn.connect();
      scaleRef.current = conn;
      setScaleConnected(true);
      setScaleMessage(null);
    } catch (e) {
      setScaleMessage(e instanceof Error ? e.message : "Gagal menghubungkan timbangan");
    }
  }

  function addManual() {
    const n = parseFloat(beratText.replace(",", "."));
    if (addSak(n)) setBeratText("");
  }

  function removeSak(palletId: number, noSak: number) {
    setPallets((prev) =>
      prev.map((p) =>
        p.id === palletId
          ? {
              ...p,
              saks: p.saks.filter((s) => s.noSak !== noSak).map((s, i) => ({ ...s, noSak: i + 1 })),
            }
          : p,
      ),
    );
  }

  async function save() {
    if (saving) return;
    if (!idSupplier) return setFormError("Supplier belum dipilih");
    if (!noPlat.trim()) return setFormError("No Plat belum diisi");
    if (pallets.length === 0) return setFormError("Tambah minimal 1 pallet");
    for (const [i, p] of pallets.entries()) {
      if (!p.idJenis) return setFormError(`Pallet ${i + 1}: jenis belum dipilih`);
      if (p.saks.length === 0) return setFormError(`Pallet ${i + 1}: belum ada sak`);
    }
    setFormError(null);
    setSaving(true);
    const res = await addPbbPalletsAction(noPenerimaan, {
      idSupplier,
      noPlat: noPlat.trim(),
      kodeKategori,
      pallets: pallets.map((p) => ({
        idJenisPlastik: p.idJenis,
        keterangan: p.keterangan.trim() || null,
        saks: p.saks,
      })),
    });
    setSaving(false);
    if (res.ok) {
      await scaleRef.current?.disconnect();
      onSaved(res.noBahanBaku);
    } else {
      setSaveError(res.error);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:border-[#00897B] focus:ring-1 focus:ring-[#00897B] disabled:bg-gray-50";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
        <div className="flex max-h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div
            className="flex shrink-0 items-center gap-2.5 px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <p className="min-w-0 flex-1 truncate text-[15px] font-bold">
              Input {label} • {noPenerimaan}
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded bg-white/15 p-1 hover:bg-white/25 disabled:opacity-50"
              aria-label="Tutup"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {loadError ? (
            <p className="p-6 text-sm text-red-700">Gagal memuat opsi form: {loadError}</p>
          ) : !options ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">Supplier</span>
                    <select
                      value={idSupplier}
                      onChange={(e) => {
                        setPotongan(null);
                        setPotonganError(null);
                        setIdSupplier(Number(e.target.value));
                      }}
                      disabled={pallets.some((p) => p.saks.length > 0)}
                      className={inputCls}
                      style={{ borderColor: BORDER }}
                    >
                      <option value={0}>PILIH SUPPLIER</option>
                      {options.suppliers.map((s) => (
                        <option key={s.idSupplier} value={s.idSupplier}>
                          {s.namaSupplier}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">No Plat</span>
                    <input
                      value={noPlat}
                      onChange={(e) => setNoPlat(e.target.value.toUpperCase())}
                      maxLength={20}
                      className={inputCls}
                      style={{ borderColor: BORDER }}
                    />
                  </label>
                </div>
                {potonganError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {potonganError}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1F2937]">Pallet</span>
                  <span className="text-xs text-gray-500">
                    {pallets.length} pallet • {totalSak} sak • {fmt(totalKg)} kg
                    {options.maxSak > 0 && ` • maks ${options.maxSak} sak/pallet`}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={addPallet}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <AddIcon className="h-4 w-4" /> Tambah Pallet
                  </button>
                </div>

                {pallets.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
                    Belum ada pallet
                  </p>
                )}

                {pallets.map((p, i) => {
                  const active = p.id === activeId;
                  const sub = p.saks.reduce((s, k) => s + k.berat, 0);
                  return (
                    <div
                      key={p.id}
                      className="overflow-hidden rounded-xl border bg-white"
                      style={{ borderColor: active ? accent : BORDER }}
                    >
                      <div
                        className="flex cursor-pointer items-center gap-2 px-3 py-2"
                        style={{ backgroundColor: active ? `${accent}14` : "#F9FAFB" }}
                        onClick={() => setActiveId(p.id)}
                      >
                        <span className="text-xs font-bold" style={{ color: accent }}>
                          Pallet {i + 1}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {p.saks.length} sak • {fmt(sub)} kg
                        </span>
                        {active && (
                          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold" style={{ color: accent }}>
                            AKTIF
                          </span>
                        )}
                        <span className="flex-1" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePallet(p.id);
                          }}
                          className="rounded bg-red-50 p-1 text-red-400 hover:bg-red-100"
                          aria-label={`Hapus pallet ${i + 1}`}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-3 p-3 sm:grid-cols-2">
                        <select
                          value={p.idJenis}
                          onChange={(e) => patchPallet(p.id, { idJenis: Number(e.target.value) })}
                          className={inputCls}
                          style={{ borderColor: BORDER }}
                        >
                          <option value={0}>PILIH JENIS</option>
                          {options.jenis.map((j) => (
                            <option key={j.idBB} value={j.idBB}>
                              {j.nama}
                            </option>
                          ))}
                        </select>
                        <input
                          value={p.keterangan}
                          onChange={(e) => patchPallet(p.id, { keterangan: e.target.value })}
                          placeholder="Keterangan (opsional)"
                          maxLength={200}
                          className={inputCls}
                          style={{ borderColor: BORDER }}
                        />
                      </div>
                      {p.saks.length > 0 && (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 text-gray-500">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-semibold">Sak</th>
                              <th className="px-3 py-1.5 text-right font-semibold">Berat</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Kondisi</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {p.saks.map((s) => (
                              <tr key={s.noSak} className="border-t" style={{ borderColor: BORDER }}>
                                <td className="px-3 py-1.5 font-bold">{s.noSak}</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{fmt(s.berat)}</td>
                                <td className="px-3 py-1.5">{s.isLembab ? "LEMBAB" : "KERING"}</td>
                                <td className="pr-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeSak(p.id, s.noSak)}
                                    className="rounded p-1 text-red-400 hover:bg-red-50"
                                    aria-label={`Hapus sak ${s.noSak}`}
                                  >
                                    <CloseIcon className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>

              <aside
                className="h-fit space-y-3 rounded-xl border p-3.5 lg:sticky lg:top-0"
                style={{ borderColor: BORDER }}
              >
                <div className="flex items-center gap-2">
                  <ScaleIcon className="h-4 w-4" style={{ color: accent }} />
                  <span className="text-sm font-bold text-[#1F2937]">Timbangan</span>
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: scaleConnected ? "#DCFCE7" : "#F3F4F6",
                      color: scaleConnected ? "#16A34A" : "#6B7280",
                    }}
                  >
                    {scaleConnected ? "Terhubung" : "Belum terhubung"}
                  </span>
                </div>

                {serialSupported ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void toggleConnect()}
                      className="h-9 w-full rounded-lg border text-xs font-bold text-gray-700 hover:bg-gray-50"
                      style={{ borderColor: BORDER }}
                    >
                      {scaleConnected ? "Putuskan Timbangan" : "Hubungkan Timbangan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleActive((v) => !v)}
                      disabled={!scaleConnected}
                      className="h-9 w-full rounded-lg text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
                      style={scaleConnected ? { backgroundColor: scaleActive ? "#DC2626" : accent } : undefined}
                    >
                      {scaleActive ? "Stop (berhenti baca otomatis)" : "Mulai (tambah sak otomatis)"}
                    </button>
                    {scaleActive && (
                      <p className="rounded-lg bg-green-50 px-2.5 py-2 text-[11px] text-green-700">
                        Menunggu timbangan… setiap hasil timbang ditambahkan sebagai sak
                        baru di pallet aktif.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                    {webSerialUnsupportedReason()} Berat tetap bisa diisi manual.
                  </p>
                )}
                {scaleMessage && (
                  <p className="rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">{scaleMessage}</p>
                )}

                <div className="border-t pt-3" style={{ borderColor: BORDER }}>
                  <p className="mb-1.5 text-xs font-medium text-gray-600">Kondisi sak berikutnya</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[false, true].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setIsLembab(v)}
                        className="h-8 rounded-lg border text-xs font-bold"
                        style={
                          isLembab === v
                            ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                            : { borderColor: BORDER, color: "#4B5563" }
                        }
                      >
                        {v ? "LEMBAB" : "KERING"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3" style={{ borderColor: BORDER }}>
                  <p className="mb-1.5 text-xs font-medium text-gray-600">Input berat manual (kg)</p>
                  <div className="flex gap-1.5">
                    <input
                      inputMode="decimal"
                      value={beratText}
                      onChange={(e) => setBeratText(e.target.value.replace(/[^0-9.,]/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addManual();
                      }}
                      placeholder="0.00"
                      className={inputCls}
                      style={{ borderColor: BORDER }}
                    />
                    <button
                      type="button"
                      onClick={addManual}
                      className="shrink-0 rounded-lg px-3 text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Tambah Sak
                    </button>
                  </div>
                  {potongan && (
                    <p className="mt-1.5 text-[10px] text-gray-500">
                      {potongan.mode === "tetap"
                        ? `Potongan supplier: ${potongan.percent}%`
                        : `Potongan acak ${potongan.lower / 10}%–${potongan.upper / 10}%`}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}

          {formError && (
            <p className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div
            className="flex shrink-0 items-center justify-end gap-3 border-t px-4 py-3"
            style={{ borderColor: BORDER }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: BORDER }}
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !options}
              className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {saving ? "MENYIMPAN..." : "SIMPAN"}
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <PbbStatusDialog
          type="error"
          title="Gagal Menyimpan"
          message={saveError}
          onClose={() => setSaveError(null)}
        />
      )}
    </>
  );
}
