"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { getStockTotalsAction } from "@/app/(app)/operasional/stock/actions";
import {
  STOCK_PROSES_LIST,
  type StockProsesKey,
  type StockProsesMeta,
  type StockTotals,
} from "@/services/stock-proses-service";
import { Loader2Icon } from "@/components/dashboard/icons";
import { StockDetailDialog } from "./stock-detail-dialog";
import { stockAmountText, stockLabelCount } from "./stock-format";
import {
  StockAlertIcon,
  StockBlenderIcon,
  StockBoxIcon,
  StockChairIcon,
  StockGrainIcon,
  StockInventoryIcon,
  StockLaundryIcon,
  StockRecycleIcon,
  StockRefreshIcon,
  StockReportIcon,
  StockScatterIcon,
  StockSettingsIcon,
} from "./stock-icons";

type StockIconProps = { className?: string; style?: CSSProperties };

const STOCK_ICONS: Record<StockProsesKey, ComponentType<StockIconProps>> = {
  washing: StockLaundryIcon,
  broker: StockRecycleIcon,
  crusher: StockGrainIcon,
  bonggolan: StockScatterIcon,
  gilingan: StockSettingsIcon,
  mixer: StockBlenderIcon,
  furnitureWip: StockChairIcon,
  barangJadi: StockInventoryIcon,
  reject: StockReportIcon,
  bahanBaku: StockBoxIcon,
};

export function StockWorkspace() {
  const [totals, setTotals] = useState<StockTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [active, setActive] = useState<StockProsesMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getStockTotalsAction();
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setTotals(res.totals);
        setFailed(null);
      } else {
        setTotals(null);
        setFailed(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto bg-[#F3F5F8]">
      <div className="flex items-center justify-end gap-2 px-3 pt-3">
        {failed && (
          <span
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: "#B91C1C" }}
          >
            <StockAlertIcon style={{ width: 14, height: 14 }} />
            {failed}
          </span>
        )}
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E6EA] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
        >
          <StockRefreshIcon style={{ width: 13, height: 13 }} />
          Muat Ulang
        </button>
      </div>

      <div className="p-3 pt-2">
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}
        >
          {STOCK_PROSES_LIST.map((meta) => (
            <ProsesCard
              key={meta.key}
              meta={meta}
              loading={loading}
              total={totals?.[meta.key] ?? null}
              onClick={() => setActive(meta)}
            />
          ))}
        </div>
      </div>

      {active && <StockDetailDialog meta={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ProsesCard({
  meta,
  loading,
  total,
  onClick,
}: {
  meta: StockProsesMeta;
  loading: boolean;
  total: { labelSisa: number; amount: number; failed: boolean } | null;
  onClick: () => void;
}) {
  const Icon = STOCK_ICONS[meta.key];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[140px] flex-col rounded-xl border-[1.2px] bg-white p-2.5 text-left transition hover:shadow-md"
      style={{ borderColor: "#86EFAC" }}
    >
      <Icon style={{ width: 24, height: 24, color: "#0277BD" }} />
      <p
        className="mt-2 line-clamp-2 text-[11px] font-bold"
        style={{ color: "#1F2937" }}
      >
        {meta.label}
      </p>
      <div className="mt-auto">
        {loading && !total && (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin text-gray-400" />
        )}
        {!loading && (!total || total.failed) && (
          <p className="text-[10px] font-semibold" style={{ color: "#9CA3AF" }}>
            -
          </p>
        )}
        {total && !total.failed && (
          <>
            <p
              className="text-[10px] font-bold"
              style={{ color: "#059669" }}
            >
              {stockLabelCount(total.labelSisa)}
            </p>
            <p
              className="text-[10px] font-semibold"
              style={{ color: "#374151" }}
            >
              {stockAmountText(total.amount, meta.unit)}
            </p>
          </>
        )}
      </div>
    </button>
  );
}
