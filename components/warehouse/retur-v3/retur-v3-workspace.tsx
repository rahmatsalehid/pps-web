"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReturListAction } from "@/app/(app)/warehouse/retur-v3/actions";
import type { ReturHeader } from "@/services/retur-v3-service";
import {
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  X,
} from "@/components/dashboard/icons";
import {
  AutoRenewIcon,
  BlockIcon,
  CalendarIcon,
  HourglassIcon,
  PersonIcon,
  SearchIcon,
  SyncAltIcon,
} from "./retur-v3-icons";
import { ReturV3DetailPanel } from "./retur-v3-detail";
import { ReturV3CreateDialog } from "./retur-v3-create-dialog";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const SELECTED_BG = "#E9F2FF";
const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "DIGANTI", label: "Diganti" },
  { value: "TIDAK_DIGANTI", label: "Tidak Diganti" },
];

export function ReturV3Workspace({
  canCreate,
  canUpdate,
  canDecide,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDecide: boolean;
}) {
  const [items, setItems] = useState<ReturHeader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getReturListAction({
        page: 1,
        pageSize: PAGE_SIZE,
        search: query,
        status: statusFilter ?? undefined,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, query, statusFilter, dateFrom, dateTo]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getReturListAction({
      page: page + 1,
      pageSize: PAGE_SIZE,
      search: query,
      status: statusFilter ?? undefined,
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
    });
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setTotalPages(res.totalPages);
    }
  }, [loadingMore, page, totalPages, query, statusFilter, dateFrom, dateTo]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

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
  }, [hasMore, loading, loadingMore, items.length, page, loadMore]);

  const hasActiveFilter =
    statusFilter !== null || (dateFrom !== null && dateTo !== null);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      {/* Daftar retur */}
      <div
        className="relative flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-b bg-white lg:max-h-none lg:w-[400px] lg:border-b-0 lg:border-r"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-2 p-3 pb-2.5">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. retur / pembeli..."
              className="h-10 w-full rounded-[10px] border bg-[#F8F9FB] pl-9 pr-8 text-sm outline-none focus:border-blue-500"
              style={{ borderColor: BORDER }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative inline-flex h-10 items-center rounded-[10px] border px-3 text-xs font-semibold"
            style={{
              backgroundColor: hasActiveFilter ? `${PRIMARY}1A` : "#F8F9FB",
              borderColor: hasActiveFilter ? PRIMARY : BORDER,
              color: hasActiveFilter ? PRIMARY : "#4B5563",
            }}
            title="Filter"
          >
            Filter
            {hasActiveFilter && (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full"
                style={{ backgroundColor: PRIMARY }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded p-2 text-gray-400 hover:bg-gray-100"
            title="Muat ulang"
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="h-px" style={{ backgroundColor: BORDER }} />
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-24 pt-2.5">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : error ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-red-600">
              <span>{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="mt-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs text-white"
              >
                Coba lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[13.5px] text-gray-500">
              Tidak ada data.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((h) => (
                <ReturCard
                  key={h.noRetur}
                  header={h}
                  selected={h.noRetur === selected}
                  onTap={() => setSelected(h.noRetur)}
                />
              ))}
              {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
              {!loadingMore && hasMore && (
                <div className="flex flex-col items-center gap-1.5 py-2 text-[11px] text-gray-400">
                  <span>Menampilkan {items.length} data</span>
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="rounded-full border px-4 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    style={{ borderColor: BORDER }}
                  >
                    Muat {PAGE_SIZE} data lagi
                  </button>
                </div>
              )}
              {loadingMore && (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400">
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat data
                  berikutnya…
                </div>
              )}
            </div>
          )}
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition hover:brightness-110"
            style={{ backgroundColor: PRIMARY }}
            title="Buat Retur Baru"
            aria-label="Buat Retur Baru"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Detail */}
      <div className="min-h-0 min-w-0 flex-1 bg-[#F3F5F8]">
        {selected ? (
          <ReturV3DetailPanel
            key={selected}
            noRetur={selected}
            canUpdate={canUpdate}
            canDecide={canDecide}
            onChanged={refresh}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-12 w-12 text-gray-300"
              aria-hidden
            >
              <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
              <path d="M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
            </svg>
            <p className="text-[13.5px]">
              Pilih retur dari daftar di sebelah kiri
            </p>
          </div>
        )}
      </div>

      {filterOpen && (
        <ReturFilterDialog
          status={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setFilterOpen(false)}
          onApply={(v) => {
            setStatusFilter(v.status);
            setDateFrom(v.dateFrom);
            setDateTo(v.dateTo);
            setFilterOpen(false);
          }}
        />
      )}

      {createOpen && (
        <ReturV3CreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(noRetur) => {
            setCreateOpen(false);
            setSelected(noRetur);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ReturFilterDialog({
  status,
  dateFrom,
  dateTo,
  onApply,
  onClose,
}: {
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  onApply: (v: {
    status: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  }) => void;
  onClose: () => void;
}) {
  const [draftStatus, setDraftStatus] = useState<string | null>(status);
  const [draftFrom, setDraftFrom] = useState<string | null>(dateFrom);
  const [draftTo, setDraftTo] = useState<string | null>(dateTo);

  function toggleStatus(value: string) {
    setDraftStatus((cur) => (cur === value ? null : value));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <p className="text-[17px] font-bold text-[#1A1D23]">Filter Retur</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 pt-3">
          <div>
            <p className="mb-2 text-[12.5px] font-bold text-[#1A1D23]">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => {
                const active = draftStatus === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleStatus(o.value)}
                    className="rounded-full border px-3 py-1 text-xs transition"
                    style={{
                      backgroundColor: active ? `${PRIMARY}26` : "#fff",
                      borderColor: active ? PRIMARY : BORDER,
                      color: active ? PRIMARY : "#374151",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12.5px] font-bold text-[#1A1D23]">Tanggal</p>
            <div className="flex items-center gap-2">
              <DateFieldBox
                label="Dari"
                value={draftFrom}
                onChange={(v) => {
                  setDraftFrom(v);
                  if (v && draftTo && v > draftTo) setDraftTo(v);
                }}
              />
              <span className="text-gray-400">→</span>
              <DateFieldBox
                label="Sampai"
                value={draftTo}
                onChange={(v) => {
                  setDraftTo(v);
                  if (v && draftFrom && v < draftFrom) setDraftFrom(v);
                }}
              />
              {draftFrom && draftTo && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftFrom(null);
                    setDraftTo(null);
                  }}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  title="Hapus filter tanggal"
                  aria-label="Hapus filter tanggal"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => onApply({ status: null, dateFrom: null, dateTo: null })}
              className="flex-1 rounded-full border border-gray-300 py-2.5 text-xs font-bold text-[#4A5568] hover:bg-gray-50"
            >
              RESET
            </button>
            <button
              type="button"
              onClick={() =>
                onApply({ status: draftStatus, dateFrom: draftFrom, dateTo: draftTo })
              }
              className="flex-1 rounded-full py-2.5 text-xs font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              TERAPKAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateFieldBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const active = Boolean(value);
  return (
    <label
      className="relative flex-1 cursor-pointer rounded-[10px] px-3 py-2"
      style={{
        backgroundColor: active ? `${PRIMARY}0A` : "#F8F9FB",
        border: `1px solid ${active ? PRIMARY : BORDER}`,
      }}
    >
      <span
        className="block text-[10.5px] font-semibold"
        style={{ color: active ? PRIMARY : "#6B7280" }}
      >
        {label}
      </span>
      <span
        className="block truncate text-[12.5px]"
        style={{
          color: active ? "#1A1D23" : "#9CA3AF",
          fontWeight: active ? 700 : 500,
        }}
      >
        {value
          ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Pilih tanggal"}
      </span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}

function ReturCard({
  header,
  selected,
  onTap,
}: {
  header: ReturHeader;
  selected: boolean;
  onTap: () => void;
}) {
  const title = header.keterangan?.trim() ? header.keterangan.trim() : header.noRetur;

  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full rounded-[10px] border p-3 text-left transition"
      style={{
        borderColor: selected ? PRIMARY : BORDER,
        borderWidth: selected ? 1.4 : 1,
        backgroundColor: selected ? SELECTED_BG : "#fff",
      }}
    >
      <div className="flex items-start gap-2">
        <p
          className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold"
          style={{ color: selected ? "#0C66E4" : "#1A1D23" }}
        >
          {title}
        </p>
        <StatusChip status={header.statusRetur} />
      </div>
      {title !== header.noRetur && (
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{header.noRetur}</p>
      )}
      <div className="mt-1.5 flex items-center gap-1">
        <PersonIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#374151]">
          {header.namaPembeli ?? "-"}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-[#6B7280]">
        <span className="flex min-w-0 items-center gap-1.5">
          <CalendarIcon className="h-3 w-3 shrink-0 text-gray-500" />
          <span className="truncate">{fmtDate(header.tanggal)}</span>
        </span>
        {header.isDiganti && (
          <span className="flex shrink-0 items-center gap-1 text-[11.5px] font-bold">
            <SyncAltIcon
              className="h-3.5 w-3.5"
              style={{ color: header.isTurnoverFulfilled ? "#388E3C" : "#6B7280" }}
            />
            <span style={{ color: header.isTurnoverFulfilled ? "#388E3C" : "#6B7280" }}>
              {turnoverPercent(header)}
            </span>
          </span>
        )}
      </div>
    </button>
  );
}

function StatusChip({ status }: { status: string }) {
  const info = statusInfo(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${info.bg}1A`, color: info.fg }}
    >
      <info.icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

function statusInfo(status: string): {
  label: string;
  bg: string;
  fg: string;
  icon: typeof BlockIcon;
} {
  switch (String(status).toUpperCase()) {
    case "DIGANTI":
      return { label: "Diganti", bg: "#2196F3", fg: "#1976D2", icon: AutoRenewIcon };
    case "TIDAK_DIGANTI":
      return { label: "Tidak Diganti", bg: "#FF9800", fg: "#E64A19", icon: BlockIcon };
    default:
      return { label: "Pending", bg: "#FFC107", fg: "#FFA000", icon: HourglassIcon };
  }
}

function turnoverPercent(h: ReturHeader): string {
  if (h.turnoverTargetPcs <= 0) return "Turnover -";
  const pct = Math.min(
    Math.max(
      Math.round((h.turnoverScannedPcs / h.turnoverTargetPcs) * 100),
      0,
    ),
    100,
  );
  return `Turnover ${pct}%`;
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
