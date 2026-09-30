"use client";

import { useEffect, useMemo, useState } from "react";
import { getInTransitListAction } from "@/app/(app)/warehouse/in-transit/actions";
import type { GoodTransferHeader } from "@/services/good-transfer-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { InTransitDetail } from "./in-transit-detail";
import { itFormatDate, itReceivedCount, itStatusMeta } from "./in-transit-format";
import {
  ItCalendarIcon,
  ItCloseIcon,
  ItInboxIcon,
  ItSearchIcon,
  ItTruckIcon,
} from "./in-transit-icons";

const BORDER = "#E2E6EA";
const PRIMARY = "#1E6FD9";
const GREEN = "#0A7349";

export function InTransitWorkspace() {
  const [items, setItems] = useState<GoodTransferHeader[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedNo, setSelectedNo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getInTransitListAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setError(null);
        setSelectedNo((prev) =>
          prev && !res.items.some((i) => i.noTransfer === prev) ? null : prev,
        );
      } else {
        setItems(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items ?? [];
    if (!q) return list;
    return list.filter(
      (i) =>
        i.noTransfer.toLowerCase().includes(q) ||
        i.warehouseAsalLabel.toLowerCase().includes(q) ||
        i.warehouseTujuanLabel.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#F3F5F8]">
      <aside
        className="flex w-[400px] max-w-[45vw] shrink-0 flex-col border-r bg-white"
        style={{ borderColor: BORDER }}
      >
        <div className="flex items-center gap-2 px-3 pb-3 pt-3">
          <div className="relative min-w-0 flex-1">
            <ItSearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              style={{ width: 16, height: 16 }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. transfer / warehouse..."
              className="h-10 w-full rounded-[10px] border bg-[#F3F5F8] pl-9 pr-8 text-sm outline-none transition focus:border-[#1E6FD9]"
              style={{ borderColor: BORDER }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label="Bersihkan pencarian"
              >
                <ItCloseIcon style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="h-10 shrink-0 rounded-[10px] border bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Muat Ulang
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-6 pt-0">
          {loading && !items && (
            <div className="flex h-40 items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && error && !items && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="text-xs font-bold text-[#1E6FD9] underline"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && (items?.length ?? 0) === 0 && (
            <div className="flex h-40 items-center justify-center text-[13.5px] text-gray-400">
              Tidak ada transfer masuk
            </div>
          )}

          {!loading && !error && (items?.length ?? 0) > 0 && filtered.length === 0 && (
            <div className="flex h-40 items-center justify-center text-[13.5px] text-gray-400">
              Tidak ada yang cocok
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filtered.map((item) => (
              <TransferCard
                key={item.noTransfer}
                item={item}
                selected={selectedNo === item.noTransfer}
                onSelect={() => setSelectedNo(item.noTransfer)}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedNo ? (
          <InTransitDetail
            key={selectedNo}
            noTransfer={selectedNo}
            onListRefresh={() => setReloadKey((k) => k + 1)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <ItInboxIcon style={{ width: 48, height: 48 }} />
            <p className="text-sm">
              Pilih transfer dari daftar di sebelah kiri
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransferCard({
  item,
  selected,
  onSelect,
}: {
  item: GoodTransferHeader;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = itStatusMeta(item.fulfillStatus);
  const receivedCount = itReceivedCount(item.scanCount, item.inTransitCount);
  const complete =
    item.scanCount > 0 && receivedCount >= item.scanCount;
  const title = (item.catatan ?? "").trim() || item.noTransfer;
  const showNoTransfer =
    (item.catatan ?? "").trim() &&
    item.catatan!.trim() !== item.noTransfer;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-[10px] border bg-white p-3 text-left transition"
      style={{
        borderColor: selected ? PRIMARY : BORDER,
        borderWidth: selected ? 1.4 : 1,
        backgroundColor: selected ? "#E9F2FF" : "#FFFFFF",
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-extrabold tracking-[-0.2px] text-[#1A1D23]">
            {title}
          </p>
          {showNoTransfer && (
            <p className="truncate text-[11px] text-gray-500">
              {item.noTransfer}
            </p>
          )}
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: `${status.color}1A`, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <ItTruckIcon
          className="shrink-0 text-gray-500"
          style={{ width: 13, height: 13 }}
        />
        <span className="truncate text-[12.5px] font-medium text-[#374151]">
          {item.warehouseAsalLabel} &rarr; {item.warehouseTujuanLabel}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <ItCalendarIcon
          className="shrink-0 text-gray-400"
          style={{ width: 12, height: 12 }}
        />
        <span className="text-xs text-[#6B7280]">
          {itFormatDate(item.tanggalKirim)}
        </span>
        <span className="min-w-0 flex-1" />
        <span
          className="flex shrink-0 items-center gap-1 text-[11.5px] font-bold"
          style={{ color: complete ? GREEN : "#6B7280" }}
        >
          <ItTruckIcon style={{ width: 12, height: 12 }} />
          Terima {receivedCount}/{item.scanCount}
        </span>
      </div>
    </button>
  );
}
