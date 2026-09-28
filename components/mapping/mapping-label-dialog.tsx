"use client";

import { useEffect, useState } from "react";
import type {
  MappingLabelResult,
  MappingLokasi,
} from "@/services/mapping-service";
import { getMappingLabelsAction } from "@/app/(app)/mapping/actions";
import { MappingLabelChart } from "./mapping-label-chart";
import { MappingLabelHistoryDialog } from "./mapping-label-history-dialog";
import { MapBarChartIcon, MapCloseIcon, MapInfoIcon, MapListIcon, MapChevronRightIcon } from "./mapping-icons";

function formatValue(berat: number | null, qty: number, uom: string): string {
  if (uom.toUpperCase() === "KG") {
    const b = berat ?? 0;
    return `${Number.isInteger(b) ? b : b.toFixed(1)} kg`;
  }
  return `${qty} ${uom}`;
}

export function MappingLabelDialog({
  blok,
  lokasi,
  onClose,
}: {
  blok: string;
  lokasi: MappingLokasi;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MappingLabelResult | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showJenis, setShowJenis] = useState(false);
  const [historyCode, setHistoryCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMappingLabelsAction(blok, lokasi.idLokasi);
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
  }, [blok, lokasi.idLokasi]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[75vh] w-[520px] max-w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center gap-1 bg-[#1E6FD9] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-white">
              {lokasi.label}
            </p>
            {lokasi.jenisList.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-semibold text-white">
                  {lokasi.jenisList.length} jenis
                </span>
                <button
                  type="button"
                  title="Jenis di lokasi ini"
                  onClick={() => setShowJenis(true)}
                  className="text-white/70 hover:text-white"
                >
                  <MapInfoIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {result && (
            <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] font-semibold text-white">
              {result.totalData} label
            </span>
          )}
          {result && result.data.length > 0 && (
            <button
              type="button"
              title={showChart ? "Daftar Label" : "Statistik"}
              onClick={() => setShowChart((v) => !v)}
              className="p-1.5 text-white hover:text-white/80"
            >
              {showChart ? (
                <MapListIcon className="h-5 w-5" />
              ) : (
                <MapBarChartIcon className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white"
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
          ) : !result || result.data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Tidak ada label di lokasi ini
            </div>
          ) : showChart ? (
            <MappingLabelChart result={result} />
          ) : (
            <div className="h-full overflow-y-auto p-3">
              <div className="flex flex-col gap-2">
                {result.data.map((item) => (
                  <button
                    key={item.labelCode}
                    type="button"
                    onClick={() => setHistoryCode(item.labelCode)}
                    className="flex items-stretch rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-[#1E6FD9]"
                  >
                    <span className="flex w-[84px] shrink-0 items-center justify-center text-center text-[11px] text-gray-500">
                      {item.dateCreate}
                    </span>
                    <span className="mx-2.5 min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[13px] font-bold text-[#1E6FD9]">
                        {item.namaJenis}
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-black/80">
                        {item.labelCode}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                      <span className="rounded-lg bg-[#1E6FD9]/10 px-2 py-1 text-xs font-bold text-[#1E6FD9]">
                        {formatValue(item.berat, item.qty, item.uom)}
                      </span>
                      <MapChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showJenis && (
        <JenisListPopup
          jenisList={lokasi.jenisList}
          onClose={() => setShowJenis(false)}
        />
      )}

      {historyCode && (
        <MappingLabelHistoryDialog
          labelCode={historyCode}
          onClose={() => setHistoryCode(null)}
        />
      )}
    </div>
  );
}

function JenisListPopup({
  jenisList,
  onClose,
}: {
  jenisList: { namaJenis: string }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[420px] w-[360px] max-w-full flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center bg-[#1E6FD9] px-4 py-3">
          <p className="flex-1 text-[15px] font-extrabold text-white">
            Jenis di Lokasi Ini
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white"
          >
            <MapCloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto p-3">
          {jenisList.map((jenis, i) => (
            <div
              key={`${jenis.namaJenis}-${i}`}
              className="rounded-lg bg-[#1E6FD9]/[0.06] px-3 py-2.5 text-[13px] font-semibold text-black/80"
            >
              {jenis.namaJenis}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
