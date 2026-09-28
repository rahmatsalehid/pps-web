"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GilinganMesinInfo,
  GilinganActiveShift,
  GilinganProduction,
} from "@/services/gilingan-service";
import {
  getGilinganMesinAction,
  getGilinganListAction,
} from "@/app/(app)/production/gilingan/actions";
import { MesinCard, MesinSectionHeader } from "./mesin-card";
import { ProductionList } from "./production-list";
import { ProductionFormDialog } from "./production-form-dialog";
import { DrawerTabSwitcher, StokItemPanel } from "./stok-item-panel";
import {
  HistoryIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
} from "@/components/dashboard/icons";

const PRIMARY = "#0277BD";
const PAGE_SIZE = 50;

type DrawerTab = "riwayat" | "stok";

export function GilinganWorkspace() {
  const router = useRouter();

  const [mesinList, setMesinList] = useState<GilinganMesinInfo[]>([]);
  const [activeShift, setActiveShift] = useState<GilinganActiveShift | null>(null);
  const [mesinLoading, setMesinLoading] = useState(true);
  const [mesinError, setMesinError] = useState<string | null>(null);

  const [items, setItems] = useState<GilinganProduction[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterIdMesin, setFilterIdMesin] = useState<number | null>(null);
  const [selectedMesinInfo, setSelectedMesinInfo] = useState<GilinganMesinInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("riwayat");

  // Create dialog
  const [createForm, setCreateForm] = useState<{
    mesin: GilinganMesinInfo | null;
    open: boolean;
    /** true = backdate (tanggal editable) */
    backdate: boolean;
  }>({ mesin: null, open: false, backdate: false });

  const loadMesin = useCallback(async () => {
    const res = await getGilinganMesinAction();
    setMesinLoading(false);
    if (res.ok) {
      setMesinList(res.mesinList);
      setActiveShift(res.activeShift);
    } else {
      setMesinError(res.error);
    }
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, idMesin: number | null) => {
      if (pageNum > 1) setLoadingMore(true);
      const res = await getGilinganListAction({
        page: pageNum,
        pageSize: PAGE_SIZE,
        idMesin: idMesin ?? undefined,
      });
      setListLoading(false);
      setLoadingMore(false);
      if (res.ok) {
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setPage(res.page);
        setHasMore(res.page < res.totalPages);
      }
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || listLoading || !hasMore) return;
    void loadPage(page + 1, filterIdMesin);
  }, [loadingMore, listLoading, hasMore, page, filterIdMesin, loadPage]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadMesin(), loadPage(1, filterIdMesin)]);
  }, [loadMesin, loadPage, filterIdMesin]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [mesinRes, listRes] = await Promise.all([
        getGilinganMesinAction(),
        getGilinganListAction({
          page: 1,
          pageSize: PAGE_SIZE,
          idMesin: filterIdMesin ?? undefined,
        }),
      ]);
      if (cancelled) return;
      setMesinLoading(false);
      setListLoading(false);
      if (mesinRes.ok) {
        setMesinList(mesinRes.mesinList);
        setActiveShift(mesinRes.activeShift);
      } else {
        setMesinError(mesinRes.error);
      }
      if (listRes.ok) {
        setItems(listRes.items);
        setPage(listRes.page);
        setHasMore(listRes.page < listRes.totalPages);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterIdMesin]);

  function handleFilterChanged(id: number | null) {
    setFilterIdMesin(id);
    const mesin = id == null ? null : mesinList.find((m) => m.idMesin === id) ?? null;
    setSelectedMesinInfo(mesin);
    setListLoading(true);
    void loadPage(1, id);
  }

  function handleMesinTap(mesin: GilinganMesinInfo) {
    if (mesin.noProduksi) {
      void router.push(`/production/gilingan/${encodeURIComponent(mesin.noProduksi)}`);
    } else {
      setCreateForm({ mesin, open: true, backdate: false });
    }
  }

  function handleRowClick(row: GilinganProduction) {
    void router.push(`/production/gilingan/${encodeURIComponent(row.noProduksi)}`);
  }

  // Counts
  const activeCount = mesinList.filter((m) => m.machineStatus === "active").length;
  const pendingCount = mesinList.filter((m) => m.machineStatus === "pending").length;
  const inactiveCount = mesinList.filter((m) => !m.noProduksi).length;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* Mesin grid area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <MesinSectionHeader
          title="Status Mesin Gilingan"
          activeCount={activeCount}
          pendingCount={pendingCount}
          inactiveCount={inactiveCount}
          isLoading={mesinLoading}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mesinLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat mesin…
            </div>
          ) : mesinError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-gray-500">
              <span>Gagal memuat mesin</span>
              <span className="text-xs text-red-500">{mesinError}</span>
              <button
                type="button"
                onClick={() => void refreshAll()}
                className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {mesinList.map((m) => (
                <MesinCard key={m.idMesin} mesin={m} onClick={() => handleMesinTap(m)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay drawer: Riwayat — absolute, tidak mempengaruhi lebar halaman */}
      <div
        className={`absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ${
          drawerOpen ? "" : "pointer-events-none translate-x-full"
        }`}
      >
        {/* Toggle — sibling posisi di luar panel (kiri), mengikuti edge panel
            seperti ProductionOverlayDrawer di tablet. */}
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className="pointer-events-auto absolute left-0 top-1/2 z-30 inline-flex h-10 min-w-10 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-full border border-r-0 border-slate-700 bg-slate-800 pl-2 pr-2.5 text-xs font-semibold text-white shadow-lg transition-transform duration-300 hover:bg-slate-700"
          title={drawerOpen ? "Tutup panel" : "Buka Riwayat / Stok Item"}
          tabIndex={0}
          aria-label={drawerOpen ? "Tutup panel" : "Buka Riwayat / Stok Item"}
        >
          <span className="text-sm leading-none">{drawerOpen ? "›" : "‹"}</span>
        </button>

        {/* Tab: Riwayat Produksi | Stok Item (ala tablet SidebarTabSwitcher) */}
        <DrawerTabSwitcher
          value={drawerTab}
          onChange={(id) => setDrawerTab(id as DrawerTab)}
          tabs={[
            {
              id: "riwayat",
              label: "Riwayat Produksi",
              icon: <HistoryIcon className="h-3.5 w-3.5" />,
            },
            {
              id: "stok",
              label: "Stok Item",
              icon: <PackageIcon className="h-3.5 w-3.5" />,
            },
          ]}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {drawerTab === "riwayat" ? (
            <ProductionList
              items={items}
              isLoading={listLoading}
              isLoadingMore={loadingMore}
              hasMore={hasMore}
              filterIdMesin={filterIdMesin}
              mesinList={mesinList}
              onFilterChanged={handleFilterChanged}
              onRowClick={handleRowClick}
              onRefresh={refreshAll}
              onReachEnd={loadMore}
            />
          ) : (
            <StokItemPanel />
          )}
        </div>

        {/* FAB backdate when mesin selected */}
        {selectedMesinInfo && (
          <button
            type="button"
            onClick={() =>
              setCreateForm({
                mesin: selectedMesinInfo,
                open: true,
                backdate: true,
              })
            }
            className="absolute bottom-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full text-white shadow-lg"
            style={{ backgroundColor: PRIMARY }}
            title="Tambah Backdate"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Create dialog */}
      {createForm.open && (
        <ProductionFormDialog
          initialMesin={createForm.mesin}
          activeShift={activeShift}
          isDateEditable={createForm.backdate}
          onClose={() => setCreateForm({ mesin: null, open: false, backdate: false })}
          onSaved={(noProduksi) => {
            setCreateForm({ mesin: null, open: false, backdate: false });
            void refreshAll();
            void router.push(`/production/gilingan/${encodeURIComponent(noProduksi)}`);
          }}
        />
      )}
    </div>
  );
}
