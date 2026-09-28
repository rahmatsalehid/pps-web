"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MappingLayoutData,
  MappingLokasi,
} from "@/services/mapping-service";
import {
  getMappingLayoutAction,
  getMappingLokasiAction,
} from "@/app/(app)/mapping/actions";
import {
  applyLayout,
  hasAisleInRange,
  type GridCell,
  type GridState,
} from "./mapping-grid";
import { lokasiUomText } from "./mapping-format";
import { MappingJenisBulletList } from "./mapping-jenis-list";
import { MappingLabelDialog } from "./mapping-label-dialog";
import {
  MapErrorIcon,
  MapHorizontalRuleIcon,
  MapPencilIcon,
  MapScaleIcon,
  MapTagIcon,
} from "./mapping-icons";

const SLOT_W = 67;
const SLOT_H = 59;
const GUTTER_W = 28;
const HEADER_H = 20;

export function MappingLokasiView({ blok }: { blok: string }) {
  const router = useRouter();
  const [lokasis, setLokasis] = useState<MappingLokasi[]>([]);
  const [layout, setLayout] = useState<MappingLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeLokasi, setActiveLokasi] = useState<MappingLokasi | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [lokasiRes, layoutRes] = await Promise.all([
        getMappingLokasiAction(blok),
        getMappingLayoutAction(blok),
      ]);
      if (cancelled) return;
      if (!lokasiRes.ok) {
        setLokasis([]);
        setLayout(null);
        setError(lokasiRes.error);
        setLoading(false);
        return;
      }
      if (!layoutRes.ok) {
        setLokasis([]);
        setLayout(null);
        setError(layoutRes.error);
        setLoading(false);
        return;
      }
      setLokasis(lokasiRes.lokasis);
      setLayout(layoutRes.layout);
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [blok, reloadKey]);

  const lookup = useMemo(() => {
    const map = new Map<
      number,
      { idLokasi: number; label: string; namaJenis: string; jenisList: { namaJenis: string }[] }
    >();
    for (const l of lokasis) {
      map.set(l.idLokasi, {
        idLokasi: l.idLokasi,
        label: l.label,
        namaJenis: l.namaJenis,
        jenisList: l.jenisList,
      });
    }
    return map;
  }, [lokasis]);

  const gridState: GridState | null = useMemo(() => {
    if (!layout || layout.cells.length === 0) return null;
    return applyLayout(layout, lookup);
  }, [layout, lookup]);

  const lokasiById = useMemo(() => {
    const map = new Map<number, MappingLokasi>();
    for (const l of lokasis) map.set(l.idLokasi, l);
    return map;
  }, [lokasis]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
        <MapErrorIcon className="h-10 w-10 text-red-500" />
        <p className="text-sm text-gray-700">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (lokasis.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Data lokasi kosong
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[420px] flex-col">
      <div className="flex-1">
        {gridState ? (
          <ReadOnlyLayoutGrid
            state={gridState}
            lokasiById={lokasiById}
            onOpenLokasi={(id) => {
              const lokasi = lokasiById.get(id);
              if (lokasi) setActiveLokasi(lokasi);
            }}
          />
        ) : (
          <CardGrid
            lokasis={lokasis}
            onOpenLokasi={(lokasi) => setActiveLokasi(lokasi)}
          />
        )}
      </div>

      {gridState && <LayoutLegend />}

      <button
        type="button"
        onClick={() => router.push(`/mapping/${encodeURIComponent(blok)}/layout`)}
        className="fixed bottom-6 right-8 z-20 flex items-center gap-2 rounded-lg bg-[#1E6FD9] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#1a62c2]"
      >
        <MapPencilIcon className="h-4 w-4" />
        Edit Layout
      </button>

      {activeLokasi && (
        <MappingLabelDialog
          blok={blok}
          lokasi={activeLokasi}
          onClose={() => setActiveLokasi(null)}
        />
      )}
    </div>
  );
}

function ReadOnlyLayoutGrid({
  state,
  lokasiById,
  onOpenLokasi,
}: {
  state: GridState;
  lokasiById: Map<number, MappingLokasi>;
  onOpenLokasi: (idLokasi: number) => void;
}) {
  const gridW = state.cols * SLOT_W;
  const gridH = state.rows * SLOT_H;

  return (
    <div className="overflow-auto p-6">
      <div className="inline-flex">
        <div className="shrink-0" style={{ width: GUTTER_W }}>
          <div style={{ height: HEADER_H + 4 }} />
          {Array.from({ length: state.rows }, (_, r) => (
            <div
              key={r}
              className="flex items-center justify-center text-[10px] font-medium text-gray-400"
              style={{ width: GUTTER_W, height: SLOT_H }}
            >
              {r + 1}
            </div>
          ))}
        </div>
        <div>
          <div className="flex" style={{ height: HEADER_H }}>
            {Array.from({ length: state.cols }, (_, c) => (
              <div
                key={c}
                className="flex items-center justify-center text-[10px] font-medium text-gray-400"
                style={{ width: SLOT_W }}
              >
                {c + 1}
              </div>
            ))}
          </div>
          <div className="mt-1" style={{ width: gridW, height: gridH, position: "relative" }}>
            {state.grid.map((row, r) =>
              row.map((cell, c) => {
                if (cell.type === "covered") return null;
                return (
                  <ReadOnlyCell
                    key={`${r}-${c}`}
                    cell={cell}
                    grid={state.grid}
                    lokasi={cell.idLokasi != null ? lokasiById.get(cell.idLokasi) : undefined}
                    onOpenLokasi={onOpenLokasi}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyCell({
  cell,
  grid,
  lokasi,
  onOpenLokasi,
}: {
  cell: GridCell;
  grid: GridCell[][];
  lokasi?: MappingLokasi;
  onOpenLokasi: (idLokasi: number) => void;
}) {
  const isAisle = cell.type === "aisle";
  const isLokasi = cell.type === "lokasi";
  const isLabel = cell.type === "label";
  const isEmpty = cell.type === "empty";

  let mergeTop = false;
  let mergeBottom = false;
  let mergeLeft = false;
  let mergeRight = false;

  if (isAisle) {
    const r = cell.row;
    const c = cell.col;
    const rs = cell.rowSpan;
    const cs = cell.colSpan;
    mergeTop = r > 0 && hasAisleInRange(grid, r - 1, r - 1, c, c + cs - 1);
    mergeBottom =
      r + rs < grid.length && hasAisleInRange(grid, r + rs, r + rs, c, c + cs - 1);
    mergeLeft = c > 0 && hasAisleInRange(grid, r, r + rs - 1, c - 1, c - 1);
    mergeRight =
      c + cs < grid[0].length &&
      hasAisleInRange(grid, r, r + rs - 1, c + cs, c + cs);
  }

  const width = isEmpty
    ? SLOT_W
    : isAisle
      ? cell.colSpan * SLOT_W - (mergeLeft ? 0 : 1.5) - (mergeRight ? 0 : 1.5)
      : cell.colSpan * SLOT_W - 3;
  const height = isEmpty
    ? SLOT_H
    : isAisle
      ? cell.rowSpan * SLOT_H - (mergeTop ? 0 : 1.5) - (mergeBottom ? 0 : 1.5)
      : cell.rowSpan * SLOT_H - 3;

  const left =
    cell.col * SLOT_W + (isEmpty ? 0 : isAisle ? (mergeLeft ? 0 : 1.5) : 1.5);
  const top =
    cell.row * SLOT_H + (isEmpty ? 0 : isAisle ? (mergeTop ? 0 : 1.5) : 1.5);

  let bg = "#F5F5F5";
  if (isAisle) bg = "#FFD600";
  if (isLokasi) bg = "#FFFFFF";
  if (isLabel) bg = "#E8F5E9";

  const borderRadius = isAisle
    ? `${mergeTop || mergeLeft ? 0 : 6}px ${mergeTop || mergeRight ? 0 : 6}px ${
        mergeBottom || mergeRight ? 0 : 6
      }px ${mergeBottom || mergeLeft ? 0 : 6}px`
    : `${isEmpty ? 0 : 6}px`;

  const border = isLokasi
    ? "1.5px solid rgba(30,111,217,0.5)"
    : isAisle
      ? "none"
      : isLabel
        ? "1px solid rgba(46,125,50,0.5)"
        : "0.5px solid #E5E7EB";

  const aisleSide = "1.5px solid rgba(234,88,12,0.5)";

  return (
    <div
      onClick={() => {
        if (isLokasi && cell.idLokasi != null) onOpenLokasi(cell.idLokasi);
      }}
      className={`absolute overflow-hidden ${isLokasi ? "cursor-pointer" : ""}`}
      style={{
        left,
        top,
        width,
        height,
        background: bg,
        borderRadius,
        border,
        boxShadow: isLokasi ? "0 2px 4px rgba(30,111,217,0.08)" : undefined,
        borderTop: isAisle ? (mergeTop ? "none" : aisleSide) : undefined,
        borderBottom: isAisle ? (mergeBottom ? "none" : aisleSide) : undefined,
        borderLeft: isAisle ? (mergeLeft ? "none" : aisleSide) : undefined,
        borderRight: isAisle ? (mergeRight ? "none" : aisleSide) : undefined,
      }}
    >
      {isAisle && (
        <div className="flex h-full items-center justify-center">
          <MapHorizontalRuleIcon
            className="h-4 w-4"
            style={{ color: "rgba(194,65,12,0.6)" }}
          />
        </div>
      )}
      {isLabel && (
        <div className="flex h-full items-center justify-center px-1">
          <span className="line-clamp-2 text-center text-[9px] font-bold leading-tight text-[#1B5E20]">
            {cell.labelText ?? ""}
          </span>
        </div>
      )}
      {isLokasi && (
        <LokasiCellBody cell={cell} lokasi={lokasi} />
      )}
    </div>
  );
}

function LokasiCellBody({
  cell,
  lokasi,
}: {
  cell: GridCell;
  lokasi?: MappingLokasi;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="pt-1.5">
        <p className="truncate px-1 text-center text-[17px] font-extrabold leading-none text-[#1E6FD9]">
          {cell.lokasiLabel ?? ""}
        </p>
      </div>
      <div className="mx-2.5 mt-1 border-t border-gray-200" />
      <div className="min-h-0 flex-1 px-1.5 py-0.5">
        <MappingJenisBulletList items={lokasi?.jenisList ?? []} />
      </div>
      <CellFooterBadge
        namaUOM={lokasi?.namaUOM ?? ""}
        totalBerat={lokasi?.totalBerat ?? 0}
        totalQty={lokasi?.totalQty ?? 0}
        totalLabel={lokasi?.totalLabel ?? 0}
      />
    </div>
  );
}

function CardGrid({
  lokasis,
  onOpenLokasi,
}: {
  lokasis: MappingLokasi[];
  onOpenLokasi: (lokasi: MappingLokasi) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 bg-[#FFF8E1] px-4 py-2">
        <MapErrorIcon className="h-3.5 w-3.5 text-orange-600" />
        <p className="text-[11px] text-orange-800">
          Layout belum dibuat. Tekan &quot;Edit Layout&quot; untuk membuat formasi.
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2.5">
          {lokasis.map((item) => (
            <LokasiCard
              key={item.idLokasi}
              item={item}
              onOpen={() => onOpenLokasi(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LokasiCard({
  item,
  onOpen,
}: {
  item: MappingLokasi;
  onOpen: () => void;
}) {
  const uom = item.namaUOM.toUpperCase();
  let uomText: string | null = null;
  let hasUom = false;
  if (uom === "KG" || item.totalBerat > 0) {
    uomText = `${lokasiUomText(item.namaUOM, item.totalBerat, item.totalQty, "")} kg`;
    hasUom = item.totalBerat > 0;
  } else if (uom === "PCS" || item.totalQty > 0) {
    uomText = `${item.totalQty} pcs`;
    hasUom = item.totalQty > 0;
  }
  const hasLabel = item.totalLabel > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-[100px] w-20 flex-col items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-1 py-1.5 shadow-sm transition hover:border-[#1E6FD9]"
    >
      <span className="text-center text-xs font-extrabold leading-none text-[#1E6FD9]">
        {item.label}
      </span>
      <span className="line-clamp-3 text-center text-[9px] leading-tight text-black">
        {item.namaJenis.length > 0 ? item.namaJenis : "-"}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
          hasLabel ? "bg-[#1E6FD9]/10 text-[#1E6FD9]" : "bg-gray-500/10 text-gray-500"
        }`}
      >
        {item.totalLabel} label
      </span>
      {uomText != null && (
        <span
          className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
            hasUom ? "bg-[#2E7D32]/10 text-[#2E7D32]" : "bg-gray-500/10 text-gray-500"
          }`}
        >
          {uomText}
        </span>
      )}
    </button>
  );
}

function LayoutLegend() {
  return (
    <div className="flex items-center justify-center gap-4 bg-white px-5 py-2.5">
      <LegendItem bg="#FFFFFF" border="rgba(30,111,217,0.4)" label="Lokasi" />
      <LegendItem bg="#FFD600" border="#D1D5DB" label="Jalan / Aisle" />
      <LegendItem bg="#E8F5E9" border="#D1D5DB" label="Label" />
      <LegendItem bg="#F5F5F5" border="#D1D5DB" label="Kosong" />
    </div>
  );
}

function LegendItem({
  bg,
  border,
  label,
}: {
  bg: string;
  border: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-4 w-4 rounded"
        style={{ background: bg, border: `1px solid ${border}` }}
      />
      <span className="text-[11px] text-gray-700">{label}</span>
    </div>
  );
}

export function CellFooterBadge({
  namaUOM,
  totalBerat,
  totalQty,
  totalLabel,
}: {
  namaUOM: string;
  totalBerat: number;
  totalQty: number;
  totalLabel: number;
}) {
  const hasLabel = totalLabel > 0;
  const color = hasLabel ? "#1E6FD9" : "#9CA3AF";
  const uomText = lokasiUomText(namaUOM, totalBerat, totalQty, "kg") ?? lokasiUomText(namaUOM, totalBerat, totalQty, "pcs");

  return (
    <div
      className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 py-[3px]"
      style={{
        background: hasLabel ? "rgba(30,111,217,0.06)" : "rgba(107,114,128,0.06)",
      }}
    >
      <span className="flex items-center gap-[3px]" style={{ color }}>
        <MapTagIcon className="h-3 w-3" />
        <span className="text-[11px] font-bold">{totalLabel}</span>
      </span>
      {uomText != null && (
        <span className="flex items-center gap-[3px]" style={{ color }}>
          <MapScaleIcon className="h-3 w-3" />
          <span className="text-[11px] font-bold">{uomText}</span>
        </span>
      )}
    </div>
  );
}
