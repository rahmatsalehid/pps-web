"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSoAction,
  generateSoAction,
  getSoKategoriAction,
} from "@/app/(app)/operasional/stock-opname/actions";
import type { SoKategori, SoStatus } from "@/services/stock-opname-v2-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { SoGeneratePreviewDialog } from "./so-generate-preview-dialog";
import { SoPeriodPickerDialog } from "./so-period-picker-dialog";
import { SoConfirmDialog } from "./so-confirm-dialog";
import {
  SO_STATUS_META,
  soFormatDate,
  soMonthName,
} from "./so-format";
import {
  SoAlertIcon,
  SoBoltIcon,
  SoCalendarIcon,
  SoCloseIcon,
  SoHistoryIcon,
  SoTrashIcon,
} from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const GREEN = "#0A7349";
const WARNING = "#B45309";

type Period = { year: number; month: number };

export function SoKategoriWorkspace({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<SoKategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<Period | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  const [preview, setPreview] = useState<{
    categoryId: number;
    categoryName: string;
  } | null>(null);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SoKategori | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSoKategoriAction(
        riwayat ? { year: riwayat.year, month: riwayat.month } : {},
      );
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setItems(res.items);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, riwayat]);

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

  const openCard = useCallback(
    (kategori: SoKategori) => {
      if (kategori.status === "not_started") {
        if (riwayat) {
          showFlash("Tidak ada data stock opname pada periode ini");
          return;
        }
        setGenerateError(null);
        setPreview({
          categoryId: kategori.categoryId,
          categoryName: kategori.categoryName,
        });
        return;
      }
      if (!kategori.stockOpnameNo) return;
      router.push(
        `/operasional/stock-opname/${encodeURIComponent(kategori.stockOpnameNo)}`,
      );
    },
    [riwayat, router, showFlash],
  );

  const confirmGenerate = useCallback(async () => {
    if (!preview || generateBusy) return;
    setGenerateBusy(true);
    setGenerateError(null);
    const res = await generateSoAction(preview.categoryId);
    setGenerateBusy(false);
    if (!res.ok) {
      setGenerateError(res.error);
      return;
    }
    setPreview(null);
    router.push(
      `/operasional/stock-opname/${encodeURIComponent(res.result.stockOpnameNo)}`,
    );
  }, [preview, generateBusy, router]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteBusy) return;
    const no = deleteTarget.stockOpnameNo;
    if (!no) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await deleteSoAction(no);
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(res.error);
      return;
    }
    setDeleteTarget(null);
    showFlash(`${no} berhasil dihapus`);
    refresh();
  }, [deleteTarget, deleteBusy, refresh, showFlash]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F3F5F8]">
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <div
          className="flex items-center gap-3.5 rounded-full border bg-white px-3.5 py-2 shadow-sm"
          style={{ borderColor: BORDER }}
        >
          {(Object.keys(SO_STATUS_META) as SoStatus[]).map((status, i) => (
            <span
              key={status}
              className={`flex items-center gap-1.5 ${i > 0 ? "pl-0" : ""}`}
            >
              <StatusDot color={SO_STATUS_META[status].color} />
              <span className="text-[11px] font-semibold text-[#767E8C]">
                {SO_STATUS_META[status].label}
              </span>
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          style={{ borderColor: BORDER }}
        >
          Muat Ulang
        </button>

        <div
          className="flex items-center rounded-full border shadow-sm"
          style={{
            borderColor: riwayat ? "#FCD9A8" : BORDER,
            backgroundColor: riwayat ? "#FFF7ED" : "#FFFFFF",
          }}
        >
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="flex items-center gap-1.5 rounded-l-full px-3 py-1.5"
            style={{ color: riwayat ? WARNING : PRIMARY }}
          >
            {riwayat ? (
              <SoHistoryIcon style={{ width: 15, height: 15 }} />
            ) : (
              <SoCalendarIcon style={{ width: 15, height: 15 }} />
            )}
            <span className="text-xs font-bold">
              {riwayat
                ? `${soMonthName(riwayat.month)} ${riwayat.year}`
                : "Riwayat"}
            </span>
          </button>
          {riwayat && (
            <button
              type="button"
              onClick={() => setRiwayat(null)}
              className="rounded-r-full px-2.5 py-1.5"
              style={{ color: WARNING }}
              aria-label="Hapus filter riwayat"
            >
              <SoCloseIcon style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>

      {flash && (
        <div className="shrink-0 border-b border-green-200 bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-700">
          {flash}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading && items.length === 0 && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2Icon className="h-5 w-5 animate-spin" />
            Memuat kategori...
          </div>
        )}
        {!loading && error && items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <SoAlertIcon
              className="text-red-300"
              style={{ width: 40, height: 40 }}
            />
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              style={{ borderColor: BORDER }}
            >
              Coba Lagi
            </button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Belum ada kategori
          </div>
        )}
        {items.length > 0 && (
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(176px,1fr))]">
            {items.map((kategori) => (
              <KategoriCard
                key={kategori.categoryId}
                kategori={kategori}
                dimmed={!!riwayat && !kategori.stockOpnameNo}
                canDelete={canManage && !riwayat && !!kategori.stockOpnameNo}
                onClick={() => openCard(kategori)}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleteTarget(kategori);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {periodOpen && (
        <SoPeriodPickerDialog
          initialYear={riwayat?.year ?? new Date().getFullYear()}
          initialMonth={riwayat?.month ?? new Date().getMonth() + 1}
          onPick={(period) => {
            setPeriodOpen(false);
            setRiwayat(period);
          }}
          onClose={() => setPeriodOpen(false)}
        />
      )}

      {preview && (
        <SoGeneratePreviewDialog
          categoryId={preview.categoryId}
          categoryName={preview.categoryName}
          busy={generateBusy}
          error={generateError}
          onConfirm={() => void confirmGenerate()}
          onClose={() => setPreview(null)}
        />
      )}

      {deleteTarget && (
        <SoConfirmDialog
          title="Hapus Stock Opname"
          message={`Yakin ingin menghapus stock opname ${deleteTarget.stockOpnameNo} ("${deleteTarget.categoryName}")? Semua data hasil scan yang sudah tercatat akan ikut terhapus dan tidak dapat dikembalikan.`}
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

function KategoriCard({
  kategori,
  dimmed,
  canDelete,
  onClick,
  onDelete,
}: {
  kategori: SoKategori;
  dimmed: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const percent =
    kategori.labelCount > 0
      ? Math.round((kategori.scannedCount / kategori.labelCount) * 100)
      : 0;
  const complete =
    kategori.labelCount > 0 && kategori.scannedCount >= kategori.labelCount;
  const progressColor = complete ? GREEN : PRIMARY;
  const startLabel = soFormatDate(kategori.startDate);
  const completedLabel = soFormatDate(kategori.completedAt);
  const workingLocations =
    kategori.status === "in_progress" && kategori.workingLocations.length > 0
      ? kategori.workingLocations
      : [];
  const workingTooltip = workingLocations
    .map((l) => {
      const users = l.users
        .map((u) => u.fullName || u.username)
        .join(", ");
      return users ? `${l.lokasi} \u00b7 ${users}` : l.lokasi;
    })
    .join("\n");

  return (
    <div
      className={`group relative flex cursor-pointer flex-col rounded-[10px] border bg-white p-2.5 shadow-sm transition hover:shadow-md ${
        dimmed ? "opacity-55" : ""
      }`}
      style={{ borderColor: BORDER }}
      onClick={onClick}
    >
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          aria-label={`Hapus ${kategori.stockOpnameNo}`}
          title="Hapus stock opname"
        >
          <SoTrashIcon style={{ width: 14, height: 14 }} />
        </button>
      )}

      <div className="flex items-start gap-1.5">
        <p
          className="min-w-0 flex-1 truncate text-[12.5px] font-bold leading-tight text-[#1A1D23]"
          title={kategori.categoryName}
        >
          {kategori.categoryName}
        </p>
        <StatusDot color={SO_STATUS_META[kategori.status].color} />
      </div>

      <p className="mt-0.5 truncate text-[10.5px] text-[#767E8C]">
        {kategori.stockOpnameNo ?? "Belum ada nomor SO"}
      </p>

      {startLabel && (
        <div className="mt-1 space-y-0.5">
          <DateInfo label="Mulai" value={startLabel} color="#767E8C" />
          <DateInfo
            label="Selesai"
            value={completedLabel ?? "-"}
            color={completedLabel ? GREEN : "#767E8C"}
          />
        </div>
      )}

      {workingLocations.length > 0 && (
        <div
          className="mt-1 flex items-center gap-1"
          title={workingTooltip}
        >
          <SoBoltIcon
            className="shrink-0"
            style={{ width: 11, height: 11, color: GREEN }}
          />
          <span className="min-w-0 truncate text-[9.5px] font-bold" style={{ color: GREEN }}>
            {workingLocations.map((l) => l.lokasi).join(", ")}
          </span>
        </div>
      )}

      <div className="mt-auto pt-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-medium text-[#767E8C]">
            {kategori.scannedCount}/{kategori.labelCount} label
          </span>
          <span
            className="text-xs font-extrabold"
            style={{ color: progressColor }}
          >
            {percent}%
          </span>
        </div>
        <div
          className="mt-1 h-[5px] w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "#F1F2F4" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, percent))}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
      style={{ backgroundColor: `${color}26` }}
    >
      <span
        className="h-[7px] w-[7px] rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function DateInfo({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <p className="truncate text-[9.5px] leading-tight">
      <span className="font-medium" style={{ color, opacity: 0.75 }}>
        {label}&nbsp;&nbsp;
      </span>
      <span className="font-bold" style={{ color }}>
        {value}
      </span>
    </p>
  );
}
