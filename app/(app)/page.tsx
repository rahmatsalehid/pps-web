import type { Metadata } from "next";
import { ProductionTable } from "@/components/dashboard/production-table";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { SUMMARY_CARDS } from "@/components/dashboard/dummy-data";

export const metadata: Metadata = {
  title: "Plastic Production System",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <ProductionTable />
    </div>
  );
}
