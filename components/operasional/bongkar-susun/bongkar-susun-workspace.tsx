"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteBongkarSusunAction,
  getBongkarSusunListAction,
} from "@/app/(app)/operasional/bongkar-susun/actions";
import {
  bsCategoryLabel,
  type BsListRow,
} from "@/services/bongkar-susun-service";
import { Loader2Icon, PlusIcon, X } from "@/components/dashboard/icons";
import { ArrowRightIcon, SearchIcon } from "./bongkar-susun-icons";
import { formatTanggal } from "./format";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";
const PAGE_SIZE = 20;

export function BongkarSusunWorkspace() {
  const router = useRouter();
  const [items, setItems] = useState<BsListRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  const [menu, setMenu] = useState<{ no: string; x: number; y: number } | null>(
    null,
  );
  const [confirmRow, setConfirmRow] = useState<BsListRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getBongkarSusunListAction({
        page: 1,
        pageSize: PAGE_SIZE,
        search: query,
      });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const res = await getBongkarSusunListAction({
      page: page + 1,
      pageSize: PAGE_SIZE,
      search: query,
    });
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    }
  }, [loadingMore, page, totalPages, query]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const openDetail = useCallback(
    (no: string) => {
      router.push(`/operasional/bongkar-susun/${encodeURIComponent(no)}`);
    },
    [router],
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmRow || deleting) return;
    setDeleting(true);
    const res = await deleteBongkarSusunAction(confirmRow.noBongkarSusun);
    setDeleting(false);
    setConfirmRow(null);
    if (res.ok) {
      showFlash(`${confirmRow.noBongkarSusun} berhasil dihapus`);
      refresh();
    } else {
      setDeleteError(res.error);
    }
  }, [confirmRow, deleting, refresh, showFlash]);

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

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 items-center gap-2 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor bongkar susun..."
            className="h-9 w-full rounded-[10px] border bg-[#F8F9FB] pl-9 pr-9 text-sm outline-none transition focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={{ borderColor: BORDER }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          Muat Ulang
        </button>
      </div>

      {flash && (
        <div className="shrink-0 border-b border-green-200 bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-700">
          {flash}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div
          className="min-w-[900px] overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "#DCDFE4" }}
        >
          <table
            className="w-full border-collapse text-left"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: 185 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 120 }} />
              <col />
              <col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  "NO. BONGKAR SUSUN",
                  "TANGGAL",
                  "CREATE BY",
                  "KATEGORI",
                  "IN → OUT",
                  "CATATAN",
                  "",
                ].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="border-b px-4 text-[11px] font-bold tracking-[0.35px] text-[#44546F]"
                    style={{
                      height: 50,
                      borderColor: "#DCDFE4",
                      background: "linear-gradient(#FCFDFE, #F7F8F9)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin" /> Memuat…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-red-600"
                  >
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={refresh}
                      className="mt-2 block w-full rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white"
                    >
                      Coba lagi
                    </button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[13.5px] text-gray-500"
                  >
                    {query
                      ? "Tidak ada bongkar susun yang cocok"
                      : "Belum ada transaksi bongkar susun"}
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <BsRowCells
                    key={row.noBongkarSusun}
                    row={row}
                    striped={index % 2 === 1}
                    onTap={() => openDetail(row.noBongkarSusun)}
                    onMenu={(x, y) => setMenu({ no: row.noBongkarSusun, x, y })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 py-3 text-[11px] text-gray-400">
            <span>
              Menampilkan {items.length} data{total > 0 ? ` dari ${total}` : ""}
            </span>
            {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
            {hasMore && !loadingMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                className="rounded-full border px-4 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                style={{ borderColor: BORDER }}
              >
                Muat {PAGE_SIZE} data lagi
              </button>
            )}
            {loadingMore && (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Memuat data
                berikutnya…
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push("/operasional/bongkar-susun/baru")}
        className="absolute bottom-5 right-6 flex h-14 items-center justify-center gap-2 rounded-full px-5 text-white shadow-lg transition hover:brightness-95"
        style={{ backgroundColor: PRIMARY }}
      >
        <PlusIcon className="h-5 w-5" />
        <span className="text-sm font-bold">Buat Baru</span>
      </button>

      {menu && (
        <RowMenu
          x={menu.x}
          y={menu.y}
          no={menu.no}
          onClose={() => setMenu(null)}
          onDetail={() => {
            const no = menu.no;
            setMenu(null);
            openDetail(no);
          }}
          onDelete={() => {
            const row = items.find((r) => r.noBongkarSusun === menu.no) ?? null;
            setMenu(null);
            setConfirmRow(row);
          }}
        />
      )}

      {confirmRow && (
        <ConfirmDeleteDialog
          no={confirmRow.noBongkarSusun}
          busy={deleting}
          onCancel={() => setConfirmRow(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {deleteError && (
        <ErrorDialog
          title="Gagal Menghapus"
          message={deleteError}
          onClose={() => setDeleteError(null)}
        />
      )}
    </div>
  );
}

function BsRowCells({
  row,
  striped,
  onTap,
  onMenu,
}: {
  row: BsListRow;
  striped: boolean;
  onTap: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  const unbalanced = row.balance === false;
  return (
    <tr
      onClick={onTap}
      className="cursor-pointer transition"
      style={{
        backgroundColor: unbalanced
          ? "#FEF2F2"
          : striped
            ? "#FAFBFC"
            : "#fff",
        borderBottom: "1px solid #EBECF0",
      }}
    >
      <td className="px-4 py-2.5 text-[13px] font-bold text-[#1A1D23]">
        {row.noBongkarSusun}
      </td>
      <td className="px-4 py-2.5 text-[13px] text-[#4B5563]">
        {formatTanggal(row.tanggal)}
      </td>
      <td className="px-4 py-2.5">
        {row.username ? (
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-extrabold"
              style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
            >
              {row.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-[13px] font-medium text-[#374151]">
              {row.username}
            </span>
          </span>
        ) : (
          <span className="text-[13px] text-gray-300">—</span>
        )}
      </td>
      <td className="truncate px-4 py-2.5 text-[13px] font-medium text-[#374151]">
        {bsCategoryLabel(row.category)}
      </td>
      <td className="px-4 py-2.5">
        <span className="flex items-center justify-center gap-1.5">
          <CountPill count={row.inputLabelCount} color={PRIMARY} />
          <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300" />
          <CountPill count={row.outputLabelCount} color={GREEN} />
        </span>
      </td>
      <td className="truncate px-4 py-2.5 text-[13px] italic text-[#6B7280]">
        {row.note || <span className="not-italic text-gray-300">—</span>}
      </td>
      <td className="px-2 py-2.5 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onMenu(rect.right, rect.bottom + 4);
          }}
          className="rounded-md px-2 py-1 text-lg leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={`Aksi ${row.noBongkarSusun}`}
        >
          ⋯
        </button>
      </td>
    </tr>
  );
}

function CountPill({ count, color }: { count: number; color: string }) {
  return (
    <span
      className="inline-flex min-w-[28px] justify-center rounded-md px-2 py-0.5 text-xs font-bold"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {count}
    </span>
  );
}

function RowMenu({
  x,
  y,
  no,
  onClose,
  onDetail,
  onDelete,
}: {
  x: number;
  y: number;
  no: string;
  onClose: () => void;
  onDetail: () => void;
  onDelete: () => void;
}) {
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 232);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 768) - 160);
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute z-50 w-56 overflow-hidden rounded-xl border bg-white shadow-xl"
        style={{ left, top, borderColor: BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 border-b px-3.5 py-2.5"
          style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
        >
          <span className="truncate text-xs font-bold text-[#1A1D23]">{no}</span>
        </div>
        <button
          type="button"
          onClick={onDetail}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-gray-50"
          style={{ color: PRIMARY }}
        >
          Lihat Detail
        </button>
        <div className="mx-3.5 h-px" style={{ backgroundColor: BORDER }} />
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
        >
          Hapus Transaksi
        </button>
        <div className="mx-3.5 h-px" style={{ backgroundColor: BORDER }} />
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#374151] hover:bg-gray-50"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({
  no,
  busy,
  onCancel,
  onConfirm,
}: {
  no: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-5 pb-1 pt-5">
          <p className="text-base font-bold text-[#1A1D23]">Hapus Transaksi?</p>
          <p className="mt-2 text-sm text-gray-600">
            Hapus {no}? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorDialog({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50 px-5 py-4">
          <p className="text-sm font-bold text-red-700">{title}</p>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end px-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
