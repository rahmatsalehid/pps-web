"use client";

import type { SpkSummary } from "@/services/spk-barang-jadi-service";
import { SpkCheckCircleIcon, SpkWarningIcon } from "./spk-icons";

const BORDER = "#E2E6EA";
const MUTED = "#6B7280";

type SummaryCardDef = {
  key: string;
  label: string;
  statusValue: string;
  color: string;
};

const SUMMARY_CARDS: SummaryCardDef[] = [
  {
    key: "perluProduksi",
    label: "Perlu Produksi",
    statusValue: "PERLU PRODUKSI",
    color: "#1E6FD9",
  },
  {
    key: "stockHabis",
    label: "Stock Habis",
    statusValue: "STOCK HABIS",
    color: "#DC2626",
  },
  {
    key: "mendekatiMinimum",
    label: "Mendekati Minimum",
    statusValue: "MENDEKATI MINIMUM",
    color: "#B45309",
  },
  {
    key: "stockAman",
    label: "Stock Aman",
    statusValue: "STOCK AMAN",
    color: "#0A7349",
  },
];

export function SpkSummaryCards({
  summary,
  loading,
  activeStatus,
  onSelectStatus,
}: {
  summary: SpkSummary | null;
  loading: boolean;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {SUMMARY_CARDS.map((card) => {
        const value =
          summary != null
            ? (summary as unknown as Record<string, number>)[card.key] ?? 0
            : null;
        const active = activeStatus === card.statusValue;
        const dimmed = activeStatus !== "" && !active;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectStatus(active ? "" : card.statusValue)}
            className="rounded-xl bg-white p-4 text-left transition"
            style={{
              border: `1.4px solid ${active ? card.color : BORDER}`,
              boxShadow: active ? `0 0 0 3px ${card.color}22` : undefined,
              opacity: dimmed ? 0.55 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className="text-[10.5px] font-extrabold uppercase tracking-[0.4px]"
                style={{ color: MUTED }}
              >
                {card.label}
              </p>
              {card.key === "stockAman" ? (
                <SpkCheckCircleIcon
                  style={{ width: 16, height: 16, color: card.color }}
                />
              ) : card.key === "stockHabis" ? (
                <SpkWarningIcon
                  style={{ width: 16, height: 16, color: card.color }}
                />
              ) : null}
            </div>
            {loading && summary == null ? (
              <div
                className="mt-2 h-7 w-16 animate-pulse rounded"
                style={{ backgroundColor: "#EEF1F4" }}
              />
            ) : (
              <p
                className="mt-1 text-[26px] font-extrabold leading-none tracking-tight"
                style={{ color: card.color }}
              >
                {value ?? 0}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
