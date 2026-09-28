import type { StampingMesinInfo } from "@/services/stamping-service";

const STATUS_STYLES: Record<string, { border: string; dot: string }> = {
  active: { border: "border-green-400", dot: "bg-green-500" },
  pending: { border: "border-amber-400", dot: "bg-amber-500" },
  inactive: { border: "border-red-300", dot: "bg-red-400" },
};

export function MesinCard({
  mesin,
  onClick,
}: {
  mesin: StampingMesinInfo;
  onClick?: () => void;
}) {
  const hasProduction = Boolean(mesin.noProduksi);
  const style = STATUS_STYLES[mesin.machineStatus] ?? STATUS_STYLES.inactive;

  let shiftTimeText: string | null = null;
  if (hasProduction) {
    const parts: string[] = [];
    if (mesin.shift != null) parts.push(`Shift ${mesin.shift}`);
    parts.push(`${mesin.hourStart ?? "--:--"} – ${mesin.hourEnd ?? "--:--"}`);
    shiftTimeText = parts.join("  |  ");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[110px] flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md ${style.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-800">
          {mesin.namaMesin}
        </span>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      </div>
      <div className="mt-2 border-t border-gray-100 pt-2">
        {hasProduction ? (
          <div className="space-y-1">
            {shiftTimeText && (
              <p className="text-[11px] font-semibold text-gray-800">{shiftTimeText}</p>
            )}
            {mesin.namaRegu && (
              <p className="truncate text-[10px] text-gray-500">Regu: {mesin.namaRegu}</p>
            )}
            {mesin.outputJenisNama && (
              <p className="truncate text-[10px] text-gray-500">{mesin.outputJenisNama}</p>
            )}
          </div>
        ) : (
          <p className="text-[11px] italic text-red-400">Belum aktif</p>
        )}
      </div>
    </button>
  );
}

export function MesinSectionHeader({
  title,
  activeCount,
  pendingCount,
  inactiveCount,
  isLoading,
}: {
  title: string;
  activeCount: number;
  pendingCount: number;
  inactiveCount: number;
  isLoading?: boolean;
}) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-gray-200 bg-white px-4">
      <h2 className="text-[13px] font-bold text-gray-800">{title}</h2>
      {!isLoading && (
        <div className="flex items-center gap-2">
          <StatBadge label="Aktif" count={activeCount} className="bg-blue-50 text-blue-600" />
          {pendingCount > 0 && (
            <StatBadge label="Pending" count={pendingCount} className="bg-amber-50 text-amber-700" />
          )}
          <StatBadge label="Tidak Aktif" count={inactiveCount} className="bg-red-50 text-red-600" />
        </div>
      )}
      {isLoading && <span className="text-xs text-gray-400">Memuat…</span>}
    </div>
  );
}

function StatBadge({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
      <span className="font-bold">{count}</span>
    </span>
  );
}
