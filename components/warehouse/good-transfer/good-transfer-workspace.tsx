"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getGoodTransferListAction } from "@/app/(app)/warehouse/good-transfer/actions";
import type { GoodTransferHeader } from "@/services/good-transfer-service";
import {
  BoxIcon,
  CheckCircleIcon,
  HistoryIcon,
  Loader2Icon,
  PackageIcon,
  RotateCcwIcon,
  TruckIcon,
  X,
  XIcon,
} from "@/components/dashboard/icons";
import { GoodTransferDetailPanel } from "./good-transfer-detail";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const SELECTED_BG = "#E9F2FF";
const MUTED = "#6B7280";
const PAGE_SIZE = 50;

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "OPEN", label: "Belum Diisi" },
  { value: "PARTIAL", label: "Sebagian" },
  { value: "READY", label: "Siap Kirim" },
  { value: "SHIPPED", label: "Dikirim" },
  { value: "RECEIVED", label: "Diterima" },
];

export function GoodTransferWorkspace({ canUpdate }: { canUpdate: boolean }) {
  const [items, setItems] = useState<GoodTransferHeader[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getGoodTransferListAction({
        page: 1,
        limit: PAGE_SIZE,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setPage(res.page);
        setHasMore(res.hasMore);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const res = await getGoodTransferListAction({
      page: page + 1,
      limit: PAGE_SIZE,
    });
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setHasMore(res.hasMore);
    }
  }, [loadingMore, hasMore, page]);

  const refresh = () => setReloadKey((k) => k + 1);

  const sentinelRef = useRef<HTMLDivElement>(null);
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

  const q = search.trim().toLowerCase();
  const filtered = items.filter((h) => {
    if (statusFilter && h.fulfillStatus !== statusFilter) return false;
    if (!q) return true;
    return (
      h.noTransfer.toLowerCase().includes(q) ||
      h.warehouseAsalLabel.toLowerCase().includes(q) ||
      h.warehouseTujuanLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      {/* Daftar transfer */}
      <div
        className="flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-b bg-white lg:max-h-none lg:w-[400px] lg:border-b-0 lg:border-r"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-2 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. transfer / warehouse..."
            className="h-10 min-w-0 flex-1 rounded-full border bg-gray-50 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            style={{ borderColor: BORDER }}
          />
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold"
            style={{
              borderColor: statusFilter ? PRIMARY : BORDER,
              color: statusFilter ? PRIMARY : "#4B5563",
            }}
          >
            Filter
            {statusFilter && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
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
              Belum ada Goods Transfer
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[13.5px] text-gray-500">
              Tidak ada transfer yang cocok
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((h) => (
                <TransferCard
                  key={h.noTransfer}
                  header={h}
                  selected={h.noTransfer === selected}
                  onTap={() => setSelected(h.noTransfer)}
                />
              ))}
              {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
              {!loadingMore && hasMore && (
                <div className="flex flex-col items-center gap-1.5 py-2 text-[11px] text-gray-400">
                  <span>Menampilkan {filtered.length} data</span>
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
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat
                  data berikutnya…
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="min-h-0 min-w-0 flex-1 bg-[#F3F5F8]">
        {selected ? (
          <GoodTransferDetailPanel
            key={selected}
            noTransfer={selected}
            canUpdate={canUpdate}
            onChanged={refresh}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-400">
            Pilih Goods Transfer dari daftar di sebelah kiri
          </div>
        )}
      </div>

      {filterOpen && (
        <StatusFilterDialog
          value={statusFilter}
          onClose={() => setFilterOpen(false)}
          onApply={(v) => {
            setStatusFilter(v);
            setFilterOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StatusFilterDialog({
  value,
  onApply,
  onClose,
}: {
  value: string | null;
  onApply: (v: string | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(value);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5">
          <p className="text-sm font-bold text-gray-900">Filter Status</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-5">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTER_OPTIONS.map((o) => {
              const active = draft === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDraft(active ? null : o.value)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: active ? PRIMARY : "#fff",
                    borderColor: active ? PRIMARY : BORDER,
                    color: active ? "#fff" : "#4B5563",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onApply(null)}
              className="flex-1 rounded-full border border-gray-300 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              RESET
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="flex-1 rounded-full py-2 text-xs font-bold text-white"
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

function TransferCard({
  header,
  selected,
  onTap,
}: {
  header: GoodTransferHeader;
  selected: boolean;
  onTap: () => void;
}) {
  const erpNo = header.catatan?.trim() ? header.catatan.trim() : header.noTransfer;
  const filled = header.isFilled;

  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full rounded-[10px] border bg-white p-3 text-left transition"
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
          {erpNo}
        </p>
        <FulfillChip status={header.fulfillStatus} />
      </div>
      {erpNo !== header.noTransfer && (
        <p className="mt-0.5 truncate text-[11px] text-gray-500">
          {header.noTransfer}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-1">
        <TruckIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#374151]">
          {header.warehouseAsalLabel} → {header.warehouseTujuanLabel}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-[#6B7280]">
        <span className="flex min-w-0 items-center gap-1.5">
          <CalendarIcon className="h-3 w-3 shrink-0 text-gray-500" />
          <span className="truncate">{fmtDate(header.tanggalKirim)}</span>
          {header.usernameKirim && (
            <span className="flex min-w-0 items-center gap-1">
              <PersonIcon className="h-3 w-3 shrink-0 text-gray-500" />
              <span className="truncate">{header.usernameKirim}</span>
            </span>
          )}
        </span>
        <span
          className="shrink-0 text-[11.5px] font-bold"
          style={{ color: filled ? "#15803D" : MUTED }}
        >
          Terisi {header.completedLines}/{header.totalLines}
        </span>
      </div>
    </button>
  );
}

function FulfillChip({ status }: { status: string }) {
  const f = fulfillInfo(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${f.color}1A`, color: f.color }}
    >
      <f.icon className="h-3 w-3" />
      {f.label}
    </span>
  );
}

function fulfillInfo(status: string): {
  color: string;
  label: string;
  icon: typeof BoxIcon;
} {
  switch (status) {
    case "RECEIVED":
      return { color: "#0A7349", label: "Diterima", icon: PackageIcon };
    case "SHIPPED":
      return { color: PRIMARY, label: "Dikirim", icon: TruckIcon };
    case "READY":
      return { color: PRIMARY, label: "Siap Kirim", icon: CheckCircleIcon };
    case "PARTIAL":
      return { color: "#D97706", label: "Sebagian", icon: HistoryIcon };
    case "CANCELLED":
      return { color: "#6B7280", label: "Dibatalkan", icon: XIcon };
    case "REJECTED":
      return { color: "#DC2626", label: "Ditolak", icon: XIcon };
    default:
      return { color: "#6B7280", label: "Belum Diisi", icon: BoxIcon };
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
