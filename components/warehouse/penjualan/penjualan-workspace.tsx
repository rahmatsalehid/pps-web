"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPenjualanListAction } from "@/app/(app)/warehouse/penjualan/actions";
import type {
  PenjualanHeader,
  PenjualanStatusFilter,
} from "@/services/penjualan-service";
import { Loader2Icon, PlusIcon, RotateCcwIcon, X } from "@/components/dashboard/icons";
import { PenjualanDetailPanel } from "./penjualan-detail";
import { PenjualanCreateDialog } from "./penjualan-create-dialog";

const PRIMARY = "#1E6FD9";
const SUCCESS = "#0A7349";
const BORDER = "#E2E6EA";
const PAGE_SIZE = 20;

type Filters = {
  status: PenjualanStatusFilter;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: Filters = { status: "incomplete", dateFrom: "", dateTo: "" };

const STATUS_OPTIONS: { value: PenjualanStatusFilter; label: string }[] = [
  { value: "incomplete", label: "Belum Complete" },
  { value: "complete", label: "Complete" },
  { value: "all", label: "Semua" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FilterDialog({
  value,
  onApply,
  onClose,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(value);
  const dateCls =
    "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-1";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5">
          <p className="text-sm font-bold text-gray-900">Filter Penjualan</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, status: o.value }))}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: draft.status === o.value ? PRIMARY : "#fff",
                    borderColor: draft.status === o.value ? PRIMARY : BORDER,
                    color: draft.status === o.value ? "#fff" : "#4B5563",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">
              Rentang Tanggal
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-gray-500">Dari</span>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                  className={dateCls}
                  style={{ borderColor: BORDER }}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-gray-500">Sampai</span>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                  className={dateCls}
                  style={{ borderColor: BORDER }}
                />
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onApply(DEFAULT_FILTERS)}
              className="flex-1 rounded-full border border-gray-300 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              RESET
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="flex-1 rounded-full py-2 text-xs font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              TERAPKAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Halaman Penjualan (sama dengan tablet): daftar Penjualan di kiri, detail
 * turnover + scan label di kanan.
 */
export function PenjualanWorkspace({
  canScan,
  canCreate = false,
  canDelete = false,
}: {
  canScan: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
}) {
  const [items, setItems] = useState<PenjualanHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Server kadang menyaring status per halaman sehingga totalPages tidak
  // akurat; terus coba halaman berikutnya sampai ada halaman kosong.
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const hasActiveFilter =
    filters.status !== "incomplete" || (!!filters.dateFrom && !!filters.dateTo);

  // Debounce pencarian 350 ms (sama dengan tablet).
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const buildParams = useCallback(
    (p: number) => ({
      page: p,
      pageSize: PAGE_SIZE,
      search,
      status: filters.status,
      // Rentang tanggal hanya berlaku bila keduanya terisi.
      ...(filters.dateFrom && filters.dateTo
        ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
        : {}),
    }),
    [search, filters],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getPenjualanListAction(buildParams(1));
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setExhausted(res.items.length === 0);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildParams, reloadKey]);

  async function loadMore() {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    const res = await getPenjualanListAction(buildParams(page + 1));
    setLoadingMore(false);
    if (res.ok) {
      if (res.items.length === 0) setExhausted(true);
      setItems((prev) => {
        const seen = new Set(prev.map((h) => h.noBJJual));
        return [...prev, ...res.items.filter((h) => !seen.has(h.noBJJual))];
      });
      setPage(Math.max(res.page, page + 1));
      setTotalPages(res.totalPages);
      setTotal(res.total);
    }
  }

  const refresh = () => setReloadKey((k) => k + 1);

  // Refresh senyap (setelah scan/ubah item): muat ulang halaman yang sudah
  // terbuka tanpa spinner agar posisi scroll & daftar tidak reset.
  async function silentRefresh() {
    const pages = Array.from({ length: page }, (_, i) => i + 1);
    const results = await Promise.all(
      pages.map((p) => getPenjualanListAction(buildParams(p))),
    );
    if (results.some((r) => !r.ok)) return;
    const oks = results.filter((r) => r.ok);
    const last = oks[oks.length - 1];
    if (!last) return;
    const seen = new Set<string>();
    const merged = oks
      .flatMap((r) => r.items)
      .filter((h) => !seen.has(h.noBJJual) && !!seen.add(h.noBJJual));
    setItems(merged);
    setTotalPages(last.totalPages);
    setTotal(last.total);
  }

  // Infinite scroll: sentinel di dasar daftar. IntersectionObserver bekerja
  // baik daftar yang di-scroll sendiri maupun halaman yang di-scroll, dan
  // memuat lagi bila 20 data belum memenuhi panel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = !exhausted && (page < totalPages || items.length > 0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, items.length, page]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      {/* Daftar */}
      <div
        className="relative flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-b bg-white lg:max-h-none lg:w-[400px] lg:border-b-0 lg:border-r"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-2 p-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari no. BJJual / pembeli..."
            className="h-10 min-w-0 flex-1 rounded-full border bg-gray-50 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            style={{ borderColor: BORDER }}
          />
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold"
            style={{
              borderColor: hasActiveFilter ? PRIMARY : BORDER,
              color: hasActiveFilter ? PRIMARY : "#4B5563",
            }}
          >
            Filter
            {hasActiveFilter && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: PRIMARY }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded p-2 text-gray-400 hover:bg-gray-100"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3"
        >
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : error ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-red-600">
              <span>{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              Tidak ada data Penjualan.
            </div>
          ) : (
            <>
              {items.map((h) => {
                const isSel = selected === h.noBJJual;
                return (
                  <button
                    key={h.noBJJual}
                    type="button"
                    onClick={() => setSelected(h.noBJJual)}
                    className="flex w-full overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-sm"
                    style={{
                      borderColor: isSel ? PRIMARY : BORDER,
                      boxShadow: isSel ? `0 0 0 1px ${PRIMARY}` : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 shrink-0"
                      style={{ backgroundColor: h.isComplete ? SUCCESS : "#D97706" }}
                    />
                    <div className="min-w-0 flex-1 p-3">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-gray-900">
                          {h.noBJJual}
                        </p>
                        <span
                          className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: h.isComplete ? "#ECFDF5" : "#FFFBEB",
                            color: h.isComplete ? SUCCESS : "#B45309",
                          }}
                        >
                          {h.isComplete ? "Complete" : "Belum Complete"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-700">
                        {h.namaPembeli || `Pembeli #${h.idPembeli}`}
                      </p>
                      {h.invoiceType && (
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          Invoice:{" "}
                          <span className="font-semibold text-gray-700">
                            {h.invoiceType}
                          </span>
                        </p>
                      )}
                      {h.remark && (
                        <p className="truncate text-[11px] text-gray-500">{h.remark}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{fmtDate(h.tanggal)}</span>
                        <span className="font-semibold text-gray-700">
                          Turnover {h.completedLines}/{h.totalLines}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
              {!loadingMore && (
                <div className="flex flex-col items-center gap-1.5 py-2 text-[11px] text-gray-400">
                  <span>
                    Menampilkan {items.length}
                    {total > 0 ? ` dari ${total}` : ""} data
                  </span>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      className="rounded-full border px-4 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      style={{ borderColor: BORDER }}
                    >
                      Muat 20 data lagi
                    </button>
                  )}
                </div>
              )}
              {loadingMore && (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400">
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat
                  data berikutnya…
                </div>
              )}
            </>
          )}
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition hover:brightness-110"
            style={{ backgroundColor: PRIMARY }}
            title="Buat Penjualan Baru"
            aria-label="Buat Penjualan Baru"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Detail */}
      <div className="min-h-0 min-w-0 flex-1 bg-[#F3F5F8]">
        {selected ? (
          <PenjualanDetailPanel
            key={selected}
            noBJJual={selected}
            canScan={canScan}
            canCreate={canCreate}
            canDelete={canDelete}
            onDeleted={() => {
              setSelected(null);
              refresh();
            }}
            onChanged={() => void silentRefresh()}
            onCompleted={() => void silentRefresh()}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-400">
            Pilih Penjualan dari daftar di sebelah kiri
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterDialog
          value={filters}
          onClose={() => setFilterOpen(false)}
          onApply={(f) => {
            setFilters(f);
            setFilterOpen(false);
          }}
        />
      )}

      {createOpen && (
        <PenjualanCreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(noBJJual) => {
            // Refresh daftar di belakang layar sukses; dialog ditutup user.
            setSelected(noBJJual);
            setFilters(DEFAULT_FILTERS);
            setSearchInput("");
            setSearch("");
            refresh();
          }}
        />
      )}
    </div>
  );
}
