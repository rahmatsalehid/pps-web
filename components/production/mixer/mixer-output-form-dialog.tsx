"use client";

import { useEffect, useState } from "react";
import {
  createMixerOutputAction,
  getMixerTypesAction,
} from "@/app/(app)/production/mixer/actions";
import type { MixerType } from "@/services/mixer-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

type SakEntry = { noSak: number; berat: number };

function formatDateShort(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-[11px]">
      <span className="text-gray-500">{label}:</span>
      <span className="font-bold text-gray-900">{value}</span>
    </span>
  );
}

export function MixerOutputFormDialog({
  noProduksi,
  tanggal,
  tglProduksi,
  idJenis,
  namaJenis,
  namaMesin,
  onClose,
  onSaved,
}: {
  noProduksi: string;
  tanggal?: string | null;
  tglProduksi?: string | null;
  idJenis?: number | null;
  namaJenis?: string | null;
  namaMesin?: string;
  onClose: () => void;
  onSaved: (noMixer: string) => void;
}) {
  const dateSource = tanggal ?? tglProduksi ?? null;

  const [beratText, setBeratText] = useState("");
  const [jumlahText, setJumlahText] = useState("");
  const [beratErr, setBeratErr] = useState<string | null>(null);
  const [jumlahErr, setJumlahErr] = useState<string | null>(null);
  const [details, setDetails] = useState<SakEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [types, setTypes] = useState<MixerType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [jenisId, setJenisId] = useState<number | "">(idJenis ?? "");
  const [jenisErr, setJenisErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMixerTypesAction();
      if (cancelled) return;
      setTypesLoading(false);
      if (res.ok) {
        const enabled = res.types.filter((t) => t.isEnable !== false);
        setTypes(enabled);
        setJenisId((prev) => {
          if (prev !== "") return prev;
          if (enabled.length === 1 && enabled[0]) return enabled[0].idMixer;
          return prev;
        });
      } else {
        setTypesError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const jenisOptions: MixerType[] = [...types];
  if (jenisId !== "" && !jenisOptions.some((t) => t.idMixer === jenisId)) {
    jenisOptions.unshift({
      idMixer: jenisId,
      nama: namaJenis || `Jenis ${jenisId}`,
    });
  }
  const selectedJenisName =
    jenisId !== ""
      ? (jenisOptions.find((t) => t.idMixer === jenisId)?.nama ?? namaJenis ?? "")
      : (namaJenis ?? "");

  const maxSak = 999;
  const totalSak = details.length;
  const totalBerat = details.reduce((s, e) => s + e.berat, 0);
  const remaining = Math.max(0, maxSak - totalSak);

  function nextSakNo(): number {
    if (details.length === 0) return 1;
    return details.reduce((m, e) => Math.max(m, e.noSak), 0) + 1;
  }

  function commitAdd() {
    const berat = Number.parseFloat(beratText.trim().replace(",", "."));
    const jumlah = Number.parseInt(jumlahText.trim(), 10);

    const bErr = !Number.isFinite(berat) || berat <= 0 ? "Harus > 0" : null;
    const jErr =
      !Number.isInteger(jumlah) || jumlah <= 0
        ? "Minimal 1"
        : jumlah > remaining
          ? `Maks ${remaining}`
          : null;

    setBeratErr(bErr);
    setJumlahErr(jErr);
    if (bErr || jErr) return;

    const start = nextSakNo();
    const added: SakEntry[] = [];
    for (let i = 0; i < jumlah; i++) {
      added.push({ noSak: start + i, berat });
    }
    setDetails((p) => [...p, ...added]);
    setJumlahText("");
    setBeratErr(null);
    setJumlahErr(null);
    setSaveError(null);
  }

  async function save() {
    if (jenisId === "") {
      setJenisErr("Jenis mixer wajib dipilih");
      return;
    }
    if (details.length === 0) {
      setSaveError("Tambah minimal 1 sak terlebih dahulu.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const dateOnly =
      dateSource?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const res = await createMixerOutputAction(
      noProduksi,
      Number(jenisId),
      dateOnly,
      details.map((e) => ({ NoSak: e.noSak, Berat: e.berat })),
    );
    setSaving(false);
    if (res.status === "success") {
      onSaved(res.noMixer ?? res.noProduksi ?? "");
    } else {
      setSaveError(res.message ?? "Gagal menyimpan");
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center gap-2.5 px-5 py-3.5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `${OUTPUT_TEAL}1A`, color: OUTPUT_TEAL }}
            >
              🏭
            </span>
          <h2 className="flex-1 text-sm font-bold text-gray-900">
            Tambah Label Mixer
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 py-3"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <InfoChip label="No Produksi" value={noProduksi} />
          {namaMesin && <InfoChip label="Mesin" value={namaMesin} />}
          <InfoChip label="Tanggal" value={formatDateShort(dateSource)} />
          {selectedJenisName && <InfoChip label="Jenis" value={selectedJenisName} />}
        </div>

        <div
          className="space-y-2 px-5 py-3"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[11px] text-gray-500">
              Jenis mixer
            </label>
            <select
              value={jenisId}
              onChange={(e) => {
                setJenisId(e.target.value === "" ? "" : Number(e.target.value));
                setJenisErr(null);
              }}
              disabled={typesLoading}
              className={inputCls}
              style={{
                borderColor: jenisErr ? "#f87171" : BORDER,
                color: "#1F2937",
              }}
            >
              <option value="">
                {typesLoading
                  ? "Memuat jenis mixer…"
                  : typesError
                    ? "Gagal memuat jenis"
                    : "— Pilih jenis mixer —"}
              </option>
              {jenisOptions.map((t) => (
                <option key={t.idMixer} value={t.idMixer}>
                  {t.nama}
                </option>
              ))}
            </select>
            {jenisErr && (
              <p className="mt-0.5 text-[11px] text-red-600">{jenisErr}</p>
            )}
            {typesError && (
              <p className="mt-0.5 text-[11px] text-red-600">{typesError}</p>
            )}
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-0.5 block text-[11px] text-gray-500">
                Berat per sak (kg)
              </label>
              <input
                value={beratText}
                onChange={(e) => {
                  setBeratText(e.target.value.replace(/[^0-9.]/g, ""));
                  setBeratErr(null);
                }}
                inputMode="decimal"
                placeholder="0.00"
                className={inputCls}
                style={{
                  borderColor: beratErr ? "#f87171" : BORDER,
                  color: "#1F2937",
                }}
                autoFocus
              />
              {beratErr && (
                <p className="mt-0.5 text-[11px] text-red-600">{beratErr}</p>
              )}
            </div>
            <span className="mt-6 text-lg text-gray-300">×</span>
            <div className="min-w-0 flex-1">
              <label className="mb-0.5 block text-[11px] text-gray-500">
                Jumlah sak
              </label>
              <input
                value={jumlahText}
                onChange={(e) => {
                  setJumlahText(e.target.value.replace(/\D/g, ""));
                  setJumlahErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitAdd();
                  }
                }}
                inputMode="numeric"
                placeholder="1"
                className={inputCls}
                style={{
                  borderColor: jumlahErr ? "#f87171" : BORDER,
                  color: "#1F2937",
                }}
              />
              {jumlahErr && (
                <p className="mt-0.5 text-[11px] text-red-600">{jumlahErr}</p>
              )}
            </div>
            <button
              type="button"
              onClick={commitAdd}
              disabled={saving}
              className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-3.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: OUTPUT_TEAL }}
            >
              + Tambah
            </button>
          </div>
          {remaining < maxSak && remaining > 0 && (
            <p className="text-[11px] text-gray-500">
              Sisa kuota: {remaining} sak
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {details.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1.5 text-gray-400">
              <span className="text-2xl">📦</span>
              <span className="text-xs">Belum ada sak</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {details.map((e, i) => (
                <div
                  key={`${e.noSak}-${i}`}
                  className="relative rounded-lg border border-green-300 bg-green-50 p-2 text-center"
                >
                  <p className="text-[13px] font-extrabold text-[#00695C]">
                    Sak {e.noSak}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-gray-700">
                    {e.berat.toFixed(2)} kg
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDetails((p) => p.filter((_, idx) => idx !== i))
                    }
                    disabled={saving}
                    className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-400 text-[10px] leading-none text-white hover:bg-red-500 disabled:opacity-50"
                    title="Hapus"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {saveError && (
          <div
            className="mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {saveError}
          </div>
        )}

        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <span
            className="rounded-full border px-2.5 py-1 text-xs font-bold"
            style={{
              backgroundColor: `${OUTPUT_TEAL}14`,
              borderColor: `${OUTPUT_TEAL}33`,
              color: OUTPUT_TEAL,
            }}
          >
            {totalSak} sak · {totalBerat.toFixed(2)} kg
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 items-center rounded-lg border border-gray-300 px-4 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: OUTPUT_TEAL }}
            >
              {saving && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
