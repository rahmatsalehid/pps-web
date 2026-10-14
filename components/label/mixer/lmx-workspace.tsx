"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LmxDetail,
  LmxHeader,
  LmxJenis,
  LmxMaxSak,
  LmxPartialInfo,
  LmxSavePayload,
} from "@/services/label-mixer-service";
import {
  createLmxAction,
  deleteLmxAction,
  getLmxDetailsAction,
  getLmxHeadersAction,
  getLmxJenisAction,
  getLmxMaxSakAction,
  getLmxOutputsAction,
  getLmxPartialInfoAction,
  getLmxPrintLocksAction,
  getLmxProduksiOptionsAction,
  printLmxLabelAction,
  printLmxQcAction,
  updateLmxAction,
} from "@/app/(app)/label/mixer/actions";
import { LmxHeaderTable } from "./lmx-header-table";
import { LmxDetailTable } from "./lmx-detail-table";
import { LmxRowPopover } from "./lmx-row-popover";
import { LmxFormDialog } from "./lmx-form-dialog";
import { LmxDeleteDialog } from "./lmx-delete-dialog";
import { LmxQcDialog } from "./lmx-qc-dialog";
import { LmxPartialPopover } from "./lmx-partial-popover";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";
import { isDateUsageFilled } from "./lmx-format";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canQc: boolean;
  canHistory: boolean;
};

export function LmxWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canQc,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LmxHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [details, setDetails] = useState<LmxDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [popover, setPopover] = useState<{ header: LmxHeader; x: number; y: number } | null>(null);
  const [formTarget, setFormTarget] = useState<{ header: LmxHeader | null; details: LmxDetail[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LmxHeader | null>(null);
  const [qcTarget, setQcTarget] = useState<LmxHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LmxHeader | null>(null);
  const [partialTarget, setPartialTarget] = useState<{ noSak: number; x: number; y: number } | null>(null);
  const [partialInfo, setPartialInfo] = useState<LmxPartialInfo | null>(null);
  const [partialLoading, setPartialLoading] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);

  const [jenis, setJenis] = useState<LmxJenis[]>([]);
  const [fetchingJenis, setFetchingJenis] = useState(false);
  const [maxSak, setMaxSak] = useState<LmxMaxSak>({ JlhSak: 1, DefaultKG: 1 });

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
      const res = await getLmxHeadersAction({ page: 1, search: query, includeUsed });
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
    const res = await getLmxHeadersAction({ page: page + 1, search: query, includeUsed });
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
      const res = await getLmxHeadersAction({ page: 1, search: query, includeUsed });
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

  const loadDetails = useCallback(async (noMixer: string) => {
    setLoadingDetails(true);
    setDetailsError(null);
    const res = await getLmxDetailsAction(noMixer);
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
    (noMixer: string) => {
      setSelectedNo(noMixer);
      void loadDetails(noMixer);
    },
    [loadDetails],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFetchingJenis(true);
      const res = await getLmxJenisAction();
      if (cancelled) return;
      setFetchingJenis(false);
      if (res.ok) setJenis(res.jenis);
    })();
    void (async () => {
      const res = await getLmxMaxSakAction();
      if (!cancelled && res.ok) setMaxSak(res.maxSak);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLmxPrintLocksAction();
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
    const res = await getLmxPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LmxHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget({ header: null, details: [] });
  }, [canCreate]);

  const openEdit = useCallback(
    async (header: LmxHeader) => {
      if ((header.NoBongkarSusun ?? "").trim() !== "") {
        showFlash(
          "error",
          "Label yang berasal dari Bongkar Susun tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      setCheckingEdit(true);
      const res = await getLmxDetailsAction(header.NoMixer);
      setCheckingEdit(false);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      const hasUsed = res.details.some((d) => isDateUsageFilled(d.DateUsage));
      const hasPartial = res.details.some((d) => d.IsPartial === true);
      if (hasUsed || hasPartial) {
        const parts: string[] = [];
        if (hasUsed) parts.push("ada Sak yang sudah dipakai");
        if (hasPartial) parts.push("ada Sak yang telah dipartial");
        showFlash("error", `Edit ditolak karena ${parts.join(" dan ")}.`);
        return;
      }
      setFormTarget({ header, details: res.details });
    },
    [showFlash],
  );

  const openDelete = useCallback(
    async (header: LmxHeader) => {
      setCheckingEdit(true);
      const res = await getLmxDetailsAction(header.NoMixer);
      setCheckingEdit(false);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      const hasUsed = res.details.some((d) => isDateUsageFilled(d.DateUsage));
      const hasPartial = res.details.some((d) => d.IsPartial === true);
      if (hasUsed || hasPartial) {
        const parts: string[] = [];
        if (hasUsed) parts.push("ada Sak yang sudah dipakai");
        if (hasPartial) parts.push("ada Sak yang telah dipartial");
        showFlash("error", `Hapus ditolak karena ${parts.join(" dan ")}.`);
        return;
      }
      setDeleteTarget(header);
    },
    [showFlash],
  );

  const doPrint = useCallback(
    async (header: LmxHeader) => {
      if (printing) return;
      setPrinting(header.NoMixer);
      const res = await printLmxLabelAction(header.NoMixer);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoMixer);
      refreshList();
      void refreshLocks();
      if (selectedNo === header.NoMixer) void loadDetails(header.NoMixer);
    },
    [printing, showFlash, refreshLocks, refreshList, selectedNo, loadDetails],
  );

  const doPrintQc = useCallback(
    async (header: LmxHeader) => {
      if (printing) return;
      setPrinting(header.NoMixer);
      const res = await printLmxQcAction(header.NoMixer);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      printPdfBase64(res.pdfBase64, `${header.NoMixer}-QC`);
    },
    [printing, showFlash],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLmxAction(deleteTarget.NoMixer);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoMixer} berhasil dihapus`);
      setSelectedNo((cur) => (cur === deleteTarget.NoMixer ? null : cur));
      if (selectedNo === deleteTarget.NoMixer) setDetails([]);
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList, selectedNo],
  );

  const fetchProduksiOptions = useCallback(
    (args: { tanggal: string; mode: "production" | "inject" }) =>
      getLmxProduksiOptionsAction(args),
    [],
  );

  const fetchOutputs = useCallback(
    (args: { noProduksi: string; mode: "production" | "inject" }) =>
      getLmxOutputsAction(args),
    [],
  );

  const submitCreate = useCallback(
    (payload: LmxSavePayload) =>
      createLmxAction(payload).then((res) => {
        if (res.ok) {
          showFlash(
            "success",
            res.noMixer
              ? `Label Mixer ${res.noMixer} berhasil dibuat`
              : "Label Mixer berhasil dibuat",
          );
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noMixer: string; payload: LmxSavePayload }) =>
      updateLmxAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noMixer} berhasil diperbarui`);
          refreshList();
          if (selectedNo === args.noMixer) void loadDetails(args.noMixer);
        }
        return res;
      }),
    [showFlash, refreshList, selectedNo, loadDetails],
  );

  const submitQc = useCallback(
    (args: { noMixer: string; header: LmxSavePayload["header"] }) =>
      updateLmxAction({ noMixer: args.noMixer, payload: { header: args.header } }).then(
        (res) => {
          if (res.ok) {
            showFlash("success", `Nilai QC untuk ${args.noMixer} berhasil diperbarui`);
            refreshList();
          }
          return res;
        },
      ),
    [showFlash, refreshList],
  );

  const openPartial = useCallback(
    async (noSak: number, x: number, y: number) => {
      if (!selectedNo) return;
      setPartialTarget({ noSak, x, y });
      setPartialInfo(null);
      setPartialError(null);
      setPartialLoading(true);
      const res = await getLmxPartialInfoAction({ noMixer: selectedNo, noSak });
      setPartialLoading(false);
      if (res.ok) {
        setPartialInfo(res.info);
        setPartialError(null);
      } else {
        setPartialInfo(null);
        setPartialError(res.error);
      }
    },
    [selectedNo],
  );

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
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3 lg:flex-row">
      <LmxHeaderTable
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

      <LmxDetailTable
        className="min-h-[200px] flex-1 lg:max-w-[420px] lg:min-w-[320px]"
        noMixer={selectedNo}
        details={details}
        loading={loadingDetails}
        error={detailsError}
        onOpenPartial={(noSak, e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          void openPartial(noSak, r.left, r.top);
        }}
      />

      {popover && (
        <LmxRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canQc={canQc}
          canHistory={canHistory}
          printing={printing === popover.header.NoMixer}
          lock={locks[popover.header.NoMixer] ?? null}
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
            void doPrint(h);
          }}
          onPrintQc={() => {
            const h = popover.header;
            closePopover();
            void doPrintQc(h);
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
        <LmxFormDialog
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
        />
      )}

      {deleteTarget && (
        <LmxDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {qcTarget && (
        <LmxQcDialog
          header={qcTarget}
          onClose={() => setQcTarget(null)}
          onSubmit={(header) => submitQc({ noMixer: qcTarget.NoMixer, header })}
        />
      )}

      {partialTarget && selectedNo && (
        <LmxPartialPopover
          noMixer={selectedNo}
          noSak={partialTarget.noSak}
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
          documentNo={historyTarget.NoMixer}
          docLabel="No. Mixer"
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
