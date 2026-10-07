"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSoOldByNoAction,
  getSoOldLokasiAction,
} from "@/app/(app)/operasional/stock-opname-old/actions";
import type { SoOldLokasi, SoOldRow } from "@/services/stock-opname-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { SoAlertIcon, SoSearchIcon } from "../stock-opname/so-icons";
import {
  SO_OLD_FILTER_OPTIONS,
  soOldFormatTanggal,
} from "./so-old-format";
import {
  SoOldLabelPanel,
  type SoOldLabelStats,
} from "./so-old-label-panel";
import { SoOldSummaryDialog } from "./so-old-summary-dialog";
import { SoOldAscendWorkspace } from "./so-old-ascend-workspace";

const BORDER = "#E2E6EA";

export function SoOldDetailWorkspace({ noSO }: { noSO: string }) {
  const router = useRouter();
  const [row, setRow] = useState<SoOldRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metaKey, setMetaKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSoOldByNoAction(noSO);
      if (cancelled) return;
      setLoading(false);
      if (res.ok && res.row) {
        setRow(res.row);
        setError(null);
      } else if (res.ok) {
        setRow(null);
        setError("Stock Opname tidak ditemukan");
      } else {
        setRow(null);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noSO, metaKey]);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center gap-2 bg-[#F3F5F8] text-sm text-gray-500">
        <Loader2Icon className="h-5 w-5 animate-spin" />
        Memuat data stock opname…
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#F3F5F8] px-6 text-center">
        <SoAlertIcon className="text-red-300" style={{ width: 44, height: 44 }} />
        <p className="text-sm font-semibold text-red-700">
          {error ?? "Stock Opname tidak ditemukan"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMetaKey((k) => k + 1)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: BORDER }}
          >
            Coba Lagi
          </button>
          <button
            type="button"
            onClick={() => router.push("/operasional/stock-opname-old")}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  if (row.isAscend) {
    return (
      <SoOldAscendWorkspace
        noSO={row.noSO}
        tgl={row.tanggal}
        idWarehouses={row.idWarehouses}
      />
    );
  }

  return <PpsDetail noSO={row.noSO} tgl={row.tanggal} />;
}

function PpsDetail({ noSO, tgl }: { noSO: string; tgl: string }) {
  const [filterBy, setFilterBy] = useState("all");
  const [lokasiList, setLokasiList] = useState<SoOldLokasi[]>([]);
  const [selectedLokasi, setSelectedLokasi] = useState("");
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState<{
    acuan: SoOldLabelStats | null;
    hasil: SoOldLabelStats | null;
  }>({ acuan: null, hasil: null });
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(search.trim()), 500);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getSoOldLokasiAction();
      if (!cancelled && res.ok) setLokasiList(res.items);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 5000);
  }, []);

  const handleStats = useCallback(
    (variant: "acuan" | "hasil", s: SoOldLabelStats) => {
      setStats((prev) => ({ ...prev, [variant]: s }));
    },
    [],
  );

  const handleDeleted = useCallback(
    (nomorLabel: string) => {
      showFlash(`Label ${nomorLabel} berhasil dihapus`);
      setReloadKey((k) => k + 1);
    },
    [showFlash],
  );

  const blok = selectedLokasi ? selectedLokasi.split("|")[0] : null;
  const idLokasiRaw = selectedLokasi ? selectedLokasi.split("|")[1] : "";
  const idLokasi = idLokasiRaw ? parseInt(idLokasiRaw, 10) : null;

  const summaryReady = stats.acuan && stats.hasil;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 items-center gap-2.5 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div className="w-[190px] shrink-0">
          <p className="truncate text-[13px] font-bold text-[#1A1D23]">{noSO}</p>
          <p className="truncate text-xs text-[#4A5568]">
            {soOldFormatTanggal(tgl)}
          </p>
        </div>

        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className="h-10 w-[180px] shrink-0 rounded-lg border bg-[#F8F9FB] px-3 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
          style={{ borderColor: "#DCDFE4" }}
          aria-label="Kategori"
        >
          {SO_OLD_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={selectedLokasi}
          onChange={(e) => setSelectedLokasi(e.target.value)}
          className="h-10 w-[200px] shrink-0 rounded-lg border bg-[#F8F9FB] px-3 text-[13px] outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
          style={{ borderColor: "#DCDFE4" }}
          aria-label="Lokasi"
        >
          <option value="">Semua Lokasi</option>
          {lokasiList.map((l) => {
            const value = `${l.blok}|${l.idLokasi}`;
            const label =
              l.blok && l.idLokasi ? `${l.blok}${l.idLokasi}` : l.blok || String(l.idLokasi);
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>

        <div className="relative min-w-0 flex-1">
          <SoSearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari label..."
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
          onClick={() => setSummaryOpen(true)}
          disabled={!summaryReady}
          title="Lihat Ringkasan"
          className="h-10 shrink-0 rounded-lg border px-3.5 text-xs font-bold text-[#1E6FD9] hover:bg-blue-50 disabled:opacity-50"
          style={{ borderColor: "#C5CEE0" }}
        >
          Ringkasan
        </button>

        <button
          type="button"
          onClick={() => {
            setStats({ acuan: null, hasil: null });
            setReloadKey((k) => k + 1);
          }}
          className="h-10 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
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

      <div className="flex min-h-0 flex-1">
        <SoOldLabelPanel
          noSO={noSO}
          variant="acuan"
          title="DATA STOCK"
          color="#F59E0B"
          filterBy={filterBy}
          blok={blok}
          idLokasi={idLokasi}
          search={searchQ}
          reloadKey={reloadKey}
          onStats={handleStats}
          onDeleted={handleDeleted}
        />
        <div className="w-px shrink-0" style={{ backgroundColor: BORDER }} />
        <SoOldLabelPanel
          noSO={noSO}
          variant="hasil"
          title="HASIL SCAN"
          color="#0A7349"
          filterBy={filterBy}
          blok={blok}
          idLokasi={idLokasi}
          search={searchQ}
          reloadKey={reloadKey}
          onStats={handleStats}
          onDeleted={handleDeleted}
        />
      </div>

      {summaryOpen && summaryReady && stats.acuan && stats.hasil && (
        <SoOldSummaryDialog
          noSO={noSO}
          tgl={soOldFormatTanggal(tgl)}
          category={
            SO_OLD_FILTER_OPTIONS.find((o) => o.value === filterBy)?.label ??
            "Semua"
          }
          blok={blok}
          idLokasi={idLokasi}
          stock={stats.acuan}
          scan={{
            totalData: stats.hasil.totalData,
            totalSak: stats.hasil.totalSak,
            totalBerat: stats.hasil.totalBerat,
          }}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}
