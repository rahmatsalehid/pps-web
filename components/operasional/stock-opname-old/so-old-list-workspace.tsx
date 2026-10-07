"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSoOldListAction } from "@/app/(app)/operasional/stock-opname-old/actions";
import type { SoOldRow } from "@/services/stock-opname-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { SoAlertIcon, SoSearchIcon } from "../stock-opname/so-icons";
import { soOldActiveCats, soOldFormatTanggal } from "./so-old-format";

const BORDER = "#E2E6EA";
const PAGE_SIZE = 10;

type FilterChip = "Semua" | "Ascend" | "PPS";

export function SoOldListWorkspace() {
  const router = useRouter();
  const [items, setItems] = useState<SoOldRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChip>("Semua");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const buildParams = useCallback(
    (p: number) => ({
      page: p,
      limit: PAGE_SIZE,
      search: query,
      ...(chip === "Ascend"
        ? { isAscend: 1 as const }
        : chip === "PPS"
          ? { isAscend: 0 as const }
          : {}),
    }),
    [query, chip],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSoOldListAction(buildParams(1));
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.page.data);
        setPage(res.page.page);
        setTotal(res.page.total);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, buildParams]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page >= totalPages) return;
    setLoadingMore(true);
    const res = await getSoOldListAction(buildParams(page + 1));
    setLoadingMore(false);
    if (res.ok) {
      setItems((prev) => [...prev, ...res.page.data]);
      setPage(res.page.page);
      setTotal(res.page.total);
    }
  }, [loadingMore, page, total, buildParams]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const hasMore = items.length < total;

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

  const openDetail = useCallback(
    (row: SoOldRow) => {
      router.push(`/operasional/stock-opname-old/${encodeURIComponent(row.noSO)}`);
    },
    [router],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 items-center gap-2.5 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div className="relative min-w-0 flex-1">
          <SoSearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nomor SO..."
            className="h-[38px] w-full rounded-lg border bg-[#F8F9FB] pl-9 pr-9 text-[13px] outline-none transition focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
            style={{ borderColor: "#DCDFE4" }}
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

        {(["Semua", "Ascend", "PPS"] as FilterChip[]).map((f) => {
          const active = chip === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setChip(f)}
              className="h-[38px] rounded-lg border px-3.5 text-xs font-semibold transition"
              style={{
                backgroundColor: active ? "#E3F0FF" : "#FFFFFF",
                borderColor: active ? "#90CAF9" : "#DCDFE4",
                color: active ? "#0D47A1" : "#4A5568",
              }}
            >
              {f}
            </button>
          );
        })}

        <button
          type="button"
          onClick={refresh}
          className="h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          Muat Ulang
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div
          className="min-w-[860px] overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: "#DCDFE4" }}
        >
          <table
            className="w-full border-collapse text-left"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: 170 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 220 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                {["NOMOR SO", "TANGGAL", "SOURCE", "WAREHOUSE", "KATEGORI"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b px-4 text-[11px] font-bold tracking-[0.35px] text-[#44546F]"
                      style={{
                        height: 50,
                        borderColor: "#DCDFE4",
                        background: "linear-gradient(#FCFDFE, #F7F8F9)",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
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
                    colSpan={5}
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
                    colSpan={5}
                    className="px-4 py-10 text-center text-[13.5px] text-gray-500"
                  >
                    <span className="inline-flex flex-col items-center gap-2">
                      <SoAlertIcon
                        className="text-gray-300"
                        style={{ width: 34, height: 34 }}
                      />
                      {query || chip !== "Semua"
                        ? "Tidak ada data yang cocok"
                        : "Belum ada dokumen stock opname"}
                    </span>
                  </td>
                </tr>
              ) : (
                items.map((row, index) => {
                  const cats = soOldActiveCats(row);
                  return (
                    <tr
                      key={row.noSO}
                      onClick={() => openDetail(row)}
                      className="cursor-pointer transition hover:bg-blue-50/50"
                      style={{
                        backgroundColor: index % 2 === 1 ? "#FAFBFC" : "#fff",
                        borderBottom: "1px solid #EBECF0",
                      }}
                    >
                      <td className="px-4 py-2.5 text-[13px] font-bold text-[#1A1D23]">
                        {row.noSO}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-[#4B5563]">
                        {soOldFormatTanggal(row.tanggal)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-[#4B5563]">
                        {row.isAscend ? "Ascend" : "PPS"}
                      </td>
                      <td
                        className="truncate px-4 py-2.5 text-[13px] font-medium text-[#4B5563]"
                        title={row.namaWarehouse}
                      >
                        {row.namaWarehouse}
                      </td>
                      <td
                        className="truncate px-4 py-2.5 text-[13px] font-medium text-[#4B5563]"
                        title={cats.join(", ")}
                      >
                        {cats.length > 0 ? cats.join(", ") : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
}
