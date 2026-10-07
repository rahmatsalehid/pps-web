"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import {
  deleteSoOldAscendItemAction,
  getSoOldAscendItemsAction,
  getSoOldFamiliesAction,
  getSoOldUsageAction,
  saveSoOldAscendAction,
} from "@/app/(app)/operasional/stock-opname-old/actions";
import type {
  SoOldAscendItem,
  SoOldFamily,
} from "@/services/stock-opname-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import {
  SoAlertIcon,
  SoCheckCircleIcon,
  SoInboxIcon,
  SoSearchIcon,
} from "../stock-opname/so-icons";
import { soOldFormatQty, soOldFormatTanggal } from "./so-old-format";

const BORDER = "#E2E6EA";
const BLUE = "#3B82F6";
const GREEN = "#10B981";

export function SoOldAscendWorkspace({
  noSO,
  tgl,
  idWarehouses,
}: {
  noSO: string;
  tgl: string;
  idWarehouses: number[];
}) {
  const [families, setFamilies] = useState<SoOldFamily[]>([]);
  const [famLoading, setFamLoading] = useState(true);
  const [famError, setFamError] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);

  const [items, setItems] = useState<SoOldAscendItem[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState<Record<number, string>>({});
  const [remarkText, setRemarkText] = useState<Record<number, string>>({});
  const [usageLoading, setUsageLoading] = useState<Record<number, boolean>>({});
  const usageInFlight = useRef<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [menu, setMenu] = useState<{
    itemID: number;
    x: number;
    y: number;
  } | null>(null);

  const [flash, setFlash] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);
  const flashTimer = useRef<number | null>(null);

  const showFlash = useCallback((text: string, tone: "ok" | "error") => {
    setFlash({ text, tone });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setKeyword(search.trim()), 500);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchFamilies = useCallback(async () => {
    const res = await getSoOldFamiliesAction(noSO);
    if (res.ok) {
      setFamilies(res.items);
      setFamError(null);
    } else {
      setFamilies([]);
      setFamError(res.error);
    }
  }, [noSO]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFamLoading(true);
      await fetchFamilies();
      if (cancelled) return;
      setFamLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchFamilies, reloadKey]);

  const applyItems = useCallback((next: SoOldAscendItem[]) => {
    setItems(next);
    const qt: Record<number, string> = {};
    const rt: Record<number, string> = {};
    for (const it of next) {
      qt[it.itemID] = it.qtyFisik != null ? String(it.qtyFisik) : "";
      rt[it.itemID] = it.usageRemark ?? "";
    }
    setQtyText(qt);
    setRemarkText(rt);
  }, []);

  const fetchItems = useCallback(
    async (familyID: number, kw: string) => {
      setItemLoading(true);
      const res = await getSoOldAscendItemsAction(noSO, familyID, kw);
      setItemLoading(false);
      if (res.ok) {
        applyItems(res.items);
        setItemError(null);
      } else {
        setItems([]);
        setItemError(res.error);
      }
    },
    [noSO, applyItems],
  );

  useEffect(() => {
    if (selectedFamily == null) return;
    let cancelled = false;
    void (async () => {
      setItemLoading(true);
      const res = await getSoOldAscendItemsAction(noSO, selectedFamily, keyword);
      if (cancelled) return;
      setItemLoading(false);
      if (res.ok) {
        applyItems(res.items);
        setItemError(null);
      } else {
        setItems([]);
        setItemError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noSO, selectedFamily, keyword, reloadKey, applyItems]);

  const totalItems = families.reduce((sum, f) => sum + f.totalItem, 0);
  const completeItems = families.reduce((sum, f) => sum + f.completeItem, 0);

  const updateItem = useCallback(
    (itemID: number, patch: Partial<SoOldAscendItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.itemID === itemID ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const fetchUsageOnce = useCallback(
    async (itemID: number) => {
      if (usageInFlight.current.has(itemID)) return;
      usageInFlight.current.add(itemID);
      setUsageLoading((prev) => ({ ...prev, [itemID]: true }));
      const res = await getSoOldUsageAction(itemID, tgl, idWarehouses);
      usageInFlight.current.delete(itemID);
      setUsageLoading((prev) => {
        const next = { ...prev };
        delete next[itemID];
        return next;
      });
      if (res.ok) {
        updateItem(itemID, {
          qtyUsage: res.qtyUsage,
          isUpdateUsage: true,
        });
      } else {
        showFlash(`Gagal mengambil qty usage: ${res.error}`, "error");
      }
    },
    [tgl, idWarehouses, updateItem, showFlash],
  );

  const onQtyChange = useCallback(
    (item: SoOldAscendItem, val: string) => {
      setQtyText((prev) => ({ ...prev, [item.itemID]: val }));
      const parsed = val === "" ? 0 : (parseFloat(val.replace(",", ".")) || 0);
      if (val === "") {
        updateItem(item.itemID, {
          qtyFisik: parsed,
          qtyUsage: -1,
          isUpdateUsage: false,
        });
        usageInFlight.current.delete(item.itemID);
        return;
      }
      updateItem(item.itemID, { qtyFisik: parsed });
      if (!item.isUpdateUsage) {
        void fetchUsageOnce(item.itemID);
      }
    },
    [updateItem, fetchUsageOnce],
  );

  const onRemarkChange = useCallback(
    (item: SoOldAscendItem, val: string) => {
      setRemarkText((prev) => ({ ...prev, [item.itemID]: val }));
      updateItem(item.itemID, { usageRemark: val });
    },
    [updateItem],
  );

  const onSelectFamily = useCallback(
    (familyID: number) => {
      setSelectedFamily(familyID);
      setItems([]);
      setItemError(null);
      usageInFlight.current.clear();
      setUsageLoading({});
    },
    [],
  );

  const onClearItem = useCallback(
    async (itemID: number) => {
      setMenu(null);
      const res = await deleteSoOldAscendItemAction(noSO, itemID);
      if (res.ok) {
        updateItem(itemID, {
          qtyFisik: null,
          qtyUsage: null,
          isUpdateUsage: false,
        });
        usageInFlight.current.delete(itemID);
        setQtyText((prev) => ({ ...prev, [itemID]: "" }));
        showFlash("Item berhasil dihapus", "ok");
      } else {
        showFlash(`Gagal menghapus item: ${res.error}`, "error");
      }
    },
    [noSO, updateItem, showFlash],
  );

  const onInfoUsage = useCallback(
    (item: SoOldAscendItem) => {
      setMenu(null);
      const usageText =
        item.isUpdateUsage && item.qtyUsage != null
          ? soOldFormatQty(item.qtyUsage)
          : "belum dihitung";
      showFlash(`Qty Usage: ${usageText} (start: ${soOldFormatTanggal(tgl)})`, "ok");
    },
    [tgl, showFlash],
  );

  const onSave = useCallback(async () => {
    if (items.length === 0) {
      showFlash("Tidak ada data untuk disimpan", "error");
      return;
    }
    const payload = items
      .filter((it) => it.isUpdateUsage)
      .map((it) => ({
        itemId: it.itemID,
        qtyFound: it.qtyFisik,
        qtyUsage: it.qtyUsage,
        usageRemark: it.usageRemark,
        isUpdateUsage: it.isUpdateUsage,
      }));
    if (payload.length === 0) {
      showFlash("Gagal menyimpan data", "error");
      return;
    }
    setSaving(true);
    const res = await saveSoOldAscendAction(noSO, payload);
    setSaving(false);
    if (res.ok) {
      showFlash("Data berhasil disimpan & di-refresh", "ok");
      void fetchFamilies();
      if (selectedFamily != null) {
        usageInFlight.current.clear();
        await fetchItems(selectedFamily, keyword);
      }
    } else {
      showFlash(`Gagal menyimpan: ${res.error}`, "error");
    }
  }, [items, noSO, selectedFamily, keyword, fetchFamilies, fetchItems, showFlash]);

  const onScrollItems = useCallback((e: UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div className="w-[190px] shrink-0">
          <p className="truncate text-[13px] font-extrabold text-[#1A1D23]">
            {noSO}
          </p>
          <p className="truncate text-xs text-[#4A5568]">
            {soOldFormatTanggal(tgl)}
          </p>
        </div>

        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5"
          style={{
            backgroundColor: "#0A734914",
            borderColor: "#0A73492E",
          }}
        >
          <SoCheckCircleIcon
            style={{ width: 15, height: 15, color: "#0A7349" }}
          />
          <span className="text-xs font-extrabold text-[#0A7349]">
            {completeItems}/{totalItems}
          </span>
        </span>

        <div className="relative min-w-0 flex-1">
          <SoSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari item..."
            className="h-10 w-full rounded-lg border bg-[#F8F9FB] pl-9 pr-9 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
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

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="h-10 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          Muat Ulang
        </button>

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60"
          style={{ backgroundColor: "#0D47A1" }}
        >
          {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
          Simpan Data
        </button>
      </div>

      {flash && (
        <div
          className="shrink-0 border-b px-4 py-2 text-[13px] font-semibold"
          style={
            flash.tone === "ok"
              ? { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", color: "#15803D" }
              : { backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }
          }
        >
          {flash.text}
        </div>
      )}

      <div className="min-h-0 flex-1 p-2">
        <div
          className="flex h-full overflow-hidden rounded-xl border bg-white shadow-sm"
          style={{ borderColor: BORDER }}
        >
          <div className="flex w-[300px] shrink-0 flex-col border-r" style={{ borderColor: BORDER }}>
            <div
              className="flex items-center gap-2 px-4 py-3.5"
              style={{ backgroundColor: "#F8FAFC" }}
            >
              <span
                className="grid place-items-center rounded-md p-1.5"
                style={{ backgroundColor: BLUE }}
              >
                <SoAlertIcon style={{ width: 15, height: 15, color: "#fff" }} />
              </span>
              <span className="text-[15px] font-semibold text-[#1F2937]">
                Family
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-2">
              {famLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2Icon
                    className="h-6 w-6 animate-spin text-blue-500"
                  />
                  <p className="text-sm">Memuat familie...</p>
                </div>
              ) : famError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                  <SoAlertIcon className="text-red-300" style={{ width: 40, height: 40 }} />
                  <p className="text-sm text-red-600">{famError}</p>
                </div>
              ) : families.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <SoInboxIcon className="text-gray-300" style={{ width: 44, height: 44 }} />
                  <p className="text-sm text-gray-500">Tidak ada family</p>
                </div>
              ) : (
                families.map((f) => {
                  const selected = selectedFamily === f.familyId;
                  const progress =
                    f.totalItem > 0 ? f.completeItem / f.totalItem : 0;
                  const pct = Math.round(progress * 100);
                  const done = progress === 1;
                  return (
                    <button
                      key={f.familyId}
                      type="button"
                      onClick={() => onSelectFamily(f.familyId)}
                      className="mb-1 block w-full rounded-lg border px-3 py-2.5 text-left transition"
                      style={{
                        backgroundColor: selected ? "#3B82F61A" : "transparent",
                        borderColor: selected ? BLUE : "transparent",
                        borderWidth: selected ? 1.5 : 1,
                      }}
                    >
                      <p
                        className="truncate text-[13.5px]"
                        style={{
                          fontWeight: selected ? 600 : 500,
                          color: selected ? "#1E3A8A" : "#1F2937",
                        }}
                      >
                        {f.familyName || `Family ${f.familyId}`}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {f.completeItem}/{f.totalItem} items
                        </span>
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: done ? "#16A34A" : BLUE }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
                        style={{ backgroundColor: "#E5E7EB" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: done ? "#22C55E" : BLUE,
                          }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className="flex items-center gap-2 px-4 py-3.5"
              style={{ backgroundColor: "#F8FAFC" }}
            >
              <span
                className="grid place-items-center rounded-md p-1.5"
                style={{ backgroundColor: GREEN }}
              >
                <SoInboxIcon style={{ width: 15, height: 15, color: "#fff" }} />
              </span>
              <span className="text-[15px] font-semibold text-[#1F2937]">
                Detail Item
              </span>
              <span className="flex-1" />
              {items.length > 0 && (
                <span
                  className="rounded-full px-2 py-1 text-xs font-semibold"
                  style={{ backgroundColor: "#3B82F61A", color: "#1E3A8A" }}
                >
                  {items.length} items
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto" onScroll={onScrollItems}>
              {itemLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2Icon
                    className="h-6 w-6 animate-spin text-emerald-500"
                  />
                  <p className="text-sm">Memuat item...</p>
                </div>
              ) : itemError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <SoAlertIcon className="text-red-300" style={{ width: 40, height: 40 }} />
                  <p className="text-sm text-red-600">{itemError}</p>
                </div>
              ) : selectedFamily == null ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <SoInboxIcon className="text-gray-300" style={{ width: 48, height: 48 }} />
                  <p className="text-sm text-gray-500">
                    Pilih family untuk lihat items
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <SoInboxIcon className="text-gray-300" style={{ width: 48, height: 48 }} />
                  <p className="text-sm text-gray-500">
                    {keyword ? "Item tidak ditemukan" : "Tidak ada item"}
                  </p>
                </div>
              ) : (
                <table
                  className="w-full border-collapse text-left"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "17%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ backgroundColor: "#1F2937" }}>
                      {[
                        "No",
                        "Item Code",
                        "Shelf Code",
                        "Nama Item",
                        "PCS",
                        "Qty Usage",
                        "Qty Found",
                        "Remark",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[12px] font-semibold text-white"
                          style={{
                            textAlign:
                              h === "PCS" || h === "Qty Usage" || h === "Qty Found"
                                ? "center"
                                : "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.itemID}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#FAFAFA" : "#FFFFFF",
                          borderBottom: "1px solid #F0F1F3",
                        }}
                      >
                        <td className="px-3 py-1.5 text-[12px] text-[#4B5563]">
                          {index + 1}
                        </td>
                        <td className="truncate px-3 py-1.5 text-[12px] font-medium text-[#1F2937]">
                          {item.itemCode}
                        </td>
                        <td className="truncate px-3 py-1.5 text-[12px] font-medium text-[#1F2937]">
                          {item.shelfCode ?? "-"}
                        </td>
                        <td
                          className="truncate px-3 py-1.5 text-[12px] text-[#374151]"
                          title={item.itemName}
                        >
                          {item.itemName}
                        </td>
                        <td className="px-3 py-1.5 text-center text-[12px] text-[#4B5563]">
                          {soOldFormatQty(item.pcs)}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex justify-center">
                            {usageLoading[item.itemID] ? (
                              <Loader2Icon
                                className="h-3.5 w-3.5 animate-spin text-blue-500"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setMenu({
                                    itemID: item.itemID,
                                    x: rect.left,
                                    y: rect.bottom + 4,
                                  });
                                }}
                                className="min-w-[42px] rounded px-2 py-1 text-center text-[12px] font-semibold"
                                style={{
                                  backgroundColor: "#3B82F61A",
                                  color: "#1E3A8A",
                                }}
                              >
                                {item.isUpdateUsage
                                  ? soOldFormatQty(item.qtyUsage)
                                  : "?"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            value={qtyText[item.itemID] ?? ""}
                            onChange={(e) => onQtyChange(item, e.target.value)}
                            inputMode="decimal"
                            className="h-8 w-full rounded-md border bg-white px-2 text-center text-[12px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
                            style={{ borderColor: "#D1D5DB" }}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            value={remarkText[item.itemID] ?? ""}
                            onChange={(e) => onRemarkChange(item, e.target.value)}
                            placeholder="Catatan..."
                            className="h-8 w-full rounded-md border bg-white px-2 text-[12px] outline-none placeholder:text-gray-400 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                            style={{ borderColor: "#D1D5DB" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            aria-hidden
          />
          <div
            className="fixed z-50 w-36 overflow-hidden rounded-lg border bg-white shadow-xl"
            style={{
              left: Math.min(
                menu.x,
                (typeof window !== "undefined" ? window.innerWidth : 1024) - 160,
              ),
              top: Math.min(
                menu.y,
                (typeof window !== "undefined" ? window.innerHeight : 768) - 120,
              ),
              borderColor: BORDER,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const item = items.find((it) => it.itemID === menu.itemID);
                if (item) onInfoUsage(item);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium hover:bg-gray-50"
            >
              Info
            </button>
            <div className="mx-3 h-px" style={{ backgroundColor: BORDER }} />
            <button
              type="button"
              onClick={() => void onClearItem(menu.itemID)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
