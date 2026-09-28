"use client";

import type { ReactNode } from "react";
import type { MappingLabelResult } from "@/services/mapping-service";
import {
  MapInventoryIcon,
  MapLabelIcon,
  MapListIcon,
} from "./mapping-icons";

const CHART_COLORS = [
  "#1565C0",
  "#00897B",
  "#E65100",
  "#6A1B9A",
  "#2E7D32",
  "#C62828",
  "#00838F",
  "#F9A825",
  "#4527A0",
  "#558B2F",
];

export function MappingLabelChart({ result }: { result: MappingLabelResult }) {
  const data = result.data;

  const byKategori = new Map<string, typeof data>();
  for (const item of data) {
    const list = byKategori.get(item.kategori) ?? [];
    list.push(item);
    byKategori.set(item.kategori, list);
  }

  const totalJenis = new Set(data.map((item) => item.namaJenis)).size;
  const kategoriList = [...byKategori.keys()];
  const totalLabels = data.length;

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-4">
      <div className="flex gap-2.5">
        <KpiCard
          icon={<MapInventoryIcon className="h-5 w-5" />}
          label="Total Label"
          value={String(totalLabels)}
          color="#1565C0"
        />
        <KpiCard
          icon={<MapLabelIcon className="h-5 w-5" />}
          label="Kategori"
          value={String(kategoriList.length)}
          color="#00897B"
        />
        <KpiCard
          icon={<MapListIcon className="h-5 w-5" />}
          label="Jenis"
          value={String(totalJenis)}
          color="#6A1B9A"
        />
      </div>

      <div className="mt-5 rounded-[20px] bg-white p-[18px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-bold text-[#1565C0]">Distribusi Kategori</p>
        <div className="mt-4 flex h-[180px] items-center gap-5">
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="relative">
              <div
                className="h-[150px] w-[150px] rounded-full"
                style={{
                  background: donutGradient(byKategori, kategoriList, totalLabels),
                }}
              />
              <div className="absolute left-1/2 top-1/2 flex h-[127px] w-[127px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-extrabold leading-none text-[#1565C0]">
                  {totalLabels}
                </span>
                <span className="text-[11px] text-gray-500">label</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            {kategoriList.map((kat, i) => {
              const count = byKategori.get(kat)?.length ?? 0;
              return (
                <div key={kat} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {kat}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {count}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    ({Math.round((count / totalLabels) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm font-bold text-[#1565C0]">Detail per Kategori</p>
      <div className="mt-2.5 flex flex-col gap-3">
        {kategoriList.map((kat, i) => (
          <CategoryCard
            key={kat}
            kategori={kat}
            items={byKategori.get(kat) ?? []}
            accent={CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}

function donutGradient(
  byKategori: Map<string, MappingLabelResult["data"]>,
  kategoriList: string[],
  total: number,
): string {
  if (total === 0) return "#E5E7EB";
  let acc = 0;
  const stops = kategoriList.map((kat, i) => {
    const count = byKategori.get(kat)?.length ?? 0;
    const start = (acc / total) * 100;
    acc += count;
    const end = (acc / total) * 100;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[20px] bg-white p-3.5"
      style={{ boxShadow: `0 4px 16px ${color}1F` }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}1A`, color }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[22px] font-extrabold leading-none"
          style={{ color }}
        >
          {value}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium text-gray-500">
          {label}
        </span>
      </span>
    </div>
  );
}

function CategoryCard({
  kategori,
  items,
  accent,
}: {
  kategori: string;
  items: MappingLabelResult["data"];
  accent: string;
}) {
  const useBerat = (items[0]?.uom ?? "").toUpperCase() !== "PCS";
  const uom = useBerat ? "kg" : "pcs";

  const byJenis = new Map<string, number>();
  for (const item of items) {
    const val = useBerat ? (item.berat ?? 0) : item.qty;
    byJenis.set(item.namaJenis, (byJenis.get(item.namaJenis) ?? 0) + val);
  }
  const sorted = [...byJenis.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, e) => s + e[1], 0);
  const totalStr = useBerat ? `${total.toFixed(1)} ${uom}` : `${total} ${uom}`;

  return (
    <div className="rounded-[20px] bg-white p-[18px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2.5">
        <span
          className="h-[18px] w-1 shrink-0 rounded-sm"
          style={{ background: accent }}
        />
        <span
          className="min-w-0 flex-1 truncate text-[15px] font-bold"
          style={{ color: accent }}
        >
          {kategori}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${accent}14`, color: accent }}
        >
          {totalStr}
        </span>
        <span className="rounded-full bg-gray-500/10 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
          {sorted.length} jenis
        </span>
      </div>

      <div className="my-3.5 border-t border-gray-100" />

      <div className="flex flex-col gap-3">
        {sorted.map(([namaJenis, value], i) => {
          const pct = total > 0 ? value / total : 0;
          const pctStr = `${(pct * 100).toFixed(1)}%`;
          const valStr = useBerat ? `${value.toFixed(1)} ${uom}` : `${value} ${uom}`;
          return (
            <div key={namaJenis}>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                  style={
                    i <= 2
                      ? { background: `${accent}1F`, color: accent }
                      : { background: "#F3F4F6", color: "#6B7280" }
                  }
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {namaJenis}
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  {valStr}
                </span>
                <span
                  className="w-11 text-right text-xs font-bold"
                  style={{ color: accent }}
                >
                  {pctStr}
                </span>
              </div>
              <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct * 100}%`, background: `${accent}BF` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
