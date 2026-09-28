import type { ProductionStatus } from "./dummy-data";

const STATUS_STYLES: Record<ProductionStatus, string> = {
  Completed: "bg-green-50 text-green-700",
  Processing: "bg-orange-50 text-orange-700",
};

export function StatusBadge({ status }: { status: ProductionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
