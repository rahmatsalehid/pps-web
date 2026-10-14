"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LpkHeader,
  LpkJenis,
  LpkMode,
  LpkPartialInfo,
  LpkSavePayload,
} from "@/services/label-packing-service";
import {
  createLpkAction,
  deleteLpkAction,
  getLpkHeadersAction,
  getLpkInjectPackingInfoAction,
  getLpkJenisAction,
  getLpkOutputsAction,
  getLpkPartialInfoAction,
  getLpkPrintLocksAction,
  getLpkProduksiOptionsAction,
  printLpkLabelAction,
  resetLpkPrintedAction,
  updateLpkAction,
} from "@/app/(app)/label/packing/actions";
import { LpkHeaderTable } from "./lpk-header-table";
import { LpkRowPopover } from "./lpk-row-popover";
import { LpkFormDialog } from "./lpk-form-dialog";
import { LpkDeleteDialog } from "./lpk-delete-dialog";
import { LpkPartialPopover } from "./lpk-partial-popover";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";
import { isBongkarSusunSource, isSortirRejectSource } from "./lpk-format";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
};

export function LpkWorkspace({
  canCreate,
  canUpdate,
  canDelete,
  canHistory,
}: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LpkHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [popover, setPopover] = useState<{ header: LpkHeader; x: number; y: number } | null>(
    null,
  );
  const [formCreateOpen, setFormCreateOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<LpkHeader | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LpkHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LpkHeader | null>(null);
  const [partialTarget, setPartialTarget] = useState<{
    header: LpkHeader;
    x: number;
    y: number;
  } | null>(null);
  const [partialInfo, setPartialInfo] = useState<LpkPartialInfo | null>(null);
  const [partialLoading, setPartialLoading] = useState(false);
  const [partialError, setPartialError] = useState<string | null>(null);

  const [jenis, setJenis] = useState<LpkJenis[]>([]);
  const [locks, setLocks] = useState<Record<string, LbPrintLock>>({});
  const [printing, setPrinting] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<LpkHeader | null>(null);
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
      const res = await getLpkHeadersAction({ page: 1, search: query, includeUsed });
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
      const res = await getLpkHeadersAction({ page: 1, search: query, includeUsed });
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
    const res = await getLpkHeadersAction({ page: page + 1, search: query, includeUsed });
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
      const res = await getLpkJenisAction();
      if (!cancelled && res.ok) setJenis(res.jenis);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLpkPrintLocksAction();
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
    const res = await getLpkPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LpkHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setFormTarget(null);
    setFormCreateOpen(true);
  }, [canCreate]);

  const openEdit = useCallback(
    (header: LpkHeader) => {
      if (isBongkarSusunSource(header.OutputType, header.OutputCode)) {
        showFlash(
          "error",
          "Label yang berasal dari Bongkar Susun tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      if (isSortirRejectSource(header.OutputType, header.OutputCode)) {
        showFlash(
          "error",
          "Label yang berasal dari Sortir Reject tidak dapat diedit. Silakan buat label baru jika diperlukan perubahan.",
        );
        return;
      }
      setFormTarget(header);
    },
    [showFlash],
  );

  const doPrint = useCallback(
    async (header: LpkHeader) => {
      if (printing) return;
      setPrinting(header.NoBJ);
      const res = await printLpkLabelAction(header.NoBJ);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoBJ);
      refreshList();
      void refreshLocks();
    },
    [printing, showFlash, refreshLocks, refreshList],
  );

  const doResetPrint = useCallback(
    async (header: LpkHeader) => {
      const res = await resetLpkPrintedAction(header.NoBJ);
      if (!res.ok) {
        showFlash("error", res.error);
        return;
      }
      showFlash("success", `Status print ${header.NoBJ} berhasil direset`);
      refreshList();
    },
    [showFlash, refreshList],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLpkAction(deleteTarget.NoBJ);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoBJ} berhasil dihapus`);
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList],
  );

  const fetchProduksiOptions = useCallback(
    (args: { tanggal: string; mode: LpkMode }) => getLpkProduksiOptionsAction(args),
    [],
  );

  const fetchOutputs = useCallback(
    (args: { noCode: string; mode: LpkMode }) => getLpkOutputsAction(args),
    [],
  );

  const fetchInjectPackingInfo = useCallback(
    (noProduksi: string) => getLpkInjectPackingInfoAction(noProduksi),
    [],
  );

  const submitCreate = useCallback(
    (payload: LpkSavePayload) =>
      createLpkAction(payload).then((res) => {
        if (res.ok) {
          if (res.count > 1) {
            showFlash("success", `Label Barang Jadi berhasil dibuat (${res.count} label).`);
          } else {
            showFlash(
              "success",
              res.noBJ ? `Label ${res.noBJ} berhasil dibuat` : "Label berhasil dibuat",
            );
          }
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noBJ: string; payload: LpkSavePayload }) =>
      updateLpkAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noBJ} berhasil diperbarui`);
          refreshList();
        }
        return res;
      }),
    [showFlash, refreshList],
  );

  const openPartial = useCallback(
    async (header: LpkHeader, x: number, y: number) => {
      setPartialTarget({ header, x, y });
      setPartialInfo(null);
      setPartialError(null);
      setPartialLoading(true);
      const res = await getLpkPartialInfoAction(header.NoBJ);
      setPartialLoading(false);
      if (res.ok) {
        setPartialInfo(res.info);
        setPartialError(null);
      } else {
        setPartialInfo(null);
        setPartialError(res.error);
      }
    },
    [],
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
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3">
      <LpkHeaderTable
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
        <LpkRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canHistory={canHistory}
          printing={printing === popover.header.NoBJ}
          lock={locks[popover.header.NoBJ] ?? null}
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
          onResetPrint={() => {
            const h = popover.header;
            closePopover();
            setConfirmReset(h);
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
        <LpkFormDialog
          header={formTarget}
          jenis={jenis}
          onClose={() => {
            setFormCreateOpen(false);
            setFormTarget(null);
          }}
          fetchProduksiOptions={fetchProduksiOptions}
          fetchOutputs={fetchOutputs}
          fetchInjectPackingInfo={fetchInjectPackingInfo}
          onSubmitCreate={submitCreate}
          onSubmitUpdate={submitUpdate}
        />
      )}

      {deleteTarget && (
        <LpkDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {confirmReset && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <p className="text-[15px] font-bold text-[#172B4D]">Reset Status Print</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#44546F]">
              Yakin reset status print untuk label {confirmReset.NoBJ} ke 0?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(null)}
                className="h-9 rounded-lg border border-[#DCDFE4] px-3 text-[13px] font-bold text-[#44546F] transition hover:bg-[#F7F8F9]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const h = confirmReset;
                  setConfirmReset(null);
                  void doResetPrint(h);
                }}
                className="h-9 rounded-lg bg-[#0C66E4] px-3 text-[13px] font-bold text-white transition hover:bg-[#0055CC]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {partialTarget && (
        <LpkPartialPopover
          noBJ={partialTarget.header.NoBJ}
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
          documentNo={historyTarget.NoBJ}
          docLabel="No. Label"
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
