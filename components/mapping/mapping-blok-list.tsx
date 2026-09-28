"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MappingBlok } from "@/services/mapping-service";
import { getMappingBlokAction } from "@/app/(app)/mapping/actions";
import { MapErrorIcon } from "./mapping-icons";

export function MappingBlokList() {
  const router = useRouter();
  const [bloks, setBloks] = useState<MappingBlok[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getMappingBlokAction();
    if (res.ok) {
      setBloks(res.bloks);
    } else {
      setBloks([]);
      setError(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMappingBlokAction();
      if (cancelled) return;
      if (res.ok) {
        setBloks(res.bloks);
        setError(null);
      } else {
        setBloks([]);
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
        <MapErrorIcon className="h-10 w-10 text-red-500" />
        <p className="mt-3 text-sm text-gray-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (bloks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Tidak ada data blok
      </div>
    );
  }

  const groups = new Map<string, MappingBlok[]>();
  for (const blok of bloks) {
    const list = groups.get(blok.namaWarehouse) ?? [];
    list.push(blok);
    groups.set(blok.namaWarehouse, list);
  }

  return (
    <div className="bg-[#F8F9FB]">
      <div className="flex items-center gap-2 border-b border-[#E2E6EA] bg-white px-4 pb-2.5 pt-3">
        <span className="h-4 w-[3px] rounded-sm bg-[#1E6FD9]" />
        <span className="text-[13px] font-bold text-[#1E6FD9]">
          Pilih Blok Warehouse
        </span>
        <span className="text-[11px] text-gray-400">{bloks.length} blok</span>
      </div>

      <div className="p-4">
        {[...groups.entries()].map(([warehouse, list]) => (
          <div key={warehouse} className="mb-4">
            <p className="text-xs font-bold text-[#1F2937]">{warehouse}</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {list.map((blok) => (
                <button
                  key={blok.blok}
                  type="button"
                  onClick={() =>
                    router.push(`/mapping/${encodeURIComponent(blok.blok)}`)
                  }
                  className="flex h-[88px] w-20 flex-col items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white shadow-sm transition hover:border-[#1E6FD9] hover:shadow"
                >
                  <span className="text-sm font-extrabold leading-none text-[#1E6FD9]">
                    {blok.blok}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      blok.totalLokasi > 0
                        ? "bg-[#1E6FD9]/10 text-[#1E6FD9]"
                        : "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {blok.totalLokasi} lokasi
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      blok.totalJenis > 0
                        ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                        : "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {blok.totalJenis} jenis
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
