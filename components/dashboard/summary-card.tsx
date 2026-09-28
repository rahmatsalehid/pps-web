import type { ComponentType } from "react";

export function SummaryCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-5">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p
          className={`mt-1 text-2xl font-semibold ${
            highlight ? "text-blue-600" : "text-gray-800"
          }`}
        >
          {value}
        </p>
      </div>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          highlight ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
}
