"use client";

import { useEffect, useState } from "react";
import type { MappingLabelHistoryResult } from "@/services/mapping-service";
import { getMappingLabelHistoryAction } from "@/app/(app)/mapping/actions";
import {
  MapClockIcon,
  MapCloseIcon,
  MapPersonIcon,
} from "./mapping-icons";

function lokasiLabel(blok: string, idLokasi: number | null): string {
  return `${blok}${idLokasi ?? ""}`;
}

export function MappingLabelHistoryDialog({
  labelCode,
  onClose,
}: {
  labelCode: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MappingLabelHistoryResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMappingLabelHistoryAction(labelCode);
      if (cancelled) return;
      if (res.ok) {
        setResult(res.result);
        setError(null);
      } else {
        setResult(null);
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [labelCode]);

  const history = result?.history ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[70vh] w-[480px] max-w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center gap-2 bg-[#1E6FD9] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-white">
              Riwayat Perpindahan Lokasi
            </p>
            <p className="truncate text-[13px] font-semibold text-white">
              {labelCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white"
          >
            <MapCloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-700">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Belum ada riwayat perpindahan lokasi
            </div>
          ) : (
            <div className="overflow-y-auto px-4 pb-1 pt-4">
              <HistoryNode
                lokasi={lokasiLabel(history[0].beforeBlok, history[0].beforeIdLokasi)}
                caption="Lokasi Awal"
                isFirst
                isLast={false}
              />
              {history.map((item, i) => (
                <HistoryNode
                  key={`${item.eventTime ?? ""}-${i}`}
                  lokasi={lokasiLabel(item.afterBlok, item.afterIdLokasi)}
                  caption={item.eventTime ?? "-"}
                  actor={item.actorUsername}
                  isFirst={false}
                  isLast={i === history.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryNode({
  lokasi,
  caption,
  actor,
  isFirst,
  isLast,
}: {
  lokasi: string;
  caption: string;
  actor?: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-stretch">
      <div className="flex w-6 flex-col items-center">
        <span
          className="w-0.5 h-1.5"
          style={{
            background: isFirst ? "transparent" : "#D1D5DB",
          }}
        />
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            background: isFirst ? "#FFFFFF" : "#1E6FD9",
            border: isFirst ? "2px solid #1E6FD9" : "none",
          }}
        />
        <span
          className="w-0.5 flex-1"
          style={{ background: isLast ? "transparent" : "#D1D5DB" }}
        />
      </div>
      <div className="ml-2.5 flex-1 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <MapClockIcon className="h-3 w-3" />
          <span>{caption}</span>
          {actor && actor.length > 0 && (
            <>
              <span className="ml-2 flex items-center gap-0.5">
                <MapPersonIcon className="h-3 w-3" />
                <span>{actor}</span>
              </span>
            </>
          )}
        </div>
        <div className="mt-1.5 rounded-lg bg-[#1E6FD9]/[0.06] px-3 py-2 text-sm font-bold text-[#1E6FD9]">
          {lokasi}
        </div>
      </div>
    </div>
  );
}
