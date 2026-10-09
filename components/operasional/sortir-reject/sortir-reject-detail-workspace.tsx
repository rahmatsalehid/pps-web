"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getSrDetailAction, printSrLabelAction } from "@/app/(app)/operasional/sortir-reject/actions";
import {
  srCanPrint,
  srPrintTargetOf,
  type SrOutputLabel,
  type SrTransaction,
} from "@/services/sortir-reject-service";
import { CheckCircleIcon, Loader2Icon } from "@/components/dashboard/icons";
import {
  AlertIcon,
  InputIcon,
  OutputIcon,
  PersonIcon,
  PrintIcon,
  ReceiptIcon,
  WarehouseIcon,
} from "./sortir-reject-icons";
import { printPdfBase64 } from "./print-pdf";
import { formatTanggal, formatNum } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";
const PURPLE = "#7B61FF";

export function SortirRejectDetailWorkspace({
  noSortir,
  initialDetail,
}: {
  noSortir: string;
  initialDetail: SrTransaction | null;
}) {
  const [detail, setDetail] = useState<SrTransaction | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printingNo, setPrintingNo] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getSrDetailAction(noSortir);
    setLoading(false);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [noSortir]);

  useEffect(() => {
    if (detail) return;
    let cancelled = false;
    void (async () => {
      const res = await getSrDetailAction(noSortir);
      if (cancelled) return;
      if (res.ok) setDetail(res.detail);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, noSortir]);

  async function handlePrint(out: SrOutputLabel) {
    const target = srPrintTargetOf(out);
    if (!target || printingNo) return;
    setPrintingNo(target.noLabel);
    const res = await printSrLabelAction(target);
    setPrintingNo(null);
    if (!res.ok) {
      setPrintError(res.error);
      return;
    }
    printPdfBase64(res.pdfBase64, target.noLabel);
  }

  if (error && !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat: {error}
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

  if (!detail) {
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

  const totalPcsInput = detail.inputs.reduce((s, e) => s + e.pcs, 0);
  const totalPcsOutput = detail.outputs.reduce((s, e) => s + e.pcs, 0);
  const totalBeratOutput = detail.outputs.reduce(
    (s, e) => s + (e.berat ?? 0),
    0,
  );

  return (
    <div className="relative space-y-4">
      <HeaderCard detail={detail} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          className="overflow-hidden rounded-xl bg-white"
          style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
            <span
              className="grid place-items-center rounded-lg p-1.5"
              style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
            >
              <InputIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[#1A1D23]">Label Input</span>
            {detail.inputs.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
              >
                {detail.inputs.length} label
              </span>
            )}
          </div>
          <div className="h-px" style={{ backgroundColor: BORDER }} />

          {detail.inputs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Tidak ada input
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 2xl:grid-cols-3">
                {detail.inputs.map((lbl, i) => (
                  <div
                    key={`${lbl.noBJ}-${i}`}
                    className="rounded-[10px] border bg-white p-2"
                    style={{ borderColor: BORDER }}
                  >
                    <p className="truncate text-xs font-extrabold text-[#1A1D23]">
                      {lbl.namaJenis || lbl.noBJ}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {lbl.noBJ}
                    </p>
                    <span className="mt-1 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-gray-600">
                      {formatNum(lbl.pcs)} pcs
                    </span>
                  </div>
                ))}
              </div>
              <TotalFooter
                label="Total Pcs Input"
                color={PRIMARY}
                value={`${formatNum(totalPcsInput)} pcs`}
              />
            </>
          )}
        </section>

        <section
          className="overflow-hidden rounded-xl bg-white"
          style={{ border: `1px solid ${GREEN}4D`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
            <span
              className="grid place-items-center rounded-lg p-1.5"
              style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
            >
              <OutputIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[#1A1D23]">Label Output</span>
            {detail.outputs.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
              >
                {detail.outputs.length} label
              </span>
            )}
          </div>
          <div className="h-px" style={{ backgroundColor: BORDER }} />

          {detail.outputs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Tidak ada output
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 2xl:grid-cols-3">
                {detail.outputs.map((out, i) => (
                  <OutputTile
                    key={`${out.noBJ ?? "out"}-${i}`}
                    out={out}
                    index={i}
                    printing={printingNo !== null && printingNo === (srPrintTargetOf(out)?.noLabel ?? null)}
                    onPrint={() => void handlePrint(out)}
                  />
                ))}
              </div>
              <TotalFooter
                label="Total Output"
                color={GREEN}
                value={formatTotalOutput(totalPcsOutput, totalBeratOutput)}
              />
            </>
          )}
        </section>
      </div>

      {loading && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-white">
          <span className="inline-flex items-center gap-1.5">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat ulang…
          </span>
        </div>
      )}

      {printError && (
        <PrintErrorDialog
          message={printError}
          onClose={() => setPrintError(null)}
        />
      )}
    </div>
  );
}

function HeaderCard({ detail }: { detail: SrTransaction }) {
  const isReject =
    detail.balance === false ||
    (detail.balance == null &&
      (detail.category === "reject" || detail.category === "bahanPendukung"));

  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ backgroundColor: PRIMARY }}>
        <span className="rounded-lg bg-white/15 p-2 text-white">
          <ReceiptIcon className="h-[17px] w-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-white">
            {detail.noSortir}
          </p>
          <p className="truncate text-xs text-white/75">
            {formatTanggal(detail.tanggal)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white px-2.5 py-1">
          {isReject ? (
            <AlertIcon className="h-3.5 w-3.5 text-red-600" />
          ) : (
            <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
          )}
          <span
            className="text-[11px] font-bold"
            style={{ color: isReject ? "#DC2626" : GREEN }}
          >
            {isReject ? "Konversi Reject" : "Konversi Jenis"}
          </span>
        </span>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3"
        style={{ backgroundColor: "#F0F7FF" }}
      >
        <StatItem
          icon={<PersonIcon className="h-[15px] w-[15px]" />}
          label="Dibuat oleh"
          value={detail.username ?? "—"}
          color={PRIMARY}
        />
        <span className="hidden h-9 w-px bg-[#D0E4FF] sm:block" />
        <StatItem
          icon={<WarehouseIcon className="h-[15px] w-[15px]" />}
          label="Warehouse"
          value={detail.namaWarehouse ?? "—"}
          color={PURPLE}
        />
        <span className="hidden h-9 w-px bg-[#D0E4FF] sm:block" />
        <div>
          <p className="text-[10px] font-medium text-[#8A94A6]">Input -&gt; Output</p>
          <span className="mt-1 flex items-center gap-1.5">
            <FlowPill count={detail.inputs.length} color={PRIMARY} />
            <span className="text-xs text-gray-400">→</span>
            <FlowPill count={detail.outputs.length} color={GREEN} />
          </span>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-medium text-[#8A94A6]">{label}</span>
        <span className="block truncate text-[13px] font-bold text-[#1A1D23]">
          {value}
        </span>
      </span>
    </span>
  );
}

function FlowPill({ count, color }: { count: number; color: string }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span
        className="rounded-md px-2.5 py-0.5 text-[13px] font-extrabold"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {count}
      </span>
      <span className="mt-0.5 text-[9px]" style={{ color: `${color}B3` }}>
        Label
      </span>
    </span>
  );
}

function OutputTile({
  out,
  index,
  printing,
  onPrint,
}: {
  out: SrOutputLabel;
  index: number;
  printing: boolean;
  onPrint: () => void;
}) {
  const noBJ = (out.noBJ ?? "").trim();
  const canPrint = srCanPrint(out);
  const title = out.namaJenis || noBJ || `#${index + 1}`;
  const subtitle = noBJ || `#${index + 1}`;
  const hasBerat = out.berat != null && out.berat > 0;
  const qtyText = hasBerat
    ? `${formatNum(out.berat ?? 0, 2)} kg`
    : `${formatNum(out.pcs)} pcs`;

  return (
    <div
      className="relative rounded-[10px] border bg-white p-2"
      style={{ borderColor: BORDER }}
    >
      <div className="flex items-start gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#1A1D23]">
          {title}
        </span>
        {canPrint && (
          <button
            type="button"
            onClick={onPrint}
            disabled={printing}
            className="shrink-0 rounded-md bg-green-50 p-1 text-green-600 hover:bg-green-100 disabled:opacity-50"
            aria-label={`Cetak ${subtitle}`}
          >
            {printing ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PrintIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      <p className="truncate text-[10px] text-gray-500">{subtitle}</p>
      <span className="mt-1 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-gray-600">
        {qtyText}
      </span>
    </div>
  );
}

function TotalFooter({
  label,
  color,
  value,
}: {
  label: string;
  color: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center justify-between border-t px-4 py-2.5"
      style={{ backgroundColor: `${color}0A`, borderColor: BORDER }}
    >
      <span className="text-xs font-bold" style={{ color }}>
        {label}
      </span>
      <span className="text-[13px] font-extrabold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function PrintErrorDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50 px-5 py-4">
          <p className="text-sm font-bold text-red-700">Gagal Cetak</p>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end px-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTotalOutput(totalPcs: number, totalBerat: number): string {
  if (totalBerat > 0) {
    const pcsText = totalPcs > 0 ? `${formatNum(totalPcs)} pcs / ` : "";
    return `${pcsText}${formatNum(totalBerat, 2)} kg`;
  }
  return `${formatNum(totalPcs)} pcs`;
}
