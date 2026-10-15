"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LglHeader,
  LglJenis,
  LglPartialInfo,
  LglSavePayload,
} from "@/services/label-gilingan-service";
import {
  createGlgAction,
  deleteGlgAction,
  getLglHeadersAction,
  getLglJenisAction,
  getLglOutputsAction,
  getLglPartialInfoAction,
  getLglPrintLocksAction,
  getLglProduksiOptionsAction,
  printGlgLabelAction,
  updateGlgAction,
} from "@/app/(app)/label/gilingan/actions";
import { LglHeaderTable } from "./lgl-header-table";
import { LglRowPopover } from "./lgl-row-popover";
import { LglFormDialog } from "./lgl-form-dialog";
import { LglDeleteDialog } from "./lgl-delete-dialog";
import { LglPartialPopover } from "./lgl-partial-popover";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
};

export function LglWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LglHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [popover, setPopover] = useState<{
    header: LglHeader;
    x: number;
    y: number;
  } | null>(null);
  const [formCreateOpen, setFormCreateOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<LglHeader | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LglHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LglHeader | null>(null);
  const [partialTarget, setPartialTarget] = useState<{
    header: LglHeader;
    x: number;
    y: number;
  } | null>(null);
  const [partialInfo, setPartialInfo] = useState<LglPartialInfo | null>(null);
  const [partialLoading, setPartialLoading] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);

  const [jenis, setJenis] = useState<LglJenis[]>([]);
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

  const refreshList = useCallback(() => {
    void (async () => {
      setLoadingHeaders(true);
      const res = await getLglHeadersAction({ page: 1, search: query, includeUsed });
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
      setLoadingHeaders(true);
      const res = await getLglHeadersAction({ page: 1, search: query, includeUsed });
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
      setPopover(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, includeUsed]);

  const loadMore = useCallback(async () => {
    if (loadingHeaders || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getLglHeadersAction({ page: page + 1, search: query, includeUsed });
    setLoadingMore(false);
    if (res.ok) {
      setHeaders((prev) => [...prev, ...res.headers]);
      setPage(page + 1);
      setTotalPages(res.totalPages);
    }
  }, [loadingHeaders, loadingMore, page, totalPages, query, includeUsed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getLglJenisAction();
      if (!cancelled && res.ok) setJenis(res.jenis);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLglPrintLocksAction();
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
    const res = await getLglPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LglHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget(null);
    setFormCreateOpen(true);
  }, [canCreate]);

  const openEdit = useCallback(
    (header: LglHeader) => {
      if (header.IsPartial) {
        showFlash("error", "Label ini tidak dapat diedit karena telah di partial.");
        return;
      }
      if (header.NoBongkarSusun && header.NoBongkarSusun.trim() !== "") {
        showFlash(
          "error",
          "Label yang berasal dari Bongkar Susun tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      setFormTarget(header);
    },
    [showFlash],
  );

  const doPrint = useCallback(
    async (header: LglHeader) => {
      if (printing) return;
      setPrinting(header.NoGilingan);
      const res = await printGlgLabelAction(header.NoGilingan);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoGilingan);
      refreshList();
      void refreshLocks();
    },
    [printing, showFlash, refreshLocks, refreshList],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
    const res = await deleteGlgAction(deleteTarget.NoGilingan);
    if (!res.ok) return { ok: false as const, error: res.error };
    showFlash("success", `Label ${deleteTarget.NoGilingan} berhasil dihapus`);
    refreshList();
    return { ok: true as const };
  }, [deleteTarget, showFlash, refreshList]);

  const fetchProduksiOptions = useCallback(
    (tanggal: string) => getLglProduksiOptionsAction(tanggal),
    [],
  );

  const fetchOutputs = useCallback((noCode: string) => getLglOutputsAction(noCode), []);

  const submitCreate = useCallback(
    (payload: LglSavePayload) =>
      createGlgAction(payload).then((res) => {
        if (res.ok) {
          refreshList();
        }
        return res;
      }),
    [refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noGilingan: string; payload: LglSavePayload }) =>
      updateGlgAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noGilingan} berhasil diperbarui`);
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const openPartial = useCallback(async (header: LglHeader, x: number, y: number) => {
    setPartialTarget({ header, x, y });
    setPartialInfo(null);
    setPartialError(null);
    setPartialLoading(true);
    const res = await getLglPartialInfoAction(header.NoGilingan);
    setPartialLoading(false);
    if (res.ok) {
      setPartialInfo(res.info);
      setPartialError(null);
    } else {
      setPartialInfo(null);
      setPartialError(res.error);
    }
  }, []);

  const closePartial = useCallback(() => {
    setPartialTarget(null);
    setPartialInfo(null);
    setPartialError(null);
  }, []);

  const flashStyle =
    flash?.kind === "success"
      ? { backgroundColor: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
      : flash?.kind === "warning"
        ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }
        : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#7F1D1D" };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3">
      <LglHeaderTable
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
        selectedNo={null}
        onSelect={() => undefined}
        onOpenPopover={openPopover}
        locks={locks}
        hasMore={page < totalPages}
        loadingMore={loadingMore}
        onReachEnd={() => void loadMore()}
      />

      {popover && (
        <LglRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canHistory={canHistory}
          printing={printing === popover.header.NoGilingan}
          lock={locks[popover.header.NoGilingan] ?? null}
          onEdit={() => {
            const h = popover.header;
            closePopover();
            openEdit(h);
          }}
          onDelete={() => {
            const h = popover.header;
            closePopover();
            setDeleteTarget(h);
          }}
          onPrint={() => {
            const h = popover.header;
            closePopover();
            void doPrint(h);
          }}
          onHistory={() => {
            const h = popover.header;
            closePopover();
            setHistoryTarget(h);
          }}
          onPartialInfo={() => {
            const h = popover.header;
            const pos = { x: popover.x, y: popover.y };
            closePopover();
            void openPartial(h, pos.x, pos.y);
          }}
          onClose={closePopover}
        />
      )}

      {(formCreateOpen || formTarget) && (
        <LglFormDialog
          header={formTarget}
          jenis={jenis}
          onClose={() => {
            setFormCreateOpen(false);
            setFormTarget(null);
          }}
          fetchProduksiOptions={fetchProduksiOptions}
          fetchOutputs={fetchOutputs}
          onSubmitCreate={submitCreate}
          onSubmitUpdate={submitUpdate}
        />
      )}

      {deleteTarget && (
        <LglDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {partialTarget && (
        <LglPartialPopover
          noGilingan={partialTarget.header.NoGilingan}
          x={partialTarget.x}
          y={partialTarget.y}
          info={partialInfo}
          loading={partialLoading}
          error={partialError}
          onClose={closePartial}
        />
      )}

      {historyTarget && (
        <AuditHistoryDialog
          documentNo={historyTarget.NoGilingan}
          docLabel="No. Gilingan"
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
