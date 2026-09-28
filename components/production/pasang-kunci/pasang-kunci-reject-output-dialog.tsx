"use client";

import { useEffect, useState } from "react";
import {
  createPasangKunciRejectOutputAction,
  getRejectTypesAction,
} from "@/app/(app)/production/pasang-kunci/actions";
import type { RejectTypeItem } from "@/services/pasang-kunci-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";

const OUTPUT_TEAL = "#00796B";
const BORDER = "#E2E6EA";

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

function currentJam(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

/** Tambah Output Reject — jenis reject + berat + jam (sesuai tablet). */
export function PasangKunciRejectOutputDialog({
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
  onSaved: (noLabel: string) => void;
}) {
  const [types, setTypes] = useState<RejectTypeItem[] | null>(null);
  const [typesErr, setTypesErr] = useState<string | null>(null);
  const [idReject, setIdReject] = useState<number | "">("");
  const [beratText, setBeratText] = useState("");
  const [beratErr, setBeratErr] = useState<string | null>(null);
  const [jam, setJam] = useState(currentJam);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getRejectTypesAction();
      if (cancelled) return;
      if (res.ok) {
        setTypes(res.types);
        if (res.types.length > 0) setIdReject(res.types[0].idReject);
      } else {
        setTypesErr(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const beratNum = Number.parseFloat(beratText.trim().replace(",", "."));
  const totalBerat = Number.isFinite(beratNum) && beratNum > 0 ? beratNum : 0;

  async function save() {
    const berat = Number.parseFloat(beratText.trim().replace(",", "."));
    if (!Number.isFinite(berat) || berat <= 0) {
      setBeratErr("Berat harus > 0");
      return;
    }
    if (idReject === "") {
      setSaveError("Pilih jenis reject terlebih dahulu");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const dateOnly =
      tglProduksi?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const res = await createPasangKunciRejectOutputAction(
      noProduksi,
      Number(idReject),
      dateOnly,
      berat,
      jam.trim() || currentJam(),
    );
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
            ⚠
          </span>
          <h2 className="flex-1 text-sm font-bold text-gray-900">
            Tambah Output Reject
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
          <InfoChip label="Jam" value={jam} />
        </div>

        <div
          className="space-y-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <label className="mb-0.5 block text-[11px] text-gray-500">
              Jenis Reject
            </label>
            <select
              value={idReject === "" ? "" : String(idReject)}
              onChange={(e) => {
                setIdReject(e.target.value === "" ? "" : Number(e.target.value));
                setSaveError(null);
              }}
              className="h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm outline-none focus:ring-1"
              style={{ borderColor: BORDER, color: "#1F2937" }}
            >
              <option value="">- Pilih jenis reject -</option>
              {(types ?? []).map((t) => (
                <option key={t.idReject} value={t.idReject}>
                  {t.namaReject}
                </option>
              ))}
            </select>
            {typesErr && (
              <p className="mt-0.5 text-[11px] text-red-600">{typesErr}</p>
            )}
          </div>

          <div>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
            />
            {beratErr && (
              <p className="mt-0.5 text-[11px] text-red-600">{beratErr}</p>
            )}
          </div>

          <div>
            <label className="mb-0.5 block text-[11px] text-gray-500">Jam</label>
            <input
              type="time"
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className={inputCls}
              style={{ borderColor: BORDER, color: "#1F2937" }}
            />
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
              disabled={saving || types == null}
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
