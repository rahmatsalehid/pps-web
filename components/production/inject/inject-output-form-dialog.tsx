"use client";

import { useEffect, useState } from "react";
import {
  createInjectBjOutputAction,
  createInjectFwipOutputAction,
  getOutputTypesAction,
} from "@/app/(app)/production/inject/actions";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

type JenisOption = { idJenis: number; nama: string };

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

/**
 * Tambah Output Furniture WIP / Barang Jadi — input Pcs. Jenis diambil dari
 * mapping Master Input Output (`options`); bila kosong, dimuat dari master.
 */
export function InjectOutputFormDialog({
  category,
  noProduksi,
  tglProduksi,
  options,
  namaMesin,
  onClose,
  onSaved,
}: {
  category: "fwip" | "bj";
  noProduksi: string;
  tglProduksi: string | null;
  options: JenisOption[];
  namaMesin?: string;
  onClose: () => void;
  onSaved: (noLabel: string) => void;
}) {
  const label = category === "bj" ? "Barang Jadi" : "Furniture WIP";
  const [jenisOptions, setJenisOptions] = useState<JenisOption[]>(options);
  const [jenisLoading, setJenisLoading] = useState(options.length === 0);
  const [jenisId, setJenisId] = useState<number | "">(
    options.length === 1 ? options[0].idJenis : "",
  );
  const [jenisErr, setJenisErr] = useState<string | null>(null);
  const [pcsText, setPcsText] = useState("");
  const [pcsErr, setPcsErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (options.length > 0) return;
    let cancelled = false;
    void (async () => {
      const res = await getOutputTypesAction(category);
      if (cancelled) return;
      setJenisLoading(false);
      if (res.ok) {
        setJenisOptions(res.items.map((i) => ({ idJenis: i.idJenis, nama: i.nama })));
      } else {
        setJenisErr(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options, category]);

  const pcsNum = Number.parseInt(pcsText.trim(), 10);
  const totalPcs = Number.isFinite(pcsNum) && pcsNum > 0 ? pcsNum : 0;

  async function save() {
    if (jenisId === "") {
      setJenisErr(`Jenis ${label} wajib dipilih`);
      return;
    }
    const pcs = Number.parseInt(pcsText.trim(), 10);
    if (!Number.isFinite(pcs) || pcs <= 0) {
      setPcsErr("PCS harus > 0");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const dateOnly =
      tglProduksi?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const create =
      category === "bj" ? createInjectBjOutputAction : createInjectFwipOutputAction;
    const res = await create(noProduksi, Number(jenisId), dateOnly, pcs);
    setSaving(false);
    if (res.status === "success") {
      onSaved(res.noLabel ?? "");
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
            🏭
          </span>
          <h2 className="flex-1 text-sm font-bold text-gray-900">
            Tambah Output {label}
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
          className="space-y-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <label className="mb-0.5 block text-[11px] text-gray-500">
              Jenis {label}
            </label>
            <select
              value={jenisId}
              onChange={(e) => {
                setJenisId(e.target.value === "" ? "" : Number(e.target.value));
                setJenisErr(null);
              }}
              disabled={jenisLoading}
              className={inputCls}
              style={{ borderColor: jenisErr ? "#f87171" : BORDER }}
            >
              <option value="">
                {jenisLoading ? "Memuat jenis…" : "— Pilih jenis —"}
              </option>
              {jenisOptions.map((o) => (
                <option key={o.idJenis} value={o.idJenis}>
                  {o.nama}
                </option>
              ))}
            </select>
            {jenisErr && (
              <p className="mt-0.5 text-[11px] text-red-600">{jenisErr}</p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[11px] text-gray-500">PCS</label>
            <input
              value={pcsText}
              onChange={(e) => {
                setPcsText(e.target.value.replace(/[^0-9]/g, ""));
                setPcsErr(null);
              }}
              inputMode="numeric"
              placeholder="0"
              className={inputCls}
              style={{
                borderColor: pcsErr ? "#f87171" : BORDER,
                color: "#1F2937",
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
            />
            {pcsErr && (
              <p className="mt-0.5 text-[11px] text-red-600">{pcsErr}</p>
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
            {totalPcs > 0 ? `${totalPcs} pcs` : "—"}
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

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 text-[11px]">
      <span className="text-gray-500">{label}:</span>
      <span className="font-bold text-gray-900">{value}</span>
    </span>
  );
}
