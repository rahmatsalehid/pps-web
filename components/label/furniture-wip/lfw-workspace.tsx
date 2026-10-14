"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LfwHeader,
  LfwJenis,
  LfwPartialInfo,
  LfwSourceMode,
} from "@/services/label-furniture-wip-service";
import {
  createLfwAction,
  deleteLfwAction,
  getLfwHeadersAction,
  getLfwInjectCandidatesAction,
  getLfwJenisAction,
  getLfwOutputsAction,
  getLfwPartialInfoAction,
  getLfwPrintLocksAction,
  getLfwProduksiOptionsAction,
  printLfwLabelAction,
  updateLfwAction,
} from "@/app/(app)/label/furniture-wip/actions";
import { LfwFormDialog } from "./lfw-form-dialog";
import { LfwHeaderTable } from "./lfw-header-table";
import { LfwDeleteDialog } from "./lfw-delete-dialog";
import { LfwRowPopover } from "./lfw-row-popover";
import { LfwPartialPopover } from "./lfw-partial-popover";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
};

export function LfwWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LfwHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ header: LfwHeader; x: number; y: number } | null>(null);
  const [formTarget, setFormTarget] = useState<{ header: LfwHeader | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LfwHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LfwHeader | null>(null);
  const [partialTarget, setPartialTarget] = useState<{
    header: LfwHeader;
    x: number;
    y: number;
  } | null>(null);
  const [partialInfo, setPartialInfo] = useState<LfwPartialInfo | null>(null);
  const [partialLoading, setPartialLoading] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);

  const [jenis, setJenis] = useState<LfwJenis[]>([]);
  const [fetchingJenis, setFetchingJenis] = useState(false);

  const [locks, setLocks] = useState<Record<string, LbPrintLock>>({});
  const [printing, setPrinting] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const flashTimer = useRef<number | null>(null);

  const showFlash = useCallback((kind: Flash["kind"], text: string) => {
    setFlash({ kind, text });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 500);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingHeaders(true);
      const res = await getLfwHeadersAction({ page: 1, search: query, includeUsed });
      if (cancelled) return;
      setLoadingHeaders(false);
      if (res.ok) {
        setHeaders(res.headers);
        setPage(1);
        setTotalPages(res.totalPages);
        setHeadersError(null);
      } else {
        setHeaders([]);
        setHeadersError(res.error);
      }
      setSelectedNo(null);
      setPopover(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, includeUsed]);

  const loadMore = useCallback(async () => {
    if (loadingHeaders || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getLfwHeadersAction({ page: page + 1, search: query, includeUsed });
    setLoadingMore(false);
    if (res.ok) {
      setHeaders((prev) => [...prev, ...res.headers]);
      setPage(page + 1);
      setTotalPages(res.totalPages);
    }
  }, [loadingHeaders, loadingMore, page, totalPages, query, includeUsed]);

  const refreshList = useCallback(() => {
    void (async () => {
      setLoadingHeaders(true);
      const res = await getLfwHeadersAction({ page: 1, search: query, includeUsed });
      setLoadingHeaders(false);
      if (res.ok) {
        setHeaders(res.headers);
        setPage(1);
        setTotalPages(res.totalPages);
        setHeadersError(null);
      } else {
        setHeadersError(res.error);
      }
    })();
  }, [query, includeUsed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFetchingJenis(true);
      const res = await getLfwJenisAction();
      if (cancelled) return;
      setFetchingJenis(false);
      if (res.ok) setJenis(res.jenis);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLfwPrintLocksAction();
      if (cancelled || !res.ok) return;
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    };
    void load();
    const iv = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);

  const refreshLocks = useCallback(async () => {
    const res = await getLfwPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LfwHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget({ header: null });
  }, [canCreate]);

  const openEdit = useCallback(
    (header: LfwHeader) => {
      if (header.IsPartial) {
        showFlash("error", "Label partial tidak dapat diedit.");
        return;
      }
      if ((header.OutputCode ?? "").trim().startsWith("BG.")) {
        showFlash(
          "error",
          "Label yang berasal dari Bongkar Susun tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      setFormTarget({ header });
    },
    [showFlash],
  );

  const openDelete = useCallback((header: LfwHeader) => {
    if (header.IsPartial) {
      return;
    }
    setDeleteTarget(header);
  }, []);

  const openPartial = useCallback(
    (header: LfwHeader, x: number, y: number) => {
      setPartialTarget({ header, x, y });
      setPartialInfo(null);
      setPartialError(null);
      setPartialLoading(true);
      void (async () => {
        const res = await getLfwPartialInfoAction(header.NoFurnitureWIP);
        setPartialLoading(false);
        if (res.ok) setPartialInfo(res.info);
        else setPartialError(res.error);
      })();
    },
    [],
  );

  const closePartial = useCallback(() => setPartialTarget(null), []);

  const doPrint = useCallback(
    async (header: LfwHeader) => {
      if (printing) return;
      setPrinting(header.NoFurnitureWIP);
      const res = await printLfwLabelAction(header.NoFurnitureWIP);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoFurnitureWIP);
      refreshList();
      void refreshLocks();
    },
    [printing, showFlash, refreshLocks, refreshList],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLfwAction(deleteTarget.NoFurnitureWIP);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoFurnitureWIP} berhasil dihapus`);
      setSelectedNo((cur) => (cur === deleteTarget.NoFurnitureWIP ? null : cur));
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList],
  );

  const fetchProduksiOptions = useCallback(
    (mode: LfwSourceMode, tanggal: string) => getLfwProduksiOptionsAction(mode, tanggal),
    [],
  );

  const fetchOutputs = useCallback(
    (mode: LfwSourceMode, noProduksi: string) => getLfwOutputsAction(mode, noProduksi),
    [],
  );

  const fetchInjectCandidates = useCallback(
    (noProduksi: string) => getLfwInjectCandidatesAction(noProduksi),
    [],
  );

  const submitCreate = useCallback(
    (args: {
      mode: LfwSourceMode;
      noProduksi: string;
      dateCreate: string;
      pcs: number;
      berat: number | null;
      idJenisList: number[];
      printMode: "single" | "multiple" | "quick";
      quickCount: number;
    }) =>
      createLfwAction(args).then(async (res) => {
        if (res.ok) {
          const nos = res.nos;
          showFlash(
            "success",
            nos.length === 1
              ? `Label Furniture WIP ${nos[0]} berhasil dibuat`
              : `${nos.length} label Furniture WIP berhasil dibuat`,
          );
          refreshList();
          if (args.printMode !== "single" && nos.length > 0) {
            const rounds = args.printMode === "quick" ? args.quickCount : 1;
            for (let i = 0; i < rounds; i++) {
              for (const no of nos) {
                const p = await printLfwLabelAction(no);
                if (p.ok) printPdfBase64(p.pdfBase64, no);
              }
            }
            refreshList();
            void refreshLocks();
          }
        }
        return res;
      }),
    [showFlash, refreshList, refreshLocks],
  );

  const submitUpdate = useCallback(
    (args: {
      noFurnitureWip: string;
      dateCreate: string;
      idJenis: number;
      pcs: number;
      berat: number | null;
    }) =>
      updateLfwAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noFurnitureWip} berhasil diperbarui`);
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const flashStyle =
    flash?.kind === "success"
      ? { backgroundColor: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
      : flash?.kind === "warning"
        ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }
        : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#7F1D1D" };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-[#F3F5F8] p-3">
      <LfwHeaderTable
        className="min-h-0 flex-1"
        search={search}
        onSearch={setSearch}
        includeUsed={includeUsed}
        onToggleIncludeUsed={() => setIncludeUsed((v) => !v)}
        canCreate={canCreate}
        onCreate={openCreate}
        headers={headers}
        loading={loadingHeaders}
        error={headersError}
        selectedNo={selectedNo}
        onSelect={setSelectedNo}
        onOpenPopover={openPopover}
        locks={locks}
        hasMore={page < totalPages}
        loadingMore={loadingMore}
        onReachEnd={() => void loadMore()}
      />

      {popover && (
        <LfwRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canHistory={canHistory}
          printing={printing === popover.header.NoFurnitureWIP}
          lock={locks[popover.header.NoFurnitureWIP] ?? null}
          onEdit={() => openEdit(popover.header)}
          onDelete={() => openDelete(popover.header)}
          onPrint={() => void doPrint(popover.header)}
          onHistory={() => {
            const h = popover.header;
            closePopover();
            setHistoryTarget(h);
          }}
          onInfoPartial={() => {
            const h = popover.header;
            const { x, y } = popover;
            closePopover();
            openPartial(h, x, y);
          }}
          onClose={closePopover}
        />
      )}

      {partialTarget && (
        <LfwPartialPopover
          headerNo={partialTarget.header.NoFurnitureWIP}
          info={partialInfo}
          isLoading={partialLoading}
          error={partialError}
          x={partialTarget.x}
          y={partialTarget.y}
          onClose={closePartial}
        />
      )}

      {formTarget && (
        <LfwFormDialog
          header={formTarget.header}
          jenis={jenis}
          fetchingJenis={fetchingJenis}
          onClose={() => setFormTarget(null)}
          fetchProduksiOptions={fetchProduksiOptions}
          fetchOutputs={fetchOutputs}
          fetchInjectCandidates={fetchInjectCandidates}
          onSubmitCreate={submitCreate}
          onSubmitUpdate={submitUpdate}
        />
      )}

      {deleteTarget && (
        <LfwDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {historyTarget && (
        <AuditHistoryDialog
          documentNo={historyTarget.NoFurnitureWIP}
          docLabel="No. Furniture WIP"
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {flash && (
        <div
          className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-2.5 text-[13px] font-semibold shadow-lg"
          style={flashStyle}
        >
          {flash.text}
        </div>
      )}
    </div>
  );
}
