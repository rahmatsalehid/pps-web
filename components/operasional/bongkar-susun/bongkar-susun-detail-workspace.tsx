"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  getBsDetailAction,
} from "@/app/(app)/operasional/bongkar-susun/actions";
import {
  bsCanPrint,
  bsCategoryLabelWithCode,
  bsIsPcsCategory,
  type BsDetail,
  type BsOutputLabel,
} from "@/services/bongkar-susun-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import {
  CategoryIcon,
  NoteIcon,
  PersonIcon,
  PrintIcon,
  ReceiptIcon,
  ScaleIcon,
} from "./bongkar-susun-icons";
import { BongkarSusunPrintDialog } from "./bongkar-susun-print-dialog";
import { BongkarSusunSakDialog } from "./bongkar-susun-sak-dialog";
import { formatKg, formatNum, formatPcs, formatTanggal } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";

export function BongkarSusunDetailWorkspace({
  noBongkarSusun,
  initialDetail,
}: {
  noBongkarSusun: string;
  initialDetail: BsDetail | null;
}) {
  const [detail, setDetail] = useState<BsDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [sakTarget, setSakTarget] = useState<{
    labelCode: string;
    namaJenis: string;
    jumlahSak: number;
    totalBerat: number;
    saks: BsDetail["inputs"][number]["saks"];
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await getBsDetailAction(noBongkarSusun);
    setLoading(false);
    if (res.ok) {
      setDetail(res.detail);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [noBongkarSusun]);

  useEffect(() => {
    if (detail) return;
    let cancelled = false;
    void (async () => {
      const res = await getBsDetailAction(noBongkarSusun);
      if (cancelled) return;
      if (res.ok) setDetail(res.detail);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, noBongkarSusun]);

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
        <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }

  const category = detail.category;

  return (
    <div className="relative space-y-4">
      <HeaderCard detail={detail} category={category} />

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
              <ReceiptIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[#1A1D23]">Input</span>
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
                {detail.inputs.map((lbl) => (
                  <button
                    key={lbl.labelCode}
                    type="button"
                    disabled={lbl.saks.length === 0}
                    onClick={() =>
                      setSakTarget({
                        labelCode: lbl.labelCode,
                        namaJenis: lbl.namaJenis,
                        jumlahSak: lbl.jumlahSak,
                        totalBerat: lbl.totalBerat,
                        saks: lbl.saks,
                      })
                    }
                    className="rounded-[10px] border bg-white p-2 text-left transition hover:border-blue-300 disabled:cursor-default disabled:hover:border-[#E2E6EA]"
                    style={{ borderColor: BORDER }}
                  >
                    <p className="truncate text-xs font-extrabold text-[#1A1D23]">
                      {lbl.namaJenis || lbl.labelCode}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {lbl.labelCode}
                    </p>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {lbl.jumlahSak > 0 && (
                        <MiniMetric icon="box" text={`${lbl.jumlahSak} sak`} />
                      )}
                      <MiniMetric
                        icon={bsIsPcsCategory(lbl.category) ? "cat" : "scale"}
                        text={
                          bsIsPcsCategory(lbl.category)
                            ? formatPcs(lbl.totalBerat)
                            : formatKg(lbl.totalBerat)
                        }
                      />
                    </span>
                  </button>
                ))}
              </div>
              <TotalFooter
                label="Input"
                color={PRIMARY}
                totalKg={sumKg(detail.inputs)}
                totalPcs={sumPcs(detail.inputs)}
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
              <CategoryIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[#1A1D23]">Output</span>
            {detail.outputs.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
              >
                {detail.outputs.length} label
              </span>
            )}
            <span className="flex-1" />
            {detail.outputs.some((o) => bsCanPrint(o)) && (
              <button
                type="button"
                onClick={() => setPrintOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                <PrintIcon className="h-4 w-4" />
                Cetak Label
              </button>
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
                    key={`${out.labelCode ?? "out"}-${i}`}
                    out={out}
                    index={i}
                    onOpenSak={() =>
                      setSakTarget({
                        labelCode: out.labelCode ?? `#${i + 1}`,
                        namaJenis: out.namaJenis,
                        jumlahSak: out.jumlahSak,
                        totalBerat: out.totalBerat,
                        saks: out.saks,
                      })
                    }
                  />
                ))}
              </div>
              <TotalFooter
                label="Output"
                color={GREEN}
                totalKg={sumOutputKg(detail.outputs)}
                totalPcs={sumOutputPcs(detail.outputs)}
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

      {printOpen && (
        <BongkarSusunPrintDialog
          outputs={detail.outputs.filter((o) => bsCanPrint(o))}
          onPrinted={() => void reload()}
          onClose={() => setPrintOpen(false)}
        />
      )}

      {sakTarget && (
        <BongkarSusunSakDialog
          labelCode={sakTarget.labelCode}
          namaJenis={sakTarget.namaJenis}
          jumlahSak={sakTarget.jumlahSak}
          totalBerat={sakTarget.totalBerat}
          saks={sakTarget.saks}
          onClose={() => setSakTarget(null)}
        />
      )}
    </div>
  );
}

function HeaderCard({
  detail,
  category,
}: {
  detail: BsDetail;
  category: string | null;
}) {
  const inputJenis: string[] = [];
  for (const e of detail.inputs) {
    const j = e.namaJenis.trim();
    if (j && !inputJenis.includes(j)) inputJenis.push(j);
  }

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
            {detail.noBongkarSusun}
          </p>
          <p className="truncate text-xs text-white/75">
            {formatTanggal(detail.tanggal)}
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
          {bsCategoryLabelWithCode(category)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3" style={{ backgroundColor: "#F0F7FF" }}>
        <StatItem
          icon={<PersonIcon className="h-[15px] w-[15px]" />}
          label="Dibuat oleh"
          value={detail.username ?? "—"}
          color={PRIMARY}
        />
        <span className="hidden h-9 w-px bg-[#D0E4FF] sm:block" />
        <div>
          <p className="text-[10px] font-medium text-[#8A94A6]">Input → Output</p>
          <span className="mt-1 flex items-center gap-1.5">
            <span
              className="rounded-md px-2.5 py-0.5 text-[13px] font-extrabold"
              style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
            >
              {detail.inputs.length}
            </span>
            <span className="text-xs text-gray-400">→</span>
            <span
              className="rounded-md px-2.5 py-0.5 text-[13px] font-extrabold"
              style={{ backgroundColor: `${GREEN}1A`, color: GREEN }}
            >
              {detail.outputs.length}
            </span>
          </span>
        </div>
        <span className="hidden h-9 w-px bg-[#D0E4FF] sm:block" />
        <StatItem
          icon={<NoteIcon className="h-[15px] w-[15px]" />}
          label="Catatan"
          value={detail.note || "—"}
          color="#8A94A6"
          italic={Boolean(detail.note)}
        />
      </div>

      {inputJenis.length > 0 && (
        <div
          className="flex items-start gap-2 border-t px-4 py-2.5"
          style={{ backgroundColor: "#F0F7FF", borderColor: "#D0E4FF" }}
        >
          <span
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
          >
            <CategoryIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-[#8A94A6]">Jenis Item</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {inputJenis.map((j) => (
                <span
                  key={j}
                  className="rounded-md border bg-white px-2 py-0.5 text-[11px] font-bold text-[#1A1D23]"
                  style={{ borderColor: `${PRIMARY}40` }}
                >
                  {j}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
  italic,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  italic?: boolean;
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
        <span
          className="block truncate text-[13px] font-bold text-[#1A1D23]"
          style={{ fontStyle: italic ? "italic" : undefined }}
        >
          {value}
        </span>
      </span>
    </span>
  );
}

function OutputTile({
  out,
  index,
  onOpenSak,
}: {
  out: BsOutputLabel;
  index: number;
  onOpenSak: () => void;
}) {
  const title = out.namaJenis || out.labelCode || `#${index + 1}`;
  const subtitle = out.labelCode || `#${index + 1}`;
  const isPcs = bsIsPcsCategory(out.category);

  return (
    <button
      type="button"
      disabled={out.saks.length === 0}
      onClick={onOpenSak}
      className="relative rounded-[10px] border bg-white p-2 text-left transition hover:border-emerald-300 disabled:cursor-default disabled:hover:border-[#E2E6EA]"
      style={{ borderColor: BORDER }}
    >
      <span className="flex items-start gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#1A1D23]">
          {title}
        </span>
        <span
          className="shrink-0 text-[9px] font-bold"
          style={{ color: out.printCount > 0 ? GREEN : "#9CA3AF" }}
        >
          ×{out.printCount}
        </span>
        <PrintIcon
          className="h-3 w-3 shrink-0"
          style={{ color: out.printCount > 0 ? GREEN : "#9CA3AF" }}
        />
      </span>
      <p className="truncate text-[10px] text-gray-500">{subtitle}</p>
      <span className="mt-1 flex flex-wrap gap-1.5">
        {out.jumlahSak > 0 && <MiniMetric icon="box" text={`${out.jumlahSak} sak`} />}
        <MiniMetric
          icon={isPcs ? "cat" : "scale"}
          text={isPcs ? formatPcs(out.totalBerat) : formatKg(out.totalBerat)}
        />
      </span>
    </button>
  );
}

function MiniMetric({
  icon,
  text,
}: {
  icon: "box" | "scale" | "cat";
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-gray-600">
      {icon === "scale" ? (
        <ScaleIcon className="h-3 w-3" />
      ) : icon === "cat" ? (
        <CategoryIcon className="h-3 w-3" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-sm border border-gray-400" aria-hidden />
      )}
      {text}
    </span>
  );
}

function TotalFooter({
  label,
  color,
  totalKg,
  totalPcs,
}: {
  label: string;
  color: string;
  totalKg: number;
  totalPcs: number;
}) {
  if (totalKg <= 0 && totalPcs <= 0) return null;
  return (
    <div
      className="flex flex-col items-end gap-1 border-t px-4 py-2.5"
      style={{ backgroundColor: `${color}0A`, borderColor: BORDER }}
    >
      {totalKg > 0 && (
        <span className="flex w-full items-center justify-between text-xs font-bold" style={{ color }}>
          <span>Total Berat {label}</span>
          <span className="text-[13px] font-extrabold">{formatNum(totalKg)} kg</span>
        </span>
      )}
      {totalPcs > 0 && (
        <span className="flex w-full items-center justify-between text-xs font-bold" style={{ color }}>
          <span>Total Pcs {label}</span>
          <span className="text-[13px] font-extrabold">{formatNum(totalPcs, 0)} pcs</span>
        </span>
      )}
    </div>
  );
}

function sumKg(items: { category: string; totalBerat: number }[]): number {
  return items
    .filter((e) => !bsIsPcsCategory(e.category))
    .reduce((s, e) => s + e.totalBerat, 0);
}

function sumPcs(items: { category: string; totalBerat: number }[]): number {
  return items
    .filter((e) => bsIsPcsCategory(e.category))
    .reduce((s, e) => s + e.totalBerat, 0);
}

function sumOutputKg(items: BsOutputLabel[]): number {
  return items
    .filter((e) => !bsIsPcsCategory(e.category))
    .reduce((s, e) => s + e.totalBerat, 0);
}

function sumOutputPcs(items: BsOutputLabel[]): number {
  return items
    .filter((e) => bsIsPcsCategory(e.category))
    .reduce((s, e) => s + e.totalBerat, 0);
}
