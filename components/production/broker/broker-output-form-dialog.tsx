"use client";

import { useEffect, useState } from "react";
import {
  createBrokerOutputAction,
  createBonggolanOutputAction,
  getStokBonggolanAction,
} from "@/app/(app)/production/broker/actions";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

type SakEntry = { noSak: number; berat: number };

type BonggolanTypeOption = { idBonggolan: number; nama: string };

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

export function BrokerOutputFormDialog({
  noProduksi,
  tglProduksi,
  idJenis,
  namaJenis,
  namaMesin,
  onClose,
  onSaved,
}: {
  noProduksi: string;
  tglProduksi: string | null;
  idJenis: number;
  namaJenis: string;
  namaMesin?: string;
  onClose: () => void;
  onSaved: (noBroker: string) => void;
}) {
  const [beratText, setBeratText] = useState("");
  const [jumlahText, setJumlahText] = useState("");
  const [beratErr, setBeratErr] = useState<string | null>(null);
  const [jumlahErr, setJumlahErr] = useState<string | null>(null);
  const [details, setDetails] = useState<SakEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    if (details.length === 0) {
      setSaveError("Tambah minimal 1 sak terlebih dahulu.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const dateOnly =
      tglProduksi?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const res = await createBrokerOutputAction(
      noProduksi,
      idJenis,
      dateOnly,
      details.map((e) => ({ NoSak: e.noSak, Berat: e.berat })),
    );
    setSaving(false);
    if (res.status === "success") {
      onSaved(res.noProduksi ?? "");
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
            Tambah Label Broker
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
          <InfoChip label="Tanggal" value={formatDateShort(tglProduksi)} />
          <InfoChip label="Jenis" value={namaJenis} />
        </div>

        <div
          className="space-y-2 px-5 py-3"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
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

export function BonggolanOutputFormDialog({
  noProduksi,
  tglProduksi,
  namaMesin,
  onClose,
  onSaved,
}: {
  noProduksi: string;
  tglProduksi: string | null;
  namaMesin?: string;
  onClose: () => void;
  onSaved: (noBonggolan: string) => void;
}) {
  const [beratText, setBeratText] = useState("");
  const [beratErr, setBeratErr] = useState<string | null>(null);
  const [types, setTypes] = useState<BonggolanTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [idBonggolan, setIdBonggolan] = useState<number | "">("");
  const [jenisErr, setJenisErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const beratNum = Number.parseFloat(beratText.trim().replace(",", "."));
  const totalBerat = Number.isFinite(beratNum) && beratNum > 0 ? beratNum : 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getStokBonggolanAction();
      if (cancelled) return;
      setTypesLoading(false);
      if (res.ok) {
        const seen = new Set<number>();
        const opts: BonggolanTypeOption[] = [];
        for (const item of res.items) {
          if (item.idBonggolan === 0 || seen.has(item.idBonggolan)) continue;
          seen.add(item.idBonggolan);
          opts.push({ idBonggolan: item.idBonggolan, nama: item.nama });
        }
        setTypes(opts);
        if (opts.length === 1 && opts[0]) setIdBonggolan(opts[0].idBonggolan);
      } else {
        setTypesError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const berat = Number.parseFloat(beratText.trim().replace(",", "."));
    if (!Number.isFinite(berat) || berat <= 0) {
      setBeratErr("Harus > 0");
      return;
    }
    if (idBonggolan === "") {
      setJenisErr("Jenis bonggolan wajib dipilih");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const dateOnly =
      tglProduksi?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const res = await createBonggolanOutputAction(
      noProduksi,
      Number(idBonggolan),
      dateOnly,
      berat,
    );
    setSaving(false);
    if (res.status === "success") {
      onSaved(res.noProduksi ?? "");
    } else {
      setSaveError(res.message ?? "Gagal menyimpan");
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center gap-2.5 px-5 py-3.5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `${OUTPUT_TEAL}1A`, color: OUTPUT_TEAL }}
          >
            ⛏
          </span>
          <h2 className="flex-1 text-sm font-bold text-gray-900">
            Tambah Label Bonggolan
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
          <InfoChip label="Tanggal" value={formatDateShort(tglProduksi)} />
        </div>

        <div
          className="space-y-2 px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[11px] text-gray-500">
              Jenis Bonggolan
            </label>
            <select
              value={idBonggolan}
              onChange={(e) => {
                setIdBonggolan(e.target.value === "" ? "" : Number(e.target.value));
                setJenisErr(null);
              }}
              disabled={typesLoading}
              className="h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1"
              style={{
                borderColor: jenisErr ? "#f87171" : BORDER,
                color: "#1F2937",
              }}
            >
              <option value="">
                {typesLoading ? "Memuat jenis…" : "— Pilih jenis —"}
              </option>
              {types.map((t) => (
                <option key={t.idBonggolan} value={t.idBonggolan}>
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
            {!typesLoading && !typesError && types.length === 0 && (
              <p className="mt-0.5 text-[11px] text-amber-600">
                Tidak ada jenis bonggolan tersedia.
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[11px] text-gray-500">
              Berat (kg)
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
            {totalBerat > 0 ? `${totalBerat.toFixed(2)} kg` : "—"}
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
              disabled={saving || typesLoading || types.length === 0}
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
