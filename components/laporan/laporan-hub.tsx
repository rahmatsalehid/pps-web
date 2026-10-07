"use client";

import Link from "next/link";
import { useState } from "react";
import { LAPORAN_KATEGORI } from "@/components/laporan/laporan-catalog";

const BORDER = "#E2E6EA";

export function LaporanHub() {
  const [selected, setSelected] = useState(LAPORAN_KATEGORI[0].nama);
  const kategori =
    LAPORAN_KATEGORI.find((k) => k.nama === selected) ?? LAPORAN_KATEGORI[0];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8] p-3">
      <div className="mb-2.5">
        <h1 className="text-[16px] font-bold text-gray-800">Laporan</h1>
        <p className="text-[12px] text-gray-500">
          Daftar seluruh laporan produksi dan stok per kategori
        </p>
      </div>

      <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-relaxed text-blue-800">
        <span className="font-bold">Cara pakai: </span>
        Pilih kategori di sebelah kiri, lalu klik judul laporan untuk membuka
        filter dan menampilkan data.
      </div>

      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">Kategori</h2>
          </header>
          <div className="flex flex-col gap-1 p-2">
            {LAPORAN_KATEGORI.map((k) => {
              const active = k.nama === selected;
              return (
                <button
                  key={k.nama}
                  type="button"
                  onClick={() => setSelected(k.nama)}
                  className={`rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                    active
                      ? "text-white"
                      : "bg-[#F8F9FA] text-gray-800 hover:bg-gray-100"
                  }`}
                  style={active ? { background: "#2563EB" } : undefined}
                >
                  <span className="mr-1.5">{k.ikon}</span>
                  {k.nama}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="flex flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: BORDER }}
        >
          <header
            className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
            style={{ borderColor: BORDER }}
          >
            <h2 className="text-[14px] font-bold text-gray-800">
              {`LAPORAN - ${kategori.nama.toUpperCase()}`}
            </h2>
            <span className="text-[12px] font-semibold text-gray-500">
              {`${kategori.items.length} Laporan`}
            </span>
          </header>

          <div className="flex flex-col gap-2 p-3">
            {kategori.items.map((item) => {
              if (item.kode) {
                return (
                  <Link
                    key={item.title}
                    href={`/laporan/${item.kode}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#F8F9FA] px-3 py-3 text-[13px] font-semibold text-gray-800 hover:bg-gray-100"
                  >
                    <span>
                      <span className="mr-1.5">📄</span>
                      {item.title}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Tersedia
                    </span>
                  </Link>
                );
              }
              return (
                <div
                  key={item.title}
                  className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg bg-[#F8F9FA] px-3 py-3 text-[13px] font-semibold text-gray-400"
                  title="Laporan ini sedang disiapkan versi web-nya"
                >
                  <span>
                    <span className="mr-1.5">📄</span>
                    {item.title}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    Segera
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
