"use client";

import { useCallback, useEffect, useState, type UIEvent } from "react";
import {
  deleteSoOldHasilAction,
  getSoOldAcuanAction,
  getSoOldHasilAction,
  getSoOldLabelDetailAction,
} from "@/app/(app)/operasional/stock-opname-old/actions";
import type {
  SoOldLabelDetail,
  SoOldLabelRow,
} from "@/services/stock-opname-service";
import { Loader2Icon, QrCodeIcon, X } from "@/components/dashboard/icons";
import {
  SoAlertIcon,
  SoCheckCircleIcon,
  SoInboxIcon,
  SoTrashIcon,
} from "../stock-opname/so-icons";
import { SoConfirmDialog } from "../stock-opname/so-confirm-dialog";
import {
  soOldFormatBerat,
  soOldFormatQty,
  soOldLokasiLabel,
  soOldShortDate,
  soOldTypeName,
} from "./so-old-format";

const PAGE_SIZE = 50;
const BUBBLE_WIDTH = 260;

export type SoOldLabelStats = {
  totalData: number;
  totalSak: number;
  totalBerat: number;
  totalLabelGlobal: number;
  totalSakGlobal: number;
  totalBeratGlobal: number;
};

export function SoOldLabelPanel({
  noSO,
  variant,
  title,
  color,
  filterBy,
  blok,
  idLokasi,
  search,
  reloadKey,
  onStats,
  onDeleted,
}: {
  noSO: string;
  variant: "acuan" | "hasil";
  title: string;
  color: string;
  filterBy: string;
  blok: string | null;
  idLokasi: number | null;
  search: string;
  reloadKey: number;
  onStats: (variant: "acuan" | "hasil", stats: SoOldLabelStats) => void;
  onDeleted: (nomorLabel: string) => void;
}) {
  const [items, setItems] = useState<SoOldLabelRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [bubble, setBubble] = useState<{
    nomorLabel: string;
    left: number;
    top: number;
  } | null>(null);

  const fetchPage = useCallback(
    async (p: number) => {
      const params = {
        page: p,
        pageSize: PAGE_SIZE,
        filterBy,
        blok,
        idLokasi,
        search,
      };
      if (variant === "acuan") {
        const res = await getSoOldAcuanAction(noSO, params);
        if (!res.ok) return { ok: false as const, error: res.error };
        return {
          ok: true as const,
          data: res.page.data,
          currentPage: res.page.currentPage,
          totalPages: res.page.totalPages,
          totalData: res.page.totalData,
          totalSak: res.page.totalSak,
          totalBerat: res.page.totalBerat,
          globals: {
            totalLabelGlobal: res.page.totalLabelGlobal,
            totalSakGlobal: res.page.totalSakGlobal,
            totalBeratGlobal: res.page.totalBeratGlobal,
          },
        };
      }
      const res = await getSoOldHasilAction(noSO, params);
      if (!res.ok) return { ok: false as const, error: res.error };
      return {
        ok: true as const,
        data: res.page.data,
        currentPage: res.page.currentPage,
        totalPages: res.page.totalPages,
        totalData: res.page.totalData,
        totalSak: res.page.totalSak,
        totalBerat: res.page.totalBerat,
        globals: null,
      };
    },
    [noSO, variant, filterBy, blok, idLokasi, search],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetchPage(1);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.data);
        setPage(res.currentPage);
        setTotalPages(res.totalPages);
        setTotalData(res.totalData);
        setError(null);
        onStats(variant, {
          totalData: res.totalData,
          totalSak: res.totalSak,
          totalBerat: res.totalBerat,
          totalLabelGlobal: res.globals?.totalLabelGlobal ?? 0,
          totalSakGlobal: res.globals?.totalSakGlobal ?? 0,
          totalBeratGlobal: res.globals?.totalBeratGlobal ?? 0,
        });
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, fetchPage, variant, onStats]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await fetchPage(page + 1);
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.data]);
      setPage(res.currentPage);
      setTotalPages(res.totalPages);
      setTotalData(res.totalData);
    }
  }, [loadingMore, page, totalPages, fetchPage]);

  const onScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
        void loadMore();
      }
    },
    [loadMore],
  );

  const openBubble = useCallback(
    (el: HTMLElement, nomorLabel: string) => {
      if (bubble?.nomorLabel === nomorLabel) {
        setBubble(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const count = bubbleItemCount(nomorLabel);
      const estH = 84 + count * 34;
      let left = rect.left - BUBBLE_WIDTH - 12;
      if (left < 8) left = rect.right + 12;
      if (left + BUBBLE_WIDTH > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - BUBBLE_WIDTH - 8);
      }
      let top = rect.top + rect.height / 2 - estH / 2;
      top = Math.min(
        Math.max(8, top),
        Math.max(8, window.innerHeight - estH - 8),
      );
      setBubble({ nomorLabel, left, top });
    },
    [bubble],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await deleteSoOldHasilAction(noSO, deleteTarget);
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(res.error);
      return;
    }
    const label = deleteTarget;
    setDeleteTarget(null);
    onDeleted(label);
  }, [deleteTarget, deleteBusy, noSO, onDeleted]);

  const hasMore = page < totalPages;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pt-2">
        <div
          className="flex items-center gap-2.5 rounded-[10px] px-4 py-3"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}D9)`,
            boxShadow: `0 1px 3px ${color}3D`,
          }}
        >
          {variant === "acuan" ? (
            <SoInboxIcon className="shrink-0" style={{ width: 18, height: 18, color: "#fff" }} />
          ) : (
            <SoCheckCircleIcon className="shrink-0" style={{ width: 18, height: 18, color: "#fff" }} />
          )}
          <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-white">
            {title}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[13px] font-bold text-white"
            style={{ backgroundColor: "#FFFFFF2E" }}
          >
            {totalData}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 pt-2">
        <div className="h-full overflow-auto px-1 pb-2" onScroll={onScroll}>
          {loading && items.length === 0 ? (
            <div className="space-y-3 p-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[92px] animate-pulse rounded-xl border bg-gray-50"
                  style={{ borderColor: "#E5E7EB" }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <SoAlertIcon
                className="text-red-300"
                style={{ width: 40, height: 40 }}
              />
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <SoInboxIcon
                className="text-gray-300"
                style={{ width: 40, height: 40 }}
              />
              <p className="text-sm font-semibold text-gray-600">
                {variant === "acuan"
                  ? "Data Stock Tidak Ditemukan"
                  : "Data Hasil Scan Tidak Ditemukan"}
              </p>
            </div>
          ) : (
            <>
              {items.map((label) => (
                <LabelCard
                  key={`${label.nomorLabel}-${label.dateTimeScan ?? ""}`}
                  label={label}
                  showScannedBy={variant === "hasil"}
                  active={bubble?.nomorLabel === label.nomorLabel}
                  onOpen={(el) => openBubble(el, label.nomorLabel)}
                  onDelete={
                    variant === "hasil"
                      ? () => {
                          setDeleteError(null);
                          setDeleteTarget(label.nomorLabel);
                        }
                      : undefined
                  }
                />
              ))}
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-400">
                  <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat data
                  berikutnya…
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <p className="py-3 text-center text-[11px] text-gray-400">
                  Menampilkan {items.length} dari {totalData} label
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {bubble && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setBubble(null)}
            aria-hidden
          />
          <LabelBubble
            nomorLabel={bubble.nomorLabel}
            left={bubble.left}
            top={bubble.top}
            onClose={() => setBubble(null)}
          />
        </>
      )}

      {deleteTarget && (
        <SoConfirmDialog
          title="Konfirmasi Hapus"
          message={`Apakah Anda yakin ingin menghapus label ${deleteTarget}?`}
          confirmLabel="Hapus"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function bubbleItemCount(nomorLabel: string): number {
  const kode = nomorLabel.split(".")[0]?.toUpperCase() ?? "";
  if (["A", "B", "D", "BB", "BA"].includes(kode)) return 6;
  if (["F", "M", "V", "H", "BF"].includes(kode)) return 5;
  return 2;
}

function LabelCard({
  label,
  showScannedBy,
  active,
  onOpen,
  onDelete,
}: {
  label: SoOldLabelRow;
  showScannedBy: boolean;
  active: boolean;
  onOpen: (el: HTMLElement) => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="group relative mx-2 my-1.5 cursor-pointer rounded-xl border bg-white px-3.5 py-3 transition"
      style={{
        borderColor: active ? "#2196F3" : "#2196F333",
        borderWidth: active ? 2 : 1,
        boxShadow: active
          ? "0 0 0 3px #2196F34D"
          : "0 3px 6px #2196F30D",
      }}
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <div className="flex items-center gap-2">
        <QrCodeIcon
          className="h-[18px] w-[18px] shrink-0 text-[#2196F3]"
        />
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#1A1D23]">
          {label.nomorLabel}
        </p>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hidden shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:block"
            aria-label={`Hapus ${label.nomorLabel}`}
            title="Hapus data"
          >
            <SoTrashIcon style={{ width: 14, height: 14 }} />
          </button>
        )}
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ backgroundColor: "#2196F31A", color: "#2196F3" }}
        >
          {label.labelType}
        </span>
      </div>

      <div className="my-2 h-px" style={{ backgroundColor: "#E5E7EB" }} />

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <InfoCell label="Pcs" value={soOldFormatQty(label.jmlhSak)} />
        <InfoCell label="Berat" value={`${soOldFormatBerat(label.berat)} kg`} />
        <InfoCell
          label="Lokasi"
          value={soOldLokasiLabel(label.blok, label.idLokasi)}
        />
        {showScannedBy && label.username && (
          <InfoCell label="Scanned by" value={label.username} />
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px]">
      <span className="font-medium text-gray-500">{label}:</span>
      <span className="font-semibold text-[#374151]">{value}</span>
    </span>
  );
}

function LabelBubble({
  nomorLabel,
  left,
  top,
  onClose,
}: {
  nomorLabel: string;
  left: number;
  top: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SoOldLabelDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setDetail(null);
      setError(null);
      const res = await getSoOldLabelDetailAction(nomorLabel);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setDetail(res.detail);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [nomorLabel]);

  const kode = nomorLabel.split(".")[0]?.toUpperCase() ?? "";
  const typeName = soOldTypeName(nomorLabel);
  const rows = detail ? bubbleRows(kode, detail) : [];

  return (
    <div
      className="fixed z-50 overflow-hidden rounded-2xl border border-white/80 bg-white"
      style={{
        left,
        top,
        width: BUBBLE_WIDTH,
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.15), 0 2px 5px rgba(0,0,0,0.05)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={{
          background: "linear-gradient(135deg, #2196F3, #2196F3CC)",
        }}
      >
        <span className="rounded-[10px] bg-white/20 p-2">
          <QrCodeIcon className="h-[18px] w-[18px] text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-wide text-white">
            {nomorLabel}
          </p>
          <p className="text-xs font-medium text-white/90">{typeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-white/80 hover:bg-white/20"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2Icon className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : error || !detail ? (
        <div className="flex items-center gap-2 px-4 py-4">
          <SoAlertIcon
            style={{ width: 18, height: 18, color: "#EA580C" }}
          />
          <p className="text-[13px] font-medium text-black/70">
            {error ?? "Data tidak ditemukan"}
          </p>
        </div>
      ) : (
        <div className="px-4 py-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 py-1">
              <span className="text-[11px] font-medium text-gray-500">
                {row.label}
              </span>
              <span className="min-w-0 truncate text-right text-[13px] font-semibold text-[#1A1D23]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function bubbleRows(
  kode: string,
  d: SoOldLabelDetail,
): Array<{ label: string; value: string }> {
  const known = ["A", "B", "D", "F", "M", "V", "H", "BB", "BA", "BF"];
  if (!known.includes(kode)) {
    return [{ label: "Error", value: "Tipe label tidak dikenali" }];
  }

  const jenisField = (() => {
    switch (kode) {
      case "A":
      case "B":
      case "D":
        return d.namaJenisPlastik;
      case "F":
        return d.namaCrusher;
      case "M":
        return d.namaBonggolan;
      case "V":
        return d.namaGilingan;
      case "H":
        return d.namaMixer;
      case "BB":
        return d.namaFurnitureWIP;
      case "BA":
        return d.namaBJ;
      default:
        return d.namaReject;
    }
  })();

  const showSak = ["A", "B", "D"].includes(kode);
  const showPcs = ["BB", "BA"].includes(kode);
  const rows: Array<{ label: string; value: string }> = [
    { label: "Jenis", value: jenisField ?? "-" },
    { label: "Tanggal", value: soOldShortDate(d.dateCreate) },
  ];
  if (showSak) {
    rows.push({
      label: "Jumlah Sak",
      value: d.jumlahSak != null ? String(d.jumlahSak) : "-",
    });
  }
  if (showPcs) {
    rows.push({
      label: "Pcs",
      value: d.pcs != null ? String(d.pcs) : "-",
    });
  }
  rows.push({ label: "Berat", value: d.berat != null ? `${d.berat} kg` : "-" });
  rows.push({ label: "Gudang", value: d.namaWarehouse ?? "-" });
  rows.push({ label: "Lokasi", value: d.idLokasi ?? "-" });
  return rows;
}
