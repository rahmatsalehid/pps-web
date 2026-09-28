"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PbdRiwayat, PbdTim } from "@/services/penerimaan-barang-dagang-service";
import {
  getPbdListAction,
  getPbdTimStatusAction,
} from "@/app/(app)/warehouse/penerimaan-barang-dagang/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { pbdCardStatusOf } from "./pbd-format";
import { PbdSectionHeader, PbdTimCard } from "./pbd-tim-card";
import { PbdRiwayatList } from "./pbd-riwayat-list";
import { PbdCreateDialog } from "./pbd-create-dialog";

const PAGE_SIZE = 30;

export function PbdWorkspace() {
  const router = useRouter();

  const [tims, setTims] = useState<PbdTim[]>([]);
  const [timLoading, setTimLoading] = useState(true);
  const [timError, setTimError] = useState<string | null>(null);

  const [items, setItems] = useState<PbdRiwayat[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterIdTim, setFilterIdTim] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [createTim, setCreateTim] = useState<PbdTim | null>(null);

  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

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

  const loadTim = useCallback(async () => {
    const res = await getPbdTimStatusAction();
    setTimLoading(false);
    if (res.ok) {
      setTims(res.tims);
      setTimError(null);
    } else {
      setTimError(res.error);
    }
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, idTim: number | null) => {
      if (pageNum > 1) setLoadingMore(true);
      const res = await getPbdListAction({
        page: pageNum,
        pageSize: PAGE_SIZE,
      });
      setListLoading(false);
      setLoadingMore(false);
      if (!res.ok) {
        if (pageNum === 1) setItems([]);
        return;
      }
      const filtered =
        idTim == null ? res.items : res.items.filter((r) => r.idTim === idTim);
      setItems((prev) => (pageNum === 1 ? filtered : [...prev, ...filtered]));
      setPage(res.page);
      setTotalPages(res.totalPages);
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || listLoading || page >= totalPages) return;
    void loadPage(page + 1, filterIdTim);
  }, [loadingMore, listLoading, page, totalPages, filterIdTim, loadPage]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTim(), loadPage(1, filterIdTim)]);
  }, [loadTim, loadPage, filterIdTim]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [timRes, listRes] = await Promise.all([
        getPbdTimStatusAction(),
        getPbdListAction({ page: 1, pageSize: PAGE_SIZE }),
      ]);
      if (cancelled) return;
      setTimLoading(false);
      setListLoading(false);
      if (timRes.ok) {
        setTims(timRes.tims);
        setTimError(null);
      } else {
        setTimError(timRes.error);
      }
      if (listRes.ok) {
        setItems(listRes.items);
        setPage(listRes.page);
        setTotalPages(listRes.totalPages);
      } else {
        setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFilterChanged(id: number | null) {
    setFilterIdTim(id);
    setListLoading(true);
    void loadPage(1, id);
  }

  function openDetail(noPenerimaan: string) {
    void router.push(
      `/warehouse/penerimaan-barang-dagang/${encodeURIComponent(noPenerimaan)}`,
    );
  }

  function handleTimTap(tim: PbdTim) {
    if (!tim.isActive) {
      if (!tim.aktif) {
        showFlash(`Tim ${tim.namaTim} sedang tidak aktif`);
        return;
      }
      setCreateTim(tim);
      return;
    }
    if (tim.noPenerimaan) openDetail(tim.noPenerimaan);
  }

  // Counts ala MesinSectionHeader
  const activeCount = tims.filter(
    (t) => pbdCardStatusOf(t.tglPenerimaan) === "active",
  ).length;
  const pendingCount = tims.filter(
    (t) => pbdCardStatusOf(t.tglPenerimaan) === "pending",
  ).length;
  const inactiveCount = tims.length - activeCount - pendingCount;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      {/* Grid tim */}
      <div className="flex min-h-0 flex-1 flex-col">
        <PbdSectionHeader
          title="Penerimaan Barang Dagang"
          activeCount={activeCount}
          pendingCount={pendingCount}
          inactiveCount={inactiveCount}
          isLoading={timLoading}
          alwaysShowPending
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {timLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat tim…
            </div>
          ) : timError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="whitespace-pre-line text-xs text-[#64748B]">
                {`Gagal memuat tim\n${timError}`}
              </p>
              <button
                type="button"
                onClick={() => void refreshAll()}
                className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : tims.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Belum ada tim penerimaan
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tims.map((t) => (
                <PbdTimCard
                  key={t.idTim}
                  tim={t}
                  onClick={() => handleTimTap(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay drawer: Riwayat Penerimaan */}
      <div
        className={`absolute inset-y-0 right-0 z-20 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ${
          drawerOpen ? "" : "pointer-events-none translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="pointer-events-auto absolute left-0 top-1/2 z-30 inline-flex h-10 min-w-10 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-full border border-r-0 border-[#1D4ED8] bg-[#1D4ED8] pl-2 pr-2.5 text-xs font-semibold text-white shadow-lg transition-transform duration-300 hover:brightness-95"
          title={drawerOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
          tabIndex={0}
          aria-label={drawerOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
        >
          <span className="text-sm leading-none">{drawerOpen ? "›" : "‹"}</span>
        </button>

        <div className="flex min-h-0 flex-1 flex-col">
          <PbdRiwayatList
            items={items}
            isLoading={listLoading}
            isLoadingMore={loadingMore}
            hasMore={page < totalPages}
            filterIdTim={filterIdTim}
            timList={tims}
            onFilterChanged={handleFilterChanged}
            onRowClick={(row) => openDetail(row.noPenerimaan)}
            onReachEnd={loadMore}
            onRefresh={() => void refreshAll()}
            notify={showFlash}
          />
        </div>
      </div>

      {/* Create dialog (fase 1) */}
      {createTim && (
        <PbdCreateDialog
          tim={createTim}
          onClose={() => setCreateTim(null)}
          onCreated={(noPenerimaan) => {
            setCreateTim(null);
            void refreshAll();
            openDetail(noPenerimaan);
          }}
        />
      )}

      {/* Snack ala ScaffoldMessenger */}
      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-lg bg-gray-900/90 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg">
          {flash}
        </div>
      )}
    </div>
  );
}
