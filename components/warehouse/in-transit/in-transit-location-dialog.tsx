"use client";

import { useEffect, useState } from "react";
import {
  getInTransitLocationsAction,
  type InTransitLocation,
} from "@/app/(app)/warehouse/in-transit/actions";
import { Loader2Icon } from "@/components/dashboard/icons";
import { ItCloseIcon, ItPinIcon, ItSearchIcon } from "./in-transit-icons";

const BORDER = "#E2E6EA";

export function InTransitLocationDialog({
  idWarehouseTujuan,
  onSelect,
  onClose,
}: {
  idWarehouseTujuan: number;
  onSelect: (blok: string, idLokasi: number) => void;
  onClose: () => void;
}) {
  const [locations, setLocations] = useState<InTransitLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getInTransitLocationsAction(idWarehouseTujuan);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setLocations(res.locations);
        setError(null);
      } else {
        setLocations([]);
        setError(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idWarehouseTujuan, reloadKey]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? locations.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.blok.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      )
    : locations;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[620px] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Lokasi Penerimaan"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-[#1A1D23]">
              Pilih Lokasi Penerimaan
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Tekan satu kotak — label yang discan diletakkan di lokasi itu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <ItCloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <ItSearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              style={{ width: 16, height: 16 }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari blok / lokasi..."
              className="h-10 w-full rounded-xl border bg-[#F8F9FB] pl-9 pr-3 text-sm outline-none transition focus:border-[#1E6FD9]"
              style={{ borderColor: BORDER }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5 pt-4">
          {loading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-xs text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="text-xs font-bold text-[#1E6FD9] underline"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex h-40 items-center justify-center text-center text-xs text-gray-400">
              {locations.length === 0
                ? "Tidak ada lokasi untuk warehouse ini"
                : "Tidak ada lokasi yang cocok"}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
            >
              {filtered.map((loc) => (
                <button
                  key={`${loc.blok}-${loc.idLokasi}`}
                  type="button"
                  onClick={() => onSelect(loc.blok, loc.idLokasi)}
                  className="flex h-[74px] flex-col items-center justify-center gap-1 rounded-[10px] border bg-white px-2 transition hover:border-[#1E6FD9] hover:bg-[#E9F2FF]"
                  style={{ borderColor: BORDER }}
                  title={loc.description || loc.label}
                >
                  <ItPinIcon style={{ width: 15, height: 15, color: "#1E6FD9" }} />
                  <span className="text-[14.5px] font-extrabold text-[#1A1D23]">
                    {loc.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
