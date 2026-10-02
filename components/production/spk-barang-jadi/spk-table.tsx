"use client";

import { useEffect, useRef } from "react";
import type {
  SpkMonitoringItem,
  SpkSortKey,
} from "@/services/spk-barang-jadi-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { spkFormatNumber, spkStatusMeta } from "./spk-format";
import { SpkEyeIcon, SpkInboxIcon, SpkSortIcon } from "./spk-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const MUTED = "#6B7280";
const INK = "#1A1D23";

type ColumnDef = {
  key?: SpkSortKey;
  label: string;
  align?: "right";
};

const COLUMNS: ColumnDef[] = [
  { key: "itemCode", label: "Item Code" },
  { key: "barang", label: "Barang" },
  { label: "UOM" },
  { key: "stok", label: "Stok", align: "right" },
  { key: "min", label: "Min", align: "right" },
  { key: "max", label: "Max", align: "right" },
  { key: "mpq", label: "MPQ", align: "right" },
  { key: "qty", label: "Qty Rekomendasi", align: "right" },
  { key: "status", label: "Status" },
];

export function SpkTable({
  items,
  loading,
  error,
  hasData,
  selection,
  sort,
  dir,
  page,
  pageSize,
  totalPages,
  total,
  hasNextPage,
  hasPrevPage,
  onSort,
  onPage,
  onToggle,
  onToggleAll,
  onOpenItem,
  onRetry,
}: {
  items: SpkMonitoringItem[];
  loading: boolean;
  error: string | null;
  hasData: boolean;
  selection: Record<number, SpkMonitoringItem>;
  sort: SpkSortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onSort: (key: SpkSortKey) => void;
  onPage: (page: number) => void;
  onToggle: (item: SpkMonitoringItem) => void;
  onToggleAll: (checked: boolean) => void;
  onOpenItem: (item: SpkMonitoringItem) => void;
  onRetry: () => void;
}) {
  const allOnPage =
    items.length > 0 && items.every((i) => selection[i.idBJ] != null);
  const someOnPage = items.some((i) => selection[i.idBJ] != null);
  const checkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkRef.current) {
      checkRef.current.indeterminate = someOnPage && !allOnPage;
    }
  }, [someOnPage, allOnPage]);

  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="max-h-[62vh] overflow-auto">
        <table className="w-full min-w-[1150px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: "#F8F9FB" }}>
              <th
                className="w-10 px-3 py-2.5"
                style={{ borderBottom: `1.5px solid ${BORDER}` }}
              >
                <input
                  ref={checkRef}
                  type="checkbox"
                  checked={allOnPage}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  className="h-4 w-4 accent-[#1E6FD9]"
                  aria-label="Pilih semua di halaman ini"
                />
              </th>
              <th
                className="w-12 px-2 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.4px]"
                style={{ borderBottom: `1.5px solid ${BORDER}`, color: MUTED }}
              >
                #
              </th>
              {COLUMNS.map((col, colIdx) => {
                const sortKey = col.key;
                return (
                  <th
                    key={sortKey ?? `col-${colIdx}`}
                    className={`px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.4px] ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                    style={{ borderBottom: `1.5px solid ${BORDER}`, color: MUTED }}
                  >
                    {sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSort(sortKey)}
                        className={`inline-flex items-center gap-1 hover:text-[#1E6FD9] ${
                          col.align === "right" ? "flex-row-reverse" : ""
                        }`}
                      >
                        {col.label}
                        <SpkSortIcon
                          className="h-3.5 w-3.5"
                          active={sort === sortKey}
                          direction={dir}
                        />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              <th
                className="px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.4px]"
                style={{ borderBottom: `1.5px solid ${BORDER}`, color: MUTED }}
              >
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && !hasData &&
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={`sk-${idx}`}>
                  <td colSpan={12} className="px-3 py-3">
                    <div
                      className="h-4 w-full animate-pulse rounded"
                      style={{ backgroundColor: "#EEF1F4" }}
                    />
                  </td>
                </tr>
              ))}

            {!loading && error && !hasData && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 text-xs font-bold text-[#1E6FD9] underline"
                  >
                    Coba Lagi
                  </button>
                </td>
              </tr>
            )}

            {!loading && !error && hasData && items.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <SpkInboxIcon style={{ width: 40, height: 40 }} />
                    <p className="text-sm">Tidak ada data yang cocok</p>
                  </div>
                </td>
              </tr>
            )}

            {!error &&
              items.map((item, idx) => {
                const selected = selection[item.idBJ] != null;
                const status = spkStatusMeta(item.status);
                return (
                  <tr
                    key={item.idBJ}
                    style={{
                      borderBottom: "1px solid #F0F2F5",
                      backgroundColor: selected ? "#F2F7FF" : undefined,
                    }}
                    className={loading ? "opacity-60" : undefined}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggle(item)}
                        className="h-4 w-4 accent-[#1E6FD9]"
                        aria-label={`Pilih ${item.namaBJ}`}
                      />
                    </td>
                    <td
                      className="px-2 py-2.5 text-xs"
                      style={{ color: MUTED }}
                    >
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td
                      className="px-3 py-2.5 text-[12.5px] font-semibold"
                      style={{ color: INK }}
                    >
                      {item.itemCode || "-"}
                    </td>
                    <td
                      className="max-w-[300px] truncate px-3 py-2.5 text-[12.5px]"
                      style={{ color: INK }}
                      title={item.namaBJ}
                    >
                      {item.namaBJ}
                    </td>
                    <td
                      className="px-3 py-2.5 text-xs font-semibold"
                      style={{ color: MUTED }}
                    >
                      {item.uom || "-"}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right text-[12.5px] font-bold"
                      style={{ color: item.stock <= 0 ? "#DC2626" : INK }}
                    >
                      {spkFormatNumber(item.stock)}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right text-[12.5px]"
                      style={{ color: INK }}
                    >
                      {spkFormatNumber(item.minStock)}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right text-[12.5px]"
                      style={{ color: INK }}
                    >
                      {spkFormatNumber(item.maxStock)}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right text-[12.5px]"
                      style={{ color: INK }}
                    >
                      {spkFormatNumber(item.mpq)}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right text-[12.5px] font-bold"
                      style={{ color: item.qtyRekomendasi > 0 ? PRIMARY : MUTED }}
                    >
                      {spkFormatNumber(item.qtyRekomendasi)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-bold"
                        style={{
                          backgroundColor: `${status.color}1A`,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenItem(item)}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
                        style={{ borderColor: BORDER }}
                      >
                        <SpkEyeIcon className="h-3.5 w-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div
        className="flex flex-wrap items-center gap-3 border-t px-4 py-3"
        style={{ borderColor: BORDER }}
      >
        <p className="text-xs" style={{ color: MUTED }}>
          {total} data
          {loading && hasData && (
            <Loader2Icon className="ml-2 inline h-3.5 w-3.5 animate-spin" />
          )}
        </p>
        <span className="min-w-0 flex-1" />
        <p className="text-xs" style={{ color: MUTED }}>
          Halaman {page} dari {totalPages}
        </p>
        <button
          type="button"
          disabled={!hasPrevPage || loading}
          onClick={() => onPage(page - 1)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          style={{ borderColor: BORDER }}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={!hasNextPage || loading}
          onClick={() => onPage(page + 1)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          style={{ borderColor: BORDER }}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
