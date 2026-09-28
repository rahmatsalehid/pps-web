"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTradeInListAction } from "@/app/(app)/warehouse/trade-in/actions";
import type { TradeInRow } from "@/services/trade-in-service";
import { Loader2Icon, PlusIcon, X } from "@/components/dashboard/icons";
import { SearchIcon } from "./trade-in-icons";
import { TradeInFormDialog } from "./trade-in-form-dialog";
import { TradeInPreviewDialog } from "./trade-in-preview-dialog";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const SELECTED_BG = "#E9F2FF";
const PAGE_SIZE = 20;

export function TradeInWorkspace() {
  const [items, setItems] = useState<TradeInRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<TradeInRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getTradeInListAction({
        page: 1,
        pageSize: PAGE_SIZE,
        filter: query,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getTradeInListAction({
      page: page + 1,
      pageSize: PAGE_SIZE,
      filter: query,
    });
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    }
  }, [loadingMore, page, totalPages, query]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = page < totalPages;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadingMore, items.length, page, loadMore]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 items-center gap-2 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. penerimaan / supplier / sales person..."
            className="h-9 w-full rounded-[10px] border bg-[#F8F9FB] pl-9 pr-9 text-sm outline-none transition focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={{ borderColor: BORDER }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          Muat Ulang
        </button>
      </div>

      {flash && (
        <div className="shrink-0 border-b border-green-200 bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-700">
          {flash}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div
          className="min-w-[810px] overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "#DCDFE4" }}
        >
          <table
            className="w-full border-collapse text-left"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: 130 }} />
              <col style={{ width: 200 }} />
              <col style={{ width: 220 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                {["TANGGAL", "SALES PERSON", "SUPPLIER", "REJECT"].map((h) => (
                  <th
                    key={h}
                    className="border-b px-4 text-[11px] font-bold tracking-[0.35px] text-[#44546F]"
                    style={{
                      height: 50,
                      borderColor: "#DCDFE4",
                      background: "linear-gradient(#FCFDFE, #F7F8F9)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-red-600">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={refresh}
                      className="mt-2 block w-full rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
                    >
                      Coba lagi
                    </button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[13.5px] text-gray-500"
                  >
                    {query
                      ? "Tidak ada penerimaan yang cocok"
                      : "Belum ada penerimaan trade-in"}
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <TradeInRowCells
                    key={row.noPenerimaan}
                    row={row}
                    striped={index % 2 === 1}
                    selected={row.noPenerimaan === previewRow?.noPenerimaan}
                    onTap={() => setPreviewRow(row)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 py-3 text-[11px] text-gray-400">
            <span>
              Menampilkan {items.length} data{total > 0 ? ` dari ${total}` : ""}
            </span>
            {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
            {hasMore && !loadingMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                className="rounded-full border px-4 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                style={{ borderColor: BORDER }}
              >
                Muat {PAGE_SIZE} data lagi
              </button>
            )}
            {loadingMore && (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat data
                berikutnya…
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="absolute bottom-5 right-6 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:brightness-95"
        style={{ backgroundColor: PRIMARY }}
        aria-label="Penerimaan baru"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {createOpen && (
        <TradeInFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={(noPenerimaan) => {
            setCreateOpen(false);
            showFlash(`${noPenerimaan} berhasil disimpan`);
            refresh();
          }}
        />
      )}

      {previewRow && (
        <TradeInPreviewDialog
          row={previewRow}
          onClose={() => setPreviewRow(null)}
          onDeleted={(noPenerimaan) => {
            setPreviewRow(null);
            showFlash(`${noPenerimaan} berhasil dihapus`);
            refresh();
          }}
          onPrinted={() => refresh()}
        />
      )}
    </div>
  );
}

function TradeInRowCells({
  row,
  striped,
  selected,
  onTap,
}: {
  row: TradeInRow;
  striped: boolean;
  selected: boolean;
  onTap: () => void;
}) {
  const reject = row.reject;
  return (
    <tr
      onClick={onTap}
      className="cursor-pointer transition"
      style={{
        backgroundColor: selected ? SELECTED_BG : striped ? "#FAFBFC" : "#fff",
        borderBottom: "1px solid #EBECF0",
        boxShadow: selected ? `inset 3px 0 0 0 ${PRIMARY}` : undefined,
      }}
    >
      <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: selected ? "#0C66E4" : "#1A1D23" }}>
        {row.tanggal}
      </td>
      <td className="truncate px-4 py-2.5 text-[13px] text-[#4B5563]">
        {row.salesPersonName || "-"}
      </td>
      <td className="truncate px-4 py-2.5 text-[13px] font-medium text-[#374151]">
        {row.supplier || "-"}
      </td>
      <td className="truncate px-4 py-2.5 text-[13px] text-[#4B5563]">
        {reject ? `${reject.namaReject} · ${formatWeight(reject.berat)} kg` : "-"}
      </td>
    </tr>
  );
}

function formatWeight(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}
