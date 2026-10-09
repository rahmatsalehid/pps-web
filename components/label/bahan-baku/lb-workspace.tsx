"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { printPdfBase64 } from "@/components/operasional/bongkar-susun/print-pdf";
import type {
  LbDetail,
  LbHeader,
  LbPallet,
  LbPrintLock,
  LbQcHeader,
} from "@/services/label-bahan-baku-service";
import {
  getLbDetailsAction,
  getLbHeadersAction,
  getLbPalletsAction,
  getLbPrintLocksAction,
  printLbLabelAction,
  updateLbPalletQcAction,
} from "@/app/(app)/label/bahan-baku/actions";
import { LbDetailPanel } from "./lb-detail-panel";
import { LbHeaderTable } from "./lb-header-table";
import { LbPalletPanel } from "./lb-pallet-panel";
import { LbPalletPopover } from "./lb-pallet-popover";
import { LbQcDialog } from "./lb-qc-dialog";

type Flash = { kind: "success" | "error" | "warning"; text: string };

type Props = {
  canQc: boolean;
};

export function LbWorkspace({ canQc }: Props) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeUsed, setIncludeUsed] = useState(false);

  const [headers, setHeaders] = useState<LbHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedBb, setSelectedBb] = useState<string | null>(null);
  const [pallets, setPallets] = useState<LbPallet[]>([]);
  const [loadingPallets, setLoadingPallets] = useState(false);
  const [palletsError, setPalletsError] = useState<string | null>(null);
  const [palletReload, setPalletReload] = useState(0);

  const [selectedPallet, setSelectedPallet] = useState<string | null>(null);
  const [details, setDetails] = useState<LbDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [locks, setLocks] = useState<Record<string, LbPrintLock>>({});
  const [popover, setPopover] = useState<{
    pallet: LbPallet;
    x: number;
    y: number;
  } | null>(null);
  const [qcTarget, setQcTarget] = useState<LbPallet | null>(null);
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

  // Debounce pencarian 500 ms (seperti tablet).
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 500);
    return () => window.clearTimeout(t);
  }, [search]);

  // Muat daftar header; reset selection setiap refresh (perilaku tablet).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingHeaders(true);
      const res = await getLbHeadersAction({ page: 1, search: query, includeUsed });
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
      setSelectedBb(null);
      setPallets([]);
      setSelectedPallet(null);
      setDetails([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, includeUsed]);

  const loadMore = useCallback(async () => {
    if (loadingHeaders || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getLbHeadersAction({ page: page + 1, search: query, includeUsed });
    setLoadingMore(false);
    if (res.ok) {
      setHeaders((prev) => [...prev, ...res.headers]);
      setPage(page + 1);
      setTotalPages(res.totalPages);
    }
  }, [loadingHeaders, loadingMore, page, totalPages, query, includeUsed]);

  const selectBb = useCallback((bb: string) => {
    setSelectedBb(bb);
    setSelectedPallet(null);
    setDetails([]);
  }, []);

  // Muat pallet saat BB dipilih / refresh.
  useEffect(() => {
    if (!selectedBb) return;
    let cancelled = false;
    void (async () => {
      setLoadingPallets(true);
      const res = await getLbPalletsAction(selectedBb);
      if (cancelled) return;
      setLoadingPallets(false);
      if (res.ok) {
        setPallets(res.pallets);
        setPalletsError(null);
      } else {
        setPallets([]);
        setPalletsError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBb, palletReload]);

  // Muat detail sak saat pallet dipilih.
  useEffect(() => {
    if (!selectedBb || !selectedPallet) return;
    let cancelled = false;
    void (async () => {
      setLoadingDetails(true);
      const res = await getLbDetailsAction(selectedBb, selectedPallet);
      if (cancelled) return;
      setLoadingDetails(false);
      if (res.ok) {
        setDetails(res.details);
        setDetailsError(null);
      } else {
        setDetails([]);
        setDetailsError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBb, selectedPallet]);

  // Polling print lock (pengganti socket tablet).
  const refreshLocks = useCallback(async () => {
    const res = await getLbPrintLocksAction();
    if (res.ok) {
      const map: Record<string, LbPrintLock> = {};
      for (const l of res.locks) map[l.noLabel] = l;
      setLocks(map);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getLbPrintLocksAction();
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

  const openPopover = useCallback((pallet: LbPallet, x: number, y: number) => {
    setPopover({ pallet, x, y });
  }, []);

  const closePopover = useCallback(() => setPopover(null), []);

  const doPrint = useCallback(
    async (pallet: LbPallet) => {
      if (!selectedBb || printing) return;
      setPrinting(pallet.NoPallet);
      const res = await printLbLabelAction(selectedBb, pallet.NoPallet);
      setPrinting(null);
      if (!res.ok) {
        showFlash("error", res.error);
        void refreshLocks();
        return;
      }
      if (res.warning) showFlash("warning", res.warning);
      printPdfBase64(res.pdfBase64, `${selectedBb}-${pallet.NoPallet}`);
      setPalletReload((k) => k + 1);
      void refreshLocks();
    },
    [selectedBb, printing, showFlash, refreshLocks],
  );

  const saveQc = useCallback(
    async (pallet: LbPallet, header: LbQcHeader) => {
      const res = await updateLbPalletQcAction(pallet.NoBahanBaku, pallet.NoPallet, header);
      if (!res.ok) return { ok: false as const, error: res.error };
      setPalletReload((k) => k + 1);
      showFlash("success", `QC ${pallet.NoPallet} berhasil disimpan`);
      return { ok: true as const };
    },
    [showFlash],
  );

  const flashStyle =
    flash?.kind === "success"
      ? { backgroundColor: "#ECFDF5", borderColor: "#86EFAC", color: "#166534" }
      : flash?.kind === "warning"
        ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }
        : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#7F1D1D" };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 bg-[#F3F5F8] p-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <LbHeaderTable
          className="lg:flex-[6]"
          search={search}
          onSearch={setSearch}
          includeUsed={includeUsed}
          onToggleIncludeUsed={() => setIncludeUsed((v) => !v)}
          headers={headers}
          loading={loadingHeaders}
          error={headersError}
          selectedBb={selectedBb}
          onSelect={selectBb}
          hasMore={page < totalPages}
          loadingMore={loadingMore}
          onReachEnd={() => void loadMore()}
        />
        <LbPalletPanel
          className="lg:flex-[5]"
          hasSelection={selectedBb != null}
          pallets={pallets}
          loading={loadingPallets}
          error={palletsError}
          selectedPallet={selectedPallet}
          onSelectPallet={(p) => setSelectedPallet(p.NoPallet)}
          onOpenPopover={openPopover}
          locks={locks}
        />
        <LbDetailPanel
          className="lg:flex-[3]"
          hasSelection={selectedPallet != null}
          details={details}
          loading={loadingDetails}
          error={detailsError}
        />
      </div>

      {popover && (
        <LbPalletPopover
          pallet={popover.pallet}
          x={popover.x}
          y={popover.y}
          canQc={canQc}
          printing={printing === popover.pallet.NoPallet}
          onInputQc={() => setQcTarget(popover.pallet)}
          onPrint={() => void doPrint(popover.pallet)}
          onClose={closePopover}
        />
      )}

      {qcTarget && (
        <LbQcDialog
          pallet={qcTarget}
          onClose={() => setQcTarget(null)}
          onSubmit={(header) => saveQc(qcTarget, header)}
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
