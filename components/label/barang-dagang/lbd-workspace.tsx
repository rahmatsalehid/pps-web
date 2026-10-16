"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type { LbPrintLock } from "@/services/label-bahan-baku-service";
import type {
  LbdHeader,
  LbdJenis,
  LbdSavePayload,
  LbdSupplier,
} from "@/services/label-barang-dagang-service";
import {
  deleteLbdAction,
  getLbdHeadersAction,
  getLbdJenisAction,
  getLbdPrintLocksAction,
  getLbdSuppliersAction,
  printLbdLabelAction,
  updateLbdAction,
} from "@/app/(app)/label/barang-dagang/actions";
import { LbdHeaderTable } from "./lbd-header-table";
import { LbdRowPopover } from "./lbd-row-popover";
import { LbdFormDialog } from "./lbd-form-dialog";
import { LbdDeleteDialog } from "./lbd-delete-dialog";
import { AuditHistoryDialog } from "@/components/label/audit/audit-history-dialog";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canUpdate: boolean;
  canDelete: boolean;
  canHistory: boolean;
};

export function LbdWorkspace({ canUpdate, canDelete, canHistory }: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LbdHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [popover, setPopover] = useState<{
    header: LbdHeader;
    x: number;
    y: number;
  } | null>(null);
  const [formTarget, setFormTarget] = useState<LbdHeader | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LbdHeader | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LbdHeader | null>(null);

  const [jenis, setJenis] = useState<LbdJenis[]>([]);
  const [suppliers, setSuppliers] = useState<LbdSupplier[]>([]);
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
      const res = await getLbdHeadersAction({ page: 1, search: query, includeUsed });
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
      const res = await getLbdHeadersAction({ page: 1, search: query, includeUsed });
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
    const res = await getLbdHeadersAction({
      page: page + 1,
      search: query,
      includeUsed,
    });
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
      const res = await getLbdJenisAction();
      if (!cancelled && res.ok) setJenis(res.jenis);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getLbdSuppliersAction();
      if (!cancelled && res.ok) setSuppliers(res.suppliers);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLbdPrintLocksAction();
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
    const res = await getLbdPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  const openPopover = useCallback((header: LbdHeader, x: number, y: number) => {
    setPopover({ header, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const openEdit = useCallback(
    (header: LbdHeader) => {
      if (header.HasBeenPrinted > 0) {
        showFlash(
          "error",
          "Label yang sudah dicetak tidak dapat diedit. Data hanya bisa diubah selama label belum dicetak.",
        );
        return;
      }
      if (header.Used) {
        showFlash(
          "error",
          "Label yang sudah terpakai tidak dapat diedit.",
        );
        return;
      }
      setFormTarget(header);
    },
    [showFlash],
  );

  const doPrint = useCallback(
    async (header: LbdHeader) => {
      if (printing) return;
      setPrinting(header.NoBarangDagang);
      const res = await printLbdLabelAction(header.NoBarangDagang);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, header.NoBarangDagang);
      refreshList();
      void refreshLocks();
    },
    [printing, showFlash, refreshLocks, refreshList],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return { ok: false as const, error: "Tidak ada label yang dipilih" };
      const res = await deleteLbdAction(deleteTarget.NoBarangDagang);
      if (!res.ok) return { ok: false as const, error: res.error };
      showFlash("success", `Label ${deleteTarget.NoBarangDagang} berhasil dihapus`);
      refreshList();
      return { ok: true as const };
    },
    [deleteTarget, showFlash, refreshList],
  );

  const submitUpdate = useCallback(
    (args: { noBarangDagang: string; payload: LbdSavePayload }) =>
      updateLbdAction(args).then((res) => {
        if (res.ok) {
          showFlash("success", `Label ${args.noBarangDagang} berhasil diperbarui`);
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
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3">
      <LbdHeaderTable
        className="min-h-0 flex-1"
        search={search}
        onSearch={setSearch}
        includeUsed={includeUsed}
        onToggleIncludeUsed={() => setIncludeUsed((v) => !v)}
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
        <LbdRowPopover
          header={popover.header}
          x={popover.x}
          y={popover.y}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canHistory={canHistory}
          printing={printing === popover.header.NoBarangDagang}
          lock={locks[popover.header.NoBarangDagang] ?? null}
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
          onClose={closePopover}
        />
      )}

      {formTarget && (
        <LbdFormDialog
          header={formTarget}
          jenis={jenis}
          suppliers={suppliers}
          onClose={() => setFormTarget(null)}
          onSubmitUpdate={submitUpdate}
        />
      )}

      {deleteTarget && (
        <LbdDeleteDialog
          header={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {historyTarget && (
        <AuditHistoryDialog
          documentNo={historyTarget.NoBarangDagang}
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
