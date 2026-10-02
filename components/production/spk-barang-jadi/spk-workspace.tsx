"use client";

import { useEffect, useState } from "react";
import {
  createSpkAction,
  getSpkDetailAction,
  getSpkHistoryAction,
  getSpkMonitoringAction,
} from "@/app/(app)/production/spk-barang-jadi/actions";
import type {
  SpkDetail,
  SpkHistoryItem,
  SpkMonitoringItem,
  SpkMonitoringResult,
  SpkSortKey,
} from "@/services/spk-barang-jadi-service";
import { Loader2Icon, RotateCcwIcon, X } from "@/components/dashboard/icons";
import { SPK_STATUS_OPTIONS, spkFormatNumber } from "./spk-format";
import { SpkSearchIcon } from "./spk-icons";
import { SpkTable } from "./spk-table";
import { SpkSummaryCards } from "./spk-summary-cards";
import { SpkCreateDialog } from "./spk-create-dialog";
import { SpkSuccessDialog } from "./spk-success-dialog";
import { SpkDetailDialog } from "./spk-detail-dialog";
import { SpkItemDrawer } from "./spk-item-drawer";
import { spkPrintSpk } from "./spk-print";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const MUTED = "#6B7280";
const INK = "#1A1D23";
const PAGE_SIZE = 20;

export function SpkWorkspace() {
  const [data, setData] = useState<SpkMonitoringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SpkSortKey>("barang");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [selection, setSelection] = useState<Record<number, SpkMonitoringItem>>(
    {},
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<SpkDetail | null>(null);

  const [viewNoSpk, setViewNoSpk] = useState<string | null>(null);
  const [viewReloadKey, setViewReloadKey] = useState(0);
  const [viewDetail, setViewDetail] = useState<SpkDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const [drawerItem, setDrawerItem] = useState<SpkMonitoringItem | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<SpkHistoryItem[] | null>(
    null,
  );
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(search.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSpkMonitoringAction({
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        status,
        sort,
        dir,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setData(res);
        setError(null);
      } else {
        setData(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, status, sort, dir, reloadKey]);

  useEffect(() => {
    if (!viewNoSpk) return;
    let cancelled = false;
    void (async () => {
      setViewLoading(true);
      setViewError(null);
      setViewDetail(null);
      const res = await getSpkDetailAction(viewNoSpk);
      if (cancelled) return;
      setViewLoading(false);
      if (res.ok) setViewDetail(res.detail);
      else setViewError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewNoSpk, viewReloadKey]);

  useEffect(() => {
    if (!drawerItem) return;
    let cancelled = false;
    void (async () => {
      setDrawerLoading(true);
      setDrawerError(null);
      setDrawerHistory(null);
      const res = await getSpkHistoryAction(drawerItem.idBJ);
      if (cancelled) return;
      setDrawerLoading(false);
      if (res.ok) setDrawerHistory(res.items);
      else setDrawerError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [drawerItem]);

  const selectedKeys = Object.keys(selection);
  const selectedCount = selectedKeys.length;
  const selectedTotalQty = Object.values(selection).reduce(
    (sum, item) => sum + item.qtyRekomendasi,
    0,
  );

  const toggleSelect = (item: SpkMonitoringItem) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[item.idBJ] != null) delete next[item.idBJ];
      else next[item.idBJ] = item;
      return next;
    });
  };

  const toggleAllPage = (checked: boolean) => {
    const items = data?.items ?? [];
    setSelection((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (checked) next[item.idBJ] = item;
        else delete next[item.idBJ];
      }
      return next;
    });
  };

  const handleSort = (key: SpkSortKey) => {
    if (key === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir("asc");
    }
    setPage(1);
  };

  const handleSelectStatus = (next: string) => {
    setStatus(next);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const confirmCreate = async (payload: {
    items: Array<{ idBJ: number; qtySpk: number }>;
    keterangan: string;
  }) => {
    setCreateBusy(true);
    setCreateError(null);
    const res = await createSpkAction({
      items: payload.items,
      keterangan: payload.keterangan || null,
    });
    setCreateBusy(false);
    if (res.ok) {
      setCreateOpen(false);
      setSuccessDetail(res.detail);
      setSelection({});
      setReloadKey((k) => k + 1);
    } else {
      setCreateError(res.error);
    }
  };

  const openViewSpk = (noSpk: string) => {
    setSuccessDetail(null);
    setViewNoSpk(noSpk);
  };

  const closeViewSpk = () => {
    setViewNoSpk(null);
    setViewDetail(null);
    setViewError(null);
  };

  const items = data?.items ?? [];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8]">
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-6 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-[#1A1D23]">
              SPK Produksi Barang Jadi
            </h1>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Monitoring stok barang jadi dan rekomendasi qty produksi
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-[10px] border bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            <RotateCcwIcon className="h-4 w-4" />
            Muat Ulang
          </button>
        </div>

        <div className="mt-4">
          <SpkSummaryCards
            summary={data?.summary ?? null}
            loading={loading}
            activeStatus={status}
            onSelectStatus={handleSelectStatus}
          />
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-white p-3"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="relative min-w-[220px] flex-1 sm:max-w-[380px]">
            <SpkSearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              style={{ width: 16, height: 16 }}
            />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari item code / nama barang..."
              className="h-10 w-full rounded-[10px] border bg-[#F3F5F8] pl-9 pr-8 text-sm outline-none transition focus:border-[#1E6FD9]"
              style={{ borderColor: BORDER }}
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(e) => handleSelectStatus(e.target.value)}
            className="h-10 rounded-[10px] border bg-[#F3F5F8] px-3 text-sm outline-none transition focus:border-[#1E6FD9]"
            style={{ borderColor: BORDER, color: INK }}
            aria-label="Filter status"
          >
            {SPK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <span className="min-w-0 flex-1" />

          {loading && (
            <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" />
          )}
          <p className="text-xs" style={{ color: MUTED }}>
            Menampilkan {items.length} dari {data?.total ?? 0} barang
          </p>
        </div>

        <div className="mt-4">
          <SpkTable
            items={items}
            loading={loading}
            error={error}
            hasData={data != null}
            selection={selection}
            sort={sort}
            dir={dir}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={data?.meta.totalPages ?? 1}
            total={data?.total ?? 0}
            hasNextPage={data?.meta.hasNextPage ?? false}
            hasPrevPage={data?.meta.hasPrevPage ?? false}
            onSort={handleSort}
            onPage={setPage}
            onToggle={toggleSelect}
            onToggleAll={toggleAllPage}
            onOpenItem={(item) => setDrawerItem(item)}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto w-full max-w-[1560px] px-4 sm:px-6">
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_6px_24px_rgba(15,23,42,0.14)]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-[#6B7280]">
                {selectedCount} barang dipilih
              </p>
              <p className="text-sm font-extrabold text-[#1A1D23]">
                Total Qty (rekomendasi): {spkFormatNumber(selectedTotalQty)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection({})}
              className="rounded-md border px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Batalkan Pilihan
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              className="rounded-md px-5 py-2.5 text-[13px] font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Buat SPK
            </button>
          </div>
        </div>
      )}

      {createOpen && (
        <SpkCreateDialog
          key={selectedKeys.join(",")}
          items={Object.values(selection)}
          busy={createBusy}
          error={createError}
          onCancel={() => {
            if (!createBusy) setCreateOpen(false);
          }}
          onConfirm={(payload) => void confirmCreate(payload)}
        />
      )}

      {successDetail && (
        <SpkSuccessDialog
          detail={successDetail}
          onClose={() => setSuccessDetail(null)}
          onView={() => openViewSpk(successDetail.noSpk)}
          onPrint={() => spkPrintSpk(successDetail)}
        />
      )}

      {viewNoSpk && (
        <SpkDetailDialog
          noSpk={viewNoSpk}
          loading={viewLoading}
          error={viewError}
          detail={viewDetail}
          onClose={closeViewSpk}
          onPrint={() => {
            if (viewDetail) spkPrintSpk(viewDetail);
          }}
          onRetry={() => setViewReloadKey((k) => k + 1)}
        />
      )}

      <SpkItemDrawer
        item={drawerItem}
        history={drawerHistory}
        historyLoading={drawerLoading}
        historyError={drawerError}
        selected={drawerItem != null && selection[drawerItem.idBJ] != null}
        onClose={() => setDrawerItem(null)}
        onToggleSelect={toggleSelect}
      />
    </div>
  );
}
