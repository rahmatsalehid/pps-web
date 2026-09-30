"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteSoHasilAction,
  getSoLabelPageAction,
} from "@/app/(app)/operasional/stock-opname/actions";
import type {
  SoLabelGroup,
  SoLabelRow,
} from "@/services/stock-opname-v2-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { SoConfirmDialog } from "./so-confirm-dialog";
import { soFormatQty, soQtyText, soWeightUnit } from "./so-format";
import {
  SoAlertIcon,
  SoCheckCircleIcon,
  SoCircleIcon,
  SoCloseIcon,
  SoHelpIcon,
  SoInboxIcon,
  SoLocationOffIcon,
  SoSearchIcon,
  SoTrashIcon,
} from "./so-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const GREEN = "#0A7349";
const WARNING = "#B45309";
const WARNING_BG = "#FFF7ED";
const INK = "#1A1D23";

export function SoLabelPanel({
  stockOpnameNo,
  blok,
  locationId,
  isUnknown,
  categoryCode,
  canManage,
  onChanged,
}: {
  stockOpnameNo: string;
  blok: string;
  locationId: number;
  isUnknown: boolean;
  categoryCode: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const unit = soWeightUnit(categoryCode);
  const [groups, setGroups] = useState<SoLabelGroup[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [confirmRow, setConfirmRow] = useState<SoLabelRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyLabelNos, setBusyLabelNos] = useState<string[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSoLabelPageAction({
        stockOpnameNo,
        blok,
        locationId,
        page: 1,
        pageSize: 20,
        search: query,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setGroups(res.page.data);
        setPage(res.page.currentPage);
        setTotalPages(res.page.totalPages);
        setTotalRecords(res.page.totalRecords);
        setTotalScanned(res.page.totalScanned);
        setTotalWeight(res.page.totalWeight);
        setError(null);
      } else {
        setGroups([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stockOpnameNo, blok, locationId, query, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getSoLabelPageAction({
      stockOpnameNo,
      blok,
      locationId,
      page: page + 1,
      pageSize: 20,
      search: query,
    });
    setLoadingMore(false);
    if (res.ok) {
      setGroups((prev) => [...prev, ...res.page.data]);
      setPage(res.page.currentPage);
      setTotalPages(res.page.totalPages);
      setTotalRecords(res.page.totalRecords);
      setTotalScanned(res.page.totalScanned);
      setTotalWeight(res.page.totalWeight);
    }
  }, [
    loadingMore,
    page,
    totalPages,
    stockOpnameNo,
    blok,
    locationId,
    query,
  ]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = page < totalPages;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, loadingMore, groups.length, page, loadMore]);

  const allScanned = totalRecords > 0 && totalScanned >= totalRecords;

  const confirmDelete = useCallback(async () => {
    if (!confirmRow || deleteBusy) return;
    const labelNo = confirmRow.primaryValue;
    setDeleteBusy(true);
    setDeleteError(null);
    setBusyLabelNos((prev) => [...prev, labelNo]);
    const res = await deleteSoHasilAction(stockOpnameNo, labelNo);
    setDeleteBusy(false);
    setBusyLabelNos((prev) => prev.filter((n) => n !== labelNo));
    if (!res.ok) {
      setDeleteError(res.error);
      return;
    }
    setConfirmRow(null);
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        scannedCount: group.labels.some(
          (l) => l.primaryValue === labelNo && l.isScanned,
        )
          ? Math.max(0, group.scannedCount - 1)
          : group.scannedCount,
        labels: group.labels.map((row) =>
          row.primaryValue === labelNo
            ? { ...row, isScanned: false, isLocationMismatch: false }
            : row,
        ),
      })),
    );
    setTotalScanned((prev) => Math.max(0, prev - 1));
    onChanged();
  }, [confirmRow, deleteBusy, stockOpnameNo, onChanged]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div
        className="shrink-0 border-b px-4 pb-3 pt-3.5"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {searchOpen ? (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder="Cari nomor label..."
                className="h-8 w-full rounded-lg border bg-[#F8F9FB] px-2.5 text-sm outline-none transition focus:border-[#1E6FD9]"
                style={{ borderColor: BORDER }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                {isUnknown && (
                  <SoLocationOffIcon
                    className="shrink-0"
                    style={{ width: 16, height: 16, color: WARNING }}
                  />
                )}
                <span
                  className="min-w-0 truncate text-[15px] font-bold"
                  style={{ color: isUnknown ? WARNING : INK }}
                >
                  {isUnknown ? "Lokasi Tidak Diketahui" : `${blok}${locationId}`}
                </span>
                {allScanned && (
                  <SoCheckCircleIcon
                    className="shrink-0"
                    style={{ width: 16, height: 16, color: GREEN }}
                  />
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((open) => {
                if (open) setSearch("");
                return !open;
              });
            }}
            className="rounded-md p-1.5"
            style={{ color: searchOpen ? "#6B7280" : PRIMARY }}
            aria-label={searchOpen ? "Tutup pencarian" : "Cari label"}
          >
            {searchOpen ? (
              <SoCloseIcon style={{ width: 18, height: 18 }} />
            ) : (
              <SoSearchIcon style={{ width: 18, height: 18 }} />
            )}
          </button>
        </div>

        {!searchOpen && (
          <div className="mt-2.5 flex items-center gap-2.5">
            <HeaderStat
              label="LABEL"
              value={`${totalScanned}/${totalRecords}`}
              valueColor={allScanned ? GREEN : undefined}
            />
            <span
              className="h-6 w-px"
              style={{ backgroundColor: BORDER }}
            />
            <HeaderStat
              label={unit === "pcs" ? "PCS" : "BERAT"}
              value={soFormatQty(totalWeight)}
            />
          </div>
        )}
      </div>

      {isUnknown && (
        <div
          className="flex shrink-0 items-start gap-2 px-4 py-2.5"
          style={{ backgroundColor: WARNING_BG }}
        >
          <SoAlertIcon
            className="mt-0.5 shrink-0"
            style={{ width: 16, height: 16, color: WARNING }}
          />
          <p
            className="text-[11.5px] font-semibold leading-snug"
            style={{ color: WARNING }}
          >
            Label berikut tidak memiliki blok/lokasi tercatat di sistem. Scan
            tetap dapat dilakukan seperti biasa.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && groups.length === 0 && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2Icon className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && error && groups.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <SoAlertIcon
              className="text-red-300"
              style={{ width: 32, height: 32 }}
            />
            <p className="text-[13px] font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Coba Lagi
            </button>
          </div>
        )}
        {!loading && !error && groups.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <SoInboxIcon style={{ width: 40, height: 40 }} />
            <p className="text-sm text-gray-500">Belum ada label</p>
          </div>
        )}
        {groups.length > 0 && (
          <div className="pb-2">
            {groups.map((group, gi) => (
              <LabelGroupSection
                key={`g-${group.typeId ?? "x"}-${gi}`}
                group={group}
                unit={unit}
                canManage={canManage}
                busy={busyLabelNos}
                onAskDelete={(row) => {
                  setDeleteError(null);
                  setConfirmRow(row);
                }}
              />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )}
      </div>

      {confirmRow && (
        <SoConfirmDialog
          title="Hapus Hasil Scan"
          message={`Label ${confirmRow.primaryValue} tercatat discan di lokasi ${scannedLocationLabel(confirmRow)}, bukan lokasi acuan. Hapus hasil scan ini supaya bisa discan ulang di lokasi yang benar?`}
          confirmLabel="Hapus"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setConfirmRow(null)}
        />
      )}
    </div>
  );
}

function LabelGroupSection({
  group,
  unit,
  canManage,
  busy,
  onAskDelete,
}: {
  group: SoLabelGroup;
  unit: "kg" | "pcs";
  canManage: boolean;
  busy: string[];
  onAskDelete: (row: SoLabelRow) => void;
}) {
  const complete = group.labelCount > 0 && group.scannedCount >= group.labelCount;
  const color = complete ? GREEN : PRIMARY;

  return (
    <div>
      <div
        className="flex items-center gap-2 border-y px-4 py-2"
        style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
      >
        <span
          className="min-w-0 flex-1 truncate text-[11.5px] font-bold tracking-[0.2px] text-[#1A1D23]"
          title={group.typeName}
        >
          {group.typeName}
        </span>
        <span
          className="shrink-0 text-[11px] font-bold"
          style={{ color }}
        >
          {group.scannedCount}/{group.labelCount}
        </span>
        <span className="shrink-0 text-[11px] text-gray-500">
          &middot; {soFormatQty(group.totalWeight)} {unit}
        </span>
      </div>
      {group.labels.map((row) => (
        <LabelRow
          key={`${row.primaryKey}-${row.primaryValue}`}
          row={row}
          unit={unit}
          canManage={canManage}
          isDeleting={busy.includes(row.primaryValue)}
          onAskDelete={() => onAskDelete(row)}
        />
      ))}
    </div>
  );
}

function LabelRow({
  row,
  unit,
  canManage,
  isDeleting,
  onAskDelete,
}: {
  row: SoLabelRow;
  unit: "kg" | "pcs";
  canManage: boolean;
  isDeleting: boolean;
  onAskDelete: () => void;
}) {
  const scanned = row.isScanned;
  const mismatch = scanned && row.isLocationMismatch;
  const qtyText = row.weightRaw != null
    ? soQtyText(row.weightRaw, unit)
    : soQtyText(row.countRaw, "pcs");

  const iconColor = mismatch
    ? WARNING
    : scanned
      ? GREEN
      : "#9CA3AF";
  const textColor = mismatch ? WARNING : scanned ? GREEN : INK;

  return (
    <div
      className="border-b px-4 py-2"
      style={{
        borderColor: BORDER,
        backgroundColor: mismatch
          ? WARNING_BG
          : scanned
            ? "#F3FBF7"
            : "#FFFFFF",
      }}
    >
      <div className="flex items-center gap-2.5">
        {mismatch ? (
          <SoHelpIcon
            className="shrink-0"
            style={{ width: 15, height: 15, color: iconColor }}
          />
        ) : scanned ? (
          <SoCheckCircleIcon
            className="shrink-0"
            style={{ width: 15, height: 15, color: iconColor }}
          />
        ) : (
          <SoCircleIcon
            className="shrink-0"
            style={{ width: 15, height: 15, color: iconColor }}
          />
        )}
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-semibold"
          style={{ color: textColor }}
          title={row.primaryValue}
        >
          {row.primaryValue}
        </span>
        {qtyText && (
          <span className="shrink-0 text-xs font-semibold text-gray-500">
            {qtyText}
          </span>
        )}
      </div>

      {mismatch && (
        <div className="mt-1 flex items-center gap-2 pl-[25px]">
          <span
            className="min-w-0 flex-1 truncate text-[10.5px] font-semibold"
            style={{ color: WARNING }}
          >
            Discan dari lokasi {scannedLocationLabel(row)}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={onAskDelete}
              disabled={isDeleting}
              className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10.5px] font-bold underline disabled:opacity-60"
              style={{ color: WARNING }}
            >
              {isDeleting ? (
                <Loader2Icon className="h-3 w-3 animate-spin" />
              ) : (
                <SoTrashIcon style={{ width: 13, height: 13 }} />
              )}
              Hapus &amp; scan ulang
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderStat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-bold uppercase tracking-[0.4px] text-gray-500">
        {label}
      </p>
      <p
        className="truncate text-[13px] font-bold text-[#1A1D23]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function scannedLocationLabel(row: SoLabelRow): string {
  const blok = row.scannedBlok;
  const locationId = row.scannedLocationId;
  if (blok == null || locationId == null) return "lain";
  return `${blok}${locationId}`;
}
