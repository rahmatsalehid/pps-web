"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LwsDetail,
  LwsHeader,
  LwsJenis,
  LwsMaxSak,
  LwsSavePayload,
} from "@/services/label-washing-service";
import {
  createLwsAction,
  deleteLwsAction,
  getLwsDetailsAction,
  getLwsHeadersAction,
  getLwsJenisAction,
  getLwsMaxSakAction,
  getLwsOutputsAction,
  getLwsPrintLocksAction,
  getLwsProduksiOptionsAction,
  printLwsLabelAction,
  updateLwsAction,
} from "@/app/(app)/label/washing/actions";
import { LwsHeaderTable } from "./lws-header-table";
import { LwsDetailPanel } from "./lws-detail-panel";
import { LwsRowPopover } from "./lws-row-popover";
import { LwsFormDialog } from "./lws-form-dialog";
import { LwsDeleteDialog } from "./lws-delete-dialog";
import { LwsQcDialog } from "./lws-qc-dialog";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";
import { isBongkarSusunSource, isDateUsageFilled } from "./lws-format";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canQc: boolean;
  canHistory: boolean;
};

export function LwsWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canQc,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LwsHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [details, setDetails] = useState<LwsDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [popover, setPopover] = useState<{ header: LwsHeader; x: number; y: number } | null>(null);
  const [formTarget, setFormTarget] = useState<{ header: LwsHeader | null; details: LwsDetail[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LwsHeader | null>(null);
  const [qcTarget, setQcTarget] = useState<LwsHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LwsHeader | null>(null);

  const [jenis, setJenis] = useState<LwsJenis[]>([]);
  const [fetchingJenis, setFetchingJenis] = useState(false);
  const [maxSak, setMaxSak] = useState<LwsMaxSak>({ JlhSak: 1, DefaultKG: 1 });

  const [locks, setLocks] = useState<Record<string, LbPrintLock>>({});
  const [printing, setPrinting] = useState<string | null>(null);
  const [checkingEdit, setCheckingEdit] = useState(false);
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
      const res = await getLwsHeadersAction({ page: 1, search: query, includeUsed });
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
      setDetails([]);
      setPopover(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, includeUsed]);

  const loadMore = useCallback(async () => {
    if (loadingHeaders || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getLwsHeadersAction({ page: page + 1, search: query, includeUsed });
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
      const res = await getLwsHeadersAction({ page: 1, search: query, includeUsed });
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

  const loadDetails = useCallback(async (noWashing: string) => {
    setLoadingDetails(true);
    setDetailsError(null);
    const res = await getLwsDetailsAction(noWashing);
    setLoadingDetails(false);
    if (res.ok) {
      setDetails(res.details);
      setDetailsError(null);
    } else {
      setDetails([]);
      setDetailsError(res.error);
    }
  }, []);

  const selectHeader = useCallback(
    (noWashing: string) => {
      setSelectedNo(noWashing);
      void loadDetails(noWashing);
    },
    [loadDetails],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFetchingJenis(true);
      const res = await getLwsJenisAction();
      if (cancelled) return;
      setFetchingJenis(false);
      if (res.ok) setJenis(res.jenis);
    })();
    void (async () => {
      const res = await getLwsMaxSakAction();
      if (!cancelled && res.ok) setMaxSak(res.maxSak);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLwsPrintLocksAction();
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
    const res = await getLwsPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LwsHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget({ header: null, details: [] });
  }, [canCreate]);

  const openEdit = useCallback(
    async (header: LwsHeader) => {
      if (isBongkarSusunSource(header.NoBongkarSusun)) {
        showFlash(
          "error",
          "Label yang berasal dari Bongkar Susun tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      setCheckingEdit(true);
      const res = await getLwsDetailsAction(header.NoWashing);
      setCheckingEdit(false);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      if (res.details.some((d) => isDateUsageFilled(d.DateUsage))) {
        showFlash("error", "Tidak bisa edit karena ada Sak yang sudah dipakai");
        return;
      }
      setFormTarget({ header, details: res.details });
    },
    [showFlash],
  );

  const openDelete = useCallback(
    async (header: LwsHeader) => {
      setCheckingEdit(true);
      const res = await getLwsDetailsAction(header.NoWashing);
      setCheckingEdit(false);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      if (res.details.some((d) => isDateUsageFilled(d.DateUsage))) {
        showFlash("error", "Tidak bisa hapus karena ada Sak yang sudah dipakai");
        return;
      }
      setDeleteTarget(header);
    },
    [showFlash],
  );

  const doPrint = useCallback(
    async (noWashing: string) => {
      if (printing) return;
      setPrinting(noWashing);
      const res = await printLwsLabelAction(noWashing);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, noWashing);
      refreshList();
      void refreshLocks();
      if (selectedNo === noWashing) void loadDetails(noWashing);
    },
    [printing, showFlash, refreshLocks, refreshList, selectedNo, loadDetails],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLwsAction(deleteTarget.NoWashing);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoWashing} berhasil dihapus`);
      setSelectedNo((cur) => (cur === deleteTarget.NoWashing ? null : cur));
      if (selectedNo === deleteTarget.NoWashing) setDetails([]);
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList, selectedNo],
  );

  const fetchProduksiOptions = useCallback(
    (tanggal: string) => getLwsProduksiOptionsAction({ tanggal }),
    [],
  );

  const fetchOutputs = useCallback((noProduksi: string) => getLwsOutputsAction(noProduksi), []);

  const submitCreate = useCallback(
    (payload: LwsSavePayload) =>
      createLwsAction(payload).then((res) => {
        if (res.ok) {
          showFlash(
            "success",
            res.noWashing
              ? `Label Washing ${res.noWashing} berhasil dibuat`
              : "Label Washing berhasil dibuat",
          );
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noWashing: string; payload: LwsSavePayload }) =>
      updateLwsAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noWashing} berhasil diperbarui`);
          refreshList();
          if (selectedNo === args.noWashing) void loadDetails(args.noWashing);
        }
        return res;
      }),
    [showFlash, refreshList, selectedNo, loadDetails],
  );

  const submitQc = useCallback(
    (args: { noWashing: string; header: LwsSavePayload["header"] }) =>
      updateLwsAction({ noWashing: args.noWashing, payload: { header: args.header } }).then(
        (res) => {
          if (res.ok) {
            showFlash("success", `QC Tersimpan — Nilai QC untuk ${args.noWashing} berhasil diperbarui.`);
            refreshList();
            if (selectedNo === args.noWashing) void loadDetails(args.noWashing);
          }
          return res;
        },
      ),
    [showFlash, refreshList, selectedNo, loadDetails],
  );

  const flashStyle =
    flash?.kind === "success"
      ? { backgroundColor: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
      : flash?.kind === "warning"
        ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }
        : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#7F1D1D" };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3 lg:flex-row">
      <LwsHeaderTable
        className="min-h-0 flex-[4]"
        search={search}
        onSearch={setSearch}
        includeUsed={includeUsed}
        onToggleIncludeUsed={() => setIncludeUsed((v) => !v)}
        canCreate={canCreate}
        onCreate={openCreate}
        checking={checkingEdit}
        headers={headers}
        loading={loadingHeaders}
        error={headersError}
        selectedNo={selectedNo}
        onSelect={selectHeader}
        onOpenPopover={openPopover}
        locks={locks}
        hasMore={page < totalPages}
        loadingMore={loadingMore}
        onReachEnd={() => void loadMore()}
      />

      <LwsDetailPanel
        className="min-h-[200px] flex-1 lg:max-w-[420px] lg:min-w-[300px]"
        noWashing={selectedNo}
        details={details}
        loading={loadingDetails}
        error={detailsError}
      />

      {popover && (
        <LwsRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canQc={canQc}
          canHistory={canHistory}
          printing={printing === popover.header.NoWashing}
          lock={locks[popover.header.NoWashing] ?? null}
          onEdit={() => {
            const h = popover.header;
            closePopover();
            void openEdit(h);
          }}
          onDelete={() => {
            const h = popover.header;
            closePopover();
            void openDelete(h);
          }}
          onQc={() => {
            const h = popover.header;
            closePopover();
            setQcTarget(h);
          }}
          onPrint={() => {
            const h = popover.header;
            closePopover();
            void doPrint(h.NoWashing);
          }}
          onHistory={() => {
            const h = popover.header;
            closePopover();
            setHistoryTarget(h);
          }}
          onClose={closePopover}
        />
      )}

      {formTarget && (
        <LwsFormDialog
          header={formTarget.header}
          initialDetails={formTarget.details}
          jenis={jenis}
          fetchingJenis={fetchingJenis}
          maxSak={maxSak}
          onClose={() => setFormTarget(null)}
          fetchProduksiOptions={fetchProduksiOptions}
          fetchOutputs={fetchOutputs}
          onSubmitCreate={submitCreate}
          onSubmitUpdate={submitUpdate}
          onPrintCreated={(no) => void doPrint(no)}
        />
      )}

      {deleteTarget && (
        <LwsDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {qcTarget && (
        <LwsQcDialog
          header={qcTarget}
          onClose={() => setQcTarget(null)}
          onSubmit={(header) => submitQc({ noWashing: qcTarget.NoWashing, header })}
        />
      )}

      {historyTarget && (
        <AuditHistoryDialog
          documentNo={historyTarget.NoWashing}
          docLabel="No. Washing"
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
