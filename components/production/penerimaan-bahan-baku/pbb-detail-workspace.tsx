"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  PbbDetail,
  PbbKodeKategori,
  PbbOutput,
} from "@/services/penerimaan-bahan-baku-service";
import {
  completePbbAction,
  getPbbDetailAction,
} from "@/app/(app)/production/penerimaan-bahan-baku/actions";
import { CheckCircleIcon, Loader2Icon } from "@/components/dashboard/icons";
import {
  CategoryIcon,
  InventoryIcon,
  ScaleIcon,
} from "./pbb-icons";
import { fmtQty, formatTanggalShort } from "./pbb-format";
import { PbbConfirmDialog } from "./pbb-confirm-dialog";
import { PbbStatusDialog } from "./pbb-status-dialog";
import { PbbEntryDialog } from "./pbb-entry-dialog";
import { PbbPalletDialog } from "./pbb-pallet-dialog";
import { PbbLaporanDialog } from "./pbb-laporan-dialog";

const PAKAI_COLOR = "#00695C";
const PROSES_COLOR = "#0D47A1";

type StatusDialogState = {
  type: "success" | "error";
  title: string;
  message: string;
};

type LabelRow = {
  noBahanBaku: string;
  noPallet: number;
  namaJenisPlastik: string;
  saks: PbbOutput[];
};

export function PbbDetailWorkspace({
  noPenerimaan,
  initialDetail,
}: {
  noPenerimaan: string;
  initialDetail: PbbDetail | null;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<PbbDetail | null>(initialDetail);
  const [loading, setLoading] = useState(initialDetail == null);
  const [error, setError] = useState<string | null>(null);

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [laporanOpen, setLaporanOpen] = useState(false);
  const [entryKategori, setEntryKategori] = useState<PbbKodeKategori | null>(null);

  const [statusDialog, setStatusDialog] =
    useState<StatusDialogState | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getPbbDetailAction(noPenerimaan);
    setLoading(false);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [noPenerimaan]);

  useEffect(() => {
    if (detail) return;
    let cancelled = false;
    void (async () => {
      const res = await getPbbDetailAction(noPenerimaan);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.detail);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, noPenerimaan]);

  async function handleComplete() {
    if (completing) return;
    setCompleting(true);
    setCompleteError(null);
    const res = await completePbbAction(noPenerimaan);
    setCompleting(false);
    setConfirmComplete(false);
    if (!res.ok) {
      setCompleteError(res.error);
      setStatusDialog({ type: "error", title: "Gagal", message: res.error });
      return;
    }
    setStatusDialog({
      type: "success",
      title: "Berhasil",
      message: "Penerimaan berhasil ditandai selesai.",
    });
  }

  const header = detail?.header ?? null;
  const isComplete = header?.isComplete ?? false;

  if (error && !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {`Gagal memuat label\n${error}`}
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Loader2Icon className="h-4 w-4 animate-spin" /> Coba Lagi
        </button>
      </div>
    );
  }

  if (!detail || !header) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
          </>
        ) : (
          "Data tidak ditemukan"
        )}
      </div>
    );
  }

  const { pakaiRows, prosesRows } = groupOutputs(detail.outputs);
  const supplierOf = (noBahanBaku: string): number | null =>
    detail.batches.find((b) => b.noBahanBaku === noBahanBaku)?.idSupplier ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#F3F4F6]">
      {/* Header ala tablet _buildHeader */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[#E5E7EB] bg-white px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#1F2937]">
            {header.namaTim} • {formatTanggalShort(header.tglPenerimaan)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">
            {header.noPenerimaan}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLaporanOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          Laporan
        </button>
        {isComplete ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#DCFCE7] px-2.5 py-1.5 text-xs font-bold text-[#16A34A]">
            <CheckCircleIcon className="h-3.5 w-3.5" /> Selesai
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmComplete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-bold text-white hover:brightness-95"
          >
            <CheckCircleIcon className="h-4 w-4" /> Selesai
          </button>
        )}
      </div>

      {/* Dua section berdampingan: Pakai (kiri) | Proses (kanan) */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row md:gap-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <LabelSection
            title="Bahan Baku Pakai"
            color={PAKAI_COLOR}
            rows={pakaiRows}
            onInput={() => setEntryKategori("bahanbakupakai")}
            inputLabel="+ Input Pakai"
            noPenerimaan={noPenerimaan}
            editable={!isComplete}
            supplierOf={supplierOf}
            onChanged={() => void reload()}
          />
        </div>
        <div
          className="h-px w-full shrink-0 bg-gray-300 md:mx-4 md:h-auto md:w-px"
          aria-hidden
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <LabelSection
            title="Bahan Baku Proses"
            color={PROSES_COLOR}
            rows={prosesRows}
            onInput={() => setEntryKategori("bahanbaku")}
            inputLabel="+ Input Proses"
            noPenerimaan={noPenerimaan}
            editable={!isComplete}
            supplierOf={supplierOf}
            onChanged={() => void reload()}
          />
        </div>
      </div>

      {laporanOpen && (
        <PbbLaporanDialog
          noPenerimaan={noPenerimaan}
          onClose={() => setLaporanOpen(false)}
        />
      )}

      {entryKategori && (
        <PbbEntryDialog
          noPenerimaan={noPenerimaan}
          kodeKategori={entryKategori}
          onClose={() => setEntryKategori(null)}
          onSaved={() => {
            setEntryKategori(null);
            void reload();
          }}
        />
      )}

      {confirmComplete && (
        <PbbConfirmDialog
          title="Tandai Selesai?"
          message={`Yakin ingin menandai penerimaan ${noPenerimaan} sebagai selesai? Setelah selesai, tim tidak bisa menambah pallet lagi.`}
          confirmLabel="Selesai"
          confirmColor="#16A34A"
          danger={false}
          loading={completing}
          error={completeError}
          onConfirm={() => void handleComplete()}
          onCancel={() => {
            if (completing) return;
            setConfirmComplete(false);
            setCompleteError(null);
          }}
        />
      )}

      {statusDialog && (
        <PbbStatusDialog
          type={statusDialog.type}
          title={statusDialog.title}
          message={statusDialog.message}
          onClose={() => {
            const wasSuccess = statusDialog.type === "success";
            setStatusDialog(null);
            if (wasSuccess) {
              void reload();
              router.push("/production/penerimaan-bahan-baku");
            }
          }}
        />
      )}
    </div>
  );
}

function groupOutputs(outputs: PbbOutput[]): {
  pakaiRows: LabelRow[];
  prosesRows: LabelRow[];
} {
  const grouped = new Map<string, Map<number, PbbOutput[]>>();
  for (const o of outputs) {
    let byPallet = grouped.get(o.noBahanBaku);
    if (!byPallet) {
      byPallet = new Map();
      grouped.set(o.noBahanBaku, byPallet);
    }
    const list = byPallet.get(o.noPallet) ?? [];
    list.push(o);
    byPallet.set(o.noPallet, list);
  }

  const pakaiRows: LabelRow[] = [];
  const prosesRows: LabelRow[] = [];
  for (const noBahanBaku of [...grouped.keys()].sort()) {
    const target = noBahanBaku.startsWith("AB.") ? pakaiRows : prosesRows;
    const byPallet = grouped.get(noBahanBaku);
    if (!byPallet) continue;
    for (const noPallet of [...byPallet.keys()].sort((a, b) => a - b)) {
      const saks = [...(byPallet.get(noPallet) ?? [])].sort(
        (a, b) => a.noSak - b.noSak,
      );
      const namaJenisPlastik =
        saks.find((s) => (s.namaJenisPlastik ?? "").trim() !== "")
          ?.namaJenisPlastik ?? "-";
      target.push({ noBahanBaku, noPallet, namaJenisPlastik, saks });
    }
  }
  return { pakaiRows, prosesRows };
}

function LabelSection({
  title,
  color,
  rows,
  onInput,
  inputLabel,
  noPenerimaan,
  editable,
  supplierOf,
  onChanged,
}: {
  title: string;
  color: string;
  rows: LabelRow[];
  onInput: () => void;
  inputLabel: string;
  noPenerimaan: string;
  editable: boolean;
  supplierOf: (noBahanBaku: string) => number | null;
  onChanged: () => void;
}) {
  return (
    <>
      <div
        className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: `${color}14` }}
      >
        <CategoryIcon className="h-[18px] w-[18px]" style={{ color }} />
        <span
          className="text-xs font-bold uppercase"
          style={{ color }}
        >
          {title}
        </span>
      </div>
      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="py-2 text-xs text-gray-400">Belum ada label</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <LabelTile
                key={`${row.noBahanBaku}-${row.noPallet}`}
                row={row}
                color={color}
                noPenerimaan={noPenerimaan}
                editable={editable}
                idSupplier={supplierOf(row.noBahanBaku)}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
      {editable && (
        <div className="mt-2.5 flex shrink-0 justify-end">
          <button
            type="button"
            onClick={onInput}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-95"
            style={{ backgroundColor: color }}
          >
            {inputLabel}
          </button>
        </div>
      )}
    </>
  );
}

function LabelTile({
  row,
  color,
  noPenerimaan,
  editable,
  idSupplier,
  onChanged,
}: {
  row: LabelRow;
  color: string;
  noPenerimaan: string;
  editable: boolean;
  idSupplier: number | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const totalBerat = row.saks.reduce((sum, s) => sum + s.berat, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[84px] flex-col items-start justify-start rounded-[10px] border border-gray-300 bg-white px-2 py-1.5 text-left transition hover:shadow-sm"
      >
        <span className="w-full truncate text-xs font-extrabold text-[#1A1D23]">
          {row.namaJenisPlastik}
        </span>
        <span className="mt-px w-full truncate text-[10px] text-gray-500">
          {row.noBahanBaku}-{row.noPallet}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <MiniMetric
            icon={<InventoryIcon className="h-3 w-3" />}
            text={`${row.saks.length} sak`}
          />
          <MiniMetric
            icon={<ScaleIcon className="h-3 w-3" />}
            text={`${fmtQty(totalBerat)} kg`}
          />
        </span>
      </button>

      {open && (
        <PbbPalletDialog
          noPenerimaan={noPenerimaan}
          row={row}
          color={color}
          idSupplier={idSupplier}
          editable={editable}
          onChanged={onChanged}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function MiniMetric({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-600">
      <span className="shrink-0 text-gray-500">{icon}</span>
      {text}
    </span>
  );
}
