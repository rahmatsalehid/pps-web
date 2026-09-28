import type { PbdTim } from "@/services/penerimaan-barang-dagang-service";
import {
  pbdCardStatusOf,
  pbdDaysText,
  formatTanggalShort,
  type PbdCardStatus,
} from "./pbd-format";
import { InventoryIcon, PersonIcon, ScheduleIcon } from "./pbd-icons";

const BORDER_STYLE: Record<PbdCardStatus, { border: string; bg: string }> = {
  active: { border: "#93C5FD", bg: "#FFFFFF" },
  pending: { border: "#FCD34D", bg: "#FFFBEB" },
  inactive: { border: "#FCA5A5", bg: "#FFFFFF" },
};

const DOT_COLOR: Record<PbdCardStatus, string> = {
  active: "#2563EB",
  pending: "#D97706",
  inactive: "#DC2626",
};

export function PbdTimCard({
  tim,
  onClick,
}: {
  tim: PbdTim;
  onClick: () => void;
}) {
  const status = pbdCardStatusOf(tim.tglPenerimaan);
  const style = BORDER_STYLE[status];
  const showInfo = status !== "inactive";
  const daysText = pbdDaysText(tim.tglPenerimaan);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[110px] flex-col rounded-xl border-[1.2px] p-2.5 text-left transition hover:brightness-[0.98]"
      style={{ borderColor: style.border, backgroundColor: style.bg }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 flex-1 text-[11px] font-bold leading-tight text-[#1F2937]">
          {tim.namaTim}
        </span>
        <span
          className="mt-0.5 h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: DOT_COLOR[status] }}
        />
      </div>
      <div className="mt-1.5 border-t border-[#E2E8F0] pt-1.5">
        {showInfo ? (
          <div className="space-y-0.5">
            {tim.tglPenerimaan && daysText && (
              <SmallInfoRow
                icon={<ScheduleIcon className="h-2.5 w-2.5" />}
                text={`${formatTanggalShort(tim.tglPenerimaan)} • ${daysText}`}
                bold
              />
            )}
            {tim.createBy && (
              <SmallInfoRow
                icon={<PersonIcon className="h-2.5 w-2.5" />}
                text={tim.createBy}
              />
            )}
            {tim.tglPenerimaan && (
              <SmallInfoRow
                icon={<InventoryIcon className="h-2.5 w-2.5" />}
                text={`${tim.jumlahItem} label`}
                color="#374151"
                bold
              />
            )}
          </div>
        ) : (
          <p className="text-[9px] italic text-[#B91C1C]">Belum aktif</p>
        )}
      </div>
    </button>
  );
}

function SmallInfoRow({
  icon,
  text,
  bold,
  color,
}: {
  icon: React.ReactNode;
  text: string;
  bold?: boolean;
  color?: string;
}) {
  const textColor = color ?? "#4B5563";
  return (
    <span className="flex items-center gap-[3px]">
      <span className="shrink-0" style={{ color: textColor }}>
        {icon}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-[9px]"
        style={{
          color: textColor,
          fontWeight: bold ? 700 : 400,
        }}
      >
        {text}
      </span>
    </span>
  );
}

export function PbdSectionHeader({
  title,
  activeCount,
  pendingCount,
  inactiveCount,
  isLoading,
  alwaysShowPending = false,
}: {
  title: string;
  activeCount: number;
  pendingCount: number;
  inactiveCount: number;
  isLoading: boolean;
  alwaysShowPending?: boolean;
}) {
  return (
    <div className="flex h-11 items-center gap-2.5 border-b border-[#E5E7EB] bg-white px-3.5">
      <h2 className="text-[13px] font-bold text-[#1F2937]">{title}</h2>
      {!isLoading && (
        <>
          <StatBadge
            count={activeCount}
            label="Aktif"
            color="#2563EB"
            bg="#DBEAFE"
          />
          {(pendingCount > 0 || alwaysShowPending) && (
            <StatBadge
              count={pendingCount}
              label="Pending"
              color="#B45309"
              bg="#FEF3C7"
            />
          )}
          <StatBadge
            count={inactiveCount}
            label="Tidak Aktif"
            color="#DC2626"
            bg="#FEE2E2"
          />
        </>
      )}
    </div>
  );
}

function StatBadge({
  count,
  label,
  color,
  bg,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[20px] px-2 py-[3px] text-[10px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{ backgroundColor: color }}
      />
      {count} {label}
    </span>
  );
}
