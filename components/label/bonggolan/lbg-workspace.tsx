"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type { LbgHeader, LbgJenis } from "@/services/label-bonggolan-service";
import {
  createLbgAction,
  deleteLbgAction,
  getLbgHeadersAction,
  getLbgJenisAction,
  getLbgOutputsAction,
  getLbgPrintLocksAction,
  getLbgProduksiOptionsAction,
  printLbgLabelAction,
  updateLbgAction,
} from "@/app/(app)/label/bonggolan/actions";
import { LbgFormDialog } from "./lbg-form-dialog";
import { LbgHeaderTable } from "./lbg-header-table";
import { LbgDeleteDialog } from "./lbg-delete-dialog";
import { LbgRowPopover } from "./lbg-row-popover";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
};

export function LbgWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LbgHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ header: LbgHeader; x: number; y: number } | null>(null);
  const [formTarget, setFormTarget] = useState<{ header: LbgHeader | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LbgHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LbgHeader | null>(null);
  const [jenis, setJenis] = useState<LbgJenis[]>([]);
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
      const res = await getLbgHeadersAction({ page: 1, search: query, includeUsed });
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
    const res = await getLbgHeadersAction({ page: page + 1, search: query, includeUsed });
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
      const res = await getLbgHeadersAction({ page: 1, search: query, includeUsed });
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
      const res = await getLbgJenisAction();
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
      const res = await getLbgPrintLocksAction();
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
    const res = await getLbgPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LbgHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget({ header: null });
  }, [canCreate]);

  const openEdit = useCallback(
    (header: LbgHeader) => {
      if ((header.NoBongkarSusun ?? "").trim() !== "") {
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

  const openDelete = useCallback((header: LbgHeader) => {
    setDeleteTarget(header);
  }, []);

  const doPrint = useCallback(
    async (header: LbgHeader) => {
      if (printing) return;
      setPrinting(header.NoBonggolan);
      const res = await printLbgLabelAction(header.NoBonggolan);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoBonggolan);
      refreshList();
      void refreshLocks();
    },
    [printing, showFlash, refreshLocks, refreshList],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLbgAction(deleteTarget.NoBonggolan);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoBonggolan} berhasil dihapus`);
      setSelectedNo((cur) => (cur === deleteTarget.NoBonggolan ? null : cur));
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList],
  );

  const fetchProduksiOptions = useCallback(
    (mode: "broker" | "inject", tanggal: string) => getLbgProduksiOptionsAction({ mode, tanggal }),
    [],
  );

  const fetchOutputs = useCallback(
    (mode: "broker" | "inject", noProduksi: string) => getLbgOutputsAction({ mode, noProduksi }),
    [],
  );

  const submitCreate = useCallback(
    (args: { idBonggolan: number; dateCreate: string; berat: number; processedCode: string | null }) =>
      createLbgAction(args).then((res) => {
        if (res.ok) {
          showFlash(
            "success",
            res.noBonggolan
              ? `Label Bonggolan ${res.noBonggolan} berhasil dibuat`
              : "Label Bonggolan berhasil dibuat",
          );
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noBonggolan: string; dateCreate: string; idBonggolan: number; berat: number }) =>
      updateLbgAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noBonggolan} berhasil diperbarui`);
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
      <LbgHeaderTable
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
        <LbgRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canHistory={canHistory}
          printing={printing === popover.header.NoBonggolan}
          lock={locks[popover.header.NoBonggolan] ?? null}
          onEdit={() => openEdit(popover.header)}
          onDelete={() => openDelete(popover.header)}
          onPrint={() => void doPrint(popover.header)}
          onHistory={() => {
            const h = popover.header;
            closePopover();
            setHistoryTarget(h);
          }}
          onClose={closePopover}
        />
      )}

      {formTarget && (
        <LbgFormDialog
          header={formTarget.header}
          jenis={jenis}
          fetchingJenis={fetchingJenis}
          onClose={() => setFormTarget(null)}
          fetchProduksiOptions={fetchProduksiOptions}
          fetchOutputs={fetchOutputs}
          onSubmitCreate={submitCreate}
          onSubmitUpdate={submitUpdate}
        />
      )}

      {deleteTarget && (
        <LbgDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {historyTarget && (
        <AuditHistoryDialog
          documentNo={historyTarget.NoBonggolan}
          docLabel="No. Bonggolan"
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
