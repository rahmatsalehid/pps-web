"use client";

import { useEffect, useState } from "react";
import { previewSoGenerateAction } from "@/app/(app)/operasional/stock-opname/actions";
import type { SoGeneratePreview } from "@/services/stock-opname-v2-service";
import { Loader2Icon, X } from "@/components/dashboard/icons";
import { soFormatDate, soFormatQty, soWeightUnit } from "./so-format";
import { SoAlertIcon, SoPlaylistCheckIcon } from "./so-icons";

const PRIMARY = "#1E6FD9";
const BORDER = "#E2E6EA";
const MUTED = "#6B7280";
const INK = "#1A1D23";

export function SoGeneratePreviewDialog({
  categoryId,
  categoryName,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  categoryId: number;
  categoryName: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SoGeneratePreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await previewSoGenerateAction(categoryId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setPreview(res.preview);
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const unit = soWeightUnit(preview?.categoryCode ?? "");
  const qtyLabel = unit === "pcs" ? "PCS" : "BERAT";
  const dateLabel = preview?.date ? soFormatDate(preview.date) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-start gap-3 px-5 py-4"
          style={{
            backgroundColor: "#F8F9FB",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold tracking-tight text-[#1A1D23]">
              Generate Stock Opname
            </p>
            <p className="mt-0.5 truncate text-xs text-[#6B7280]">
              {preview?.hasDateFilter && dateLabel
                ? `${preview.categoryName} \u00b7 per ${dateLabel}`
                : preview?.categoryName ?? categoryName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-[#8A94A6] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Memuat preview...
            </div>
          )}
          {!loading && loadError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-[13px] font-semibold text-red-700">
              <SoAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
          {!loading && !loadError && preview && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <StatTile label="TOTAL LABEL" value={String(preview.labelCount)} />
                <StatTile
                  label={qtyLabel}
                  value={soFormatQty(preview.totalWeight)}
                />
              </div>
              {preview.perJenis.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-extrabold tracking-[0.4px] text-[#6B7280]">
                    PER JENIS
                  </p>
                  <div
                    className="mt-1.5 overflow-hidden rounded-md border"
                    style={{ borderColor: BORDER }}
                  >
                    <div
                      className="flex bg-[#FAFAFA] px-2.5 py-2"
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <span className="flex-[3] text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                        Jenis
                      </span>
                      <span className="flex-[2] text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                        Label
                      </span>
                      <span className="flex-[2] text-right text-[9.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
                        Qty
                      </span>
                    </div>
                    {preview.perJenis.map((jenis, i) => (
                      <div
                        key={jenis.typeId}
                        className="flex items-center px-2.5 py-2"
                        style={
                          i > 0
                            ? { borderTop: "1px solid #F3F4F6" }
                            : undefined
                        }
                      >
                        <span
                          className="min-w-0 flex-[3] truncate text-xs font-semibold"
                          style={{ color: INK }}
                        >
                          {jenis.typeName}
                        </span>
                        <span
                          className="flex-[2] text-right text-[11.5px] font-bold"
                          style={{ color: INK }}
                        >
                          {jenis.labelCount}
                        </span>
                        <span
                          className="flex-[2] text-right text-[11.5px]"
                          style={{ color: INK }}
                        >
                          {soFormatQty(jenis.totalWeight)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div
          className="flex gap-2.5 border-t px-5 py-4"
          style={{ borderColor: BORDER }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-md border px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || loading || !preview}
            className="flex flex-[2] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}
          >
            {busy ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <SoPlaylistCheckIcon className="h-4 w-4" />
            )}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-w-0 flex-1 rounded-md border px-2.5 py-2"
      style={{ borderColor: BORDER, backgroundColor: "#F8F9FB" }}
    >
      <p className="text-[8.5px] font-bold uppercase tracking-[0.3px] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-extrabold text-[#1A1D23]">
        {value}
      </p>
    </div>
  );
}
