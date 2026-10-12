"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuditHistoryAction } from "@/app/(app)/label/audit/actions";
import {
  extractLabelNo,
  extractProduksiNo,
  type AuditDetailComparison,
  type AuditEventItem,
  type AuditHistory,
  type AuditSession,
} from "@/services/audit-service";

type Props = {
  documentNo: string;
  docLabel: string;
  onClose: () => void;
};

const ACTION_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  CREATE: { bg: "#E3FCEF", fg: "#006644", dot: "#36B37E" },
  UPDATE: { bg: "#DEEBFF", fg: "#0747A6", dot: "#0052CC" },
  DELETE: { bg: "#FFEBEB", fg: "#BF2600", dot: "#DE350B" },
  CONSUME: { bg: "#FFF0E5", fg: "#974F0C", dot: "#FF991F" },
  UNCONSUME: { bg: "#EAE6FF", fg: "#403294", dot: "#6554C0" },
  PRODUCE: { bg: "#E6FCFF", fg: "#008DA6", dot: "#00B8D9" },
  UNPRODUCE: { bg: "#FFF0F6", fg: "#943D73", dot: "#C74590" },
  ADJUST: { bg: "#FFF7E6", fg: "#8F5A00", dot: "#FFAB00" },
};

const AVATAR_COLORS = ["#6554C0", "#00B8D9", "#36B37E", "#FF5630", "#0052CC", "#FF991F"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
}

function fmtTime(iso: string | null, withSeconds = false): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return withSeconds
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ActionLozenge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? { bg: "#F4F5F7", fg: "#42526E", dot: "#6B778C" };
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[3px] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.3px]"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {action}
    </span>
  );
}

function MetaItem({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-[12px] font-normal text-[#6B778C]">{children}</span>;
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string | null;
  count?: number;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-semibold text-[#172B4D]">{title}</h3>
        {count != null && (
          <span className="rounded-[3px] bg-[#F4F5F7] px-1.5 py-0.5 text-[11px] font-bold text-[#42526E]">{count}</span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-[12px] text-[#6B778C]">{subtitle}</p>}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[3px] border border-[#DFE1E6] bg-white p-4 shadow-sm ${className ?? ""}`}>{children}</div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-[92px] shrink-0 text-[12px] font-semibold text-[#6B778C]">{label}</span>
      <span className="min-w-0 break-all text-[13px] font-medium text-[#172B4D]">{value}</span>
    </div>
  );
}

function JsonBlock({ title, json }: { title: string; json: string }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#6B778C]">{title}</p>
      <pre className="max-h-48 overflow-auto rounded-[3px] border border-[#EBECF0] bg-[#F7F8F9] p-3 text-[11px] leading-relaxed text-[#172B4D]">
        {prettyJson(json)}
      </pre>
    </div>
  );
}

function ValueBox({
  label,
  value,
  changed,
  isBefore,
}: {
  label: string;
  value: string;
  changed: boolean;
  isBefore: boolean;
}) {
  const bg = changed ? (isBefore ? "#FFEBEB" : "#E3FCEF") : "#F4F5F7";
  const border = changed ? (isBefore ? "#FFBDAD" : "#79F2C0") : "#DFE1E6";
  const color = changed ? (isBefore ? "#BF2600" : "#006644") : "#172B4D";
  return (
    <div className="min-w-0 flex-1 rounded-[3px] border p-2.5" style={{ backgroundColor: bg, borderColor: border }}>
      <p className="text-[10px] font-semibold text-[#6B778C]">{label}</p>
      <p
        className={`mt-1 break-all text-[13px] ${changed && !isBefore ? "font-semibold" : "font-normal"}`}
        style={{ color, textDecoration: changed && isBefore ? "line-through" : "none" }}
      >
        {value}
      </p>
    </div>
  );
}

function HeaderChangeRow({ change }: { change: AuditSession["fieldChanges"][number] }) {
  const oldV = change.oldValue ?? "-";
  const newV = change.newValue ?? "-";
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        {change.changed && <span className="h-1.5 w-1.5 rounded-full bg-[#FF991F]" />}
        <span className="text-[12px] font-semibold text-[#42526E]">{change.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <ValueBox label="Before" value={oldV} changed={change.changed} isBefore />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 shrink-0 ${change.changed ? "text-[#0052CC]" : "text-[#A5ADBA]"}`}
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <ValueBox label="After" value={newV} changed={change.changed} isBefore={false} />
      </div>
    </div>
  );
}

function DetailItemDisplay({ label, item }: { label: string; item: Record<string, unknown> }) {
  const parts: string[] = [];
  if (item.Berat != null) parts.push(`${item.Berat} kg`);
  if (item.Pcs != null) parts.push(`${item.Pcs} pcs`);
  if (item.IsPartial === true || item.IsPartial === 1 || item.IsPartial === "1") parts.push("Partial");
  if (item.DateUsage != null && String(item.DateUsage).trim() !== "") parts.push(`Used: ${item.DateUsage}`);
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-[#6B778C]">{label}</p>
      <p className="mt-1 text-[12px] text-[#172B4D]">{parts.length ? parts.join(" • ") : "-"}</p>
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string; border: string; dot: string; fg: string }> = {
  DELETED: { bg: "#FFEBEB", border: "#FFBDAD", dot: "#DE350B", fg: "#BF2600" },
  ADDED: { bg: "#E3FCEF", border: "#79F2C0", dot: "#36B37E", fg: "#006644" },
  MODIFIED: { bg: "#FFF0E5", border: "#FFD79E", dot: "#FF991F", fg: "#974F0C" },
  UNCHANGED: { bg: "#F4F5F7", border: "#DFE1E6", dot: "#6B778C", fg: "#42526E" },
};

function DetailChangeRow({ comparison }: { comparison: AuditDetailComparison }) {
  const s = STATUS_STYLE[comparison.status] ?? STATUS_STYLE.UNCHANGED;
  return (
    <div
      className="rounded-[3px] border p-3"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
        <span className="text-[13px] font-semibold" style={{ color: s.fg }}>
          Sak #{comparison.noSak ?? comparison.key}
        </span>
        <span className="ml-auto rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: s.dot }}>
          {comparison.status}
        </span>
      </div>
      {(comparison.oldItem || comparison.newItem) && (
        <div className="mt-2.5 flex items-center gap-2">
          {comparison.oldItem && <DetailItemDisplay label="Before" item={comparison.oldItem} />}
          {comparison.oldItem && comparison.newItem && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0 text-[#6B778C]" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
          {comparison.newItem && <DetailItemDisplay label="After" item={comparison.newItem} />}
        </div>
      )}
    </div>
  );
}

function AttributeBadge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: bg, color: fg }}>
      {children}
    </span>
  );
}

function LabelCard({
  labelNo,
  attributes,
  removed,
}: {
  labelNo: string;
  attributes: React.ReactNode[];
  removed: boolean;
}) {
  return (
    <div
      className={`rounded-[3px] border px-3 py-2 ${removed ? "border-[#FFBDAD] bg-[#FFEBEB]" : "border-[#DFE1E6] bg-white"}`}
    >
      <p className={`text-[13px] font-semibold ${removed ? "text-[#BF2600] line-through" : "text-[#172B4D]"}`}>{labelNo}</p>
      {attributes.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{attributes}</div>}
    </div>
  );
}

function eventAttributes(row: Record<string, unknown>): React.ReactNode[] {
  const badges: React.ReactNode[] = [];
  if (row.NoSak != null) {
    badges.push(
      <AttributeBadge key="sak" bg="#DEEBFF" fg="#0747A6">
        Sak #{String(row.NoSak)}
      </AttributeBadge>,
    );
  }
  const oldBerat = row.OldBerat != null ? Number(row.OldBerat) : null;
  const newBerat = row.NewBerat != null ? Number(row.NewBerat) : null;
  if ((oldBerat != null || newBerat != null) && oldBerat !== newBerat) {
    badges.push(
      <AttributeBadge key="berat" bg="#FFF0E5" fg="#974F0C">
        Berat {(oldBerat ?? 0).toFixed(2)} → {(newBerat ?? 0).toFixed(2)} kg
      </AttributeBadge>,
    );
  } else if (row.Berat != null) {
    const b = Number(row.Berat);
    badges.push(
      <AttributeBadge key="berat" bg="#FFF0B3" fg="#172B4D">
        {(Number.isFinite(b) ? b : 0).toFixed(2)} kg
      </AttributeBadge>,
    );
  }
  const oldPcs = row.OldPcs != null ? Number(row.OldPcs) : null;
  const newPcs = row.NewPcs != null ? Number(row.NewPcs) : null;
  if ((oldPcs != null || newPcs != null) && oldPcs !== newPcs) {
    badges.push(
      <AttributeBadge key="pcs" bg="#FFF0E5" fg="#974F0C">
        Pcs {oldPcs ?? "-"} → {newPcs ?? "-"}
      </AttributeBadge>,
    );
  } else if (row.Pcs != null) {
    badges.push(
      <AttributeBadge key="pcs" bg="#E3FCEF" fg="#006644">
        {String(row.Pcs)} pcs
      </AttributeBadge>,
    );
  }
  return badges;
}

function EventGroup({
  tableName,
  action,
  items,
  isUnproduce,
  isConsume,
}: {
  tableName: string | null;
  action: string | null;
  items: AuditEventItem[];
  isUnproduce: boolean;
  isConsume: boolean;
}) {
  const sourceNo = items[0] ? extractProduksiNo(items[0].row) : "-";
  const cards = (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {items.map((it, i) => (
        <LabelCard
          key={i}
          labelNo={extractLabelNo(it.row)}
          attributes={eventAttributes(it.row)}
          removed={isUnproduce}
        />
      ))}
    </div>
  );

  const arrow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0 text-[#A5ADBA]" aria-hidden>
      {isUnproduce ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );

  const chip = (
    <div className="shrink-0 self-center rounded-[3px] border border-[#4C9AFF] bg-[#DEEBFF] px-2.5 py-1.5 text-[12px] font-bold text-[#0747A6]">
      {sourceNo}
    </div>
  );

  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-[#42526E]">
        <span className="font-semibold">{tableName ?? "-"}</span>
        <span className="text-[#A5ADBA]">•</span>
        <span className="font-medium">{action ?? "-"}</span>
        <span className="rounded-[3px] bg-[#F4F5F7] px-1.5 py-0.5 text-[11px] font-bold text-[#42526E]">{items.length}</span>
      </div>
      <div className="flex items-stretch gap-3 rounded-[3px] border border-[#EBECF0] bg-[#FAFBFC] p-4">
        {isConsume && !isUnproduce ? (
          <>
            {cards}
            {arrow}
            {chip}
          </>
        ) : (
          <>
            {chip}
            {arrow}
            {cards}
          </>
        )}
      </div>
    </div>
  );
}

function EventSection({
  title,
  action,
  items,
  isUnproduce,
  isConsume,
}: {
  title: string;
  action: string;
  items: AuditEventItem[];
  isUnproduce: boolean;
  isConsume: boolean;
}) {
  const groups = new Map<string, AuditEventItem[]>();
  for (const it of items) {
    const key = `${it.tableName ?? "-"}|${it.action ?? "-"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  return (
    <div className="mb-4">
      <SectionHeader title={title} count={items.length} />
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <ActionLozenge action={action} />
          <span className="ml-auto rounded-[3px] bg-[#F4F5F7] px-1.5 py-0.5 text-[11px] font-bold text-[#42526E]">{items.length}</span>
        </div>
        {Array.from(groups.entries()).map(([key, list]) => {
          const [tableName, act] = key.split("|");
          return (
            <EventGroup
              key={key}
              tableName={tableName}
              action={act}
              items={list}
              isUnproduce={isUnproduce}
              isConsume={isConsume}
            />
          );
        })}
      </Card>
    </div>
  );
}

function SessionDetail({ session }: { session: AuditSession }) {
  const [rawOpen, setRawOpen] = useState(false);

  const hasHeaderChanges = session.fieldChanges.some((c) => c.oldValue != null || c.newValue != null);
  const hasDetails =
    (session.detailsOldList != null || session.detailsNewList != null) &&
    !session.isConsumeSession &&
    !session.isProduceSession;
  const hasConsume = session.isConsume
    ? session.consumeItems.length > 0
    : session.isUnconsume
      ? session.unconsumeItems.length > 0
      : false;
  const produceSource = session.isAdjust
    ? session.produceItems
    : session.isProduce
      ? session.produceItems
      : session.isUnproduce
        ? session.unproduceItems
        : [];
  const hasProduce = !session.isUpdate && produceSource.length > 0;
  const hasRaw =
    session.headerOld != null ||
    session.headerNew != null ||
    session.detailsOldJson != null ||
    session.detailsNewJson != null ||
    session.consumeJson != null ||
    session.unconsumeJson != null ||
    session.produceJson != null ||
    session.unproduceJson != null ||
    session.outputChanges != null;

  const productionTitle = session.isAdjust
    ? "Production Adjustment"
    : session.isProduce
      ? "Production Output"
      : session.isUnproduce
        ? "Production Rollback"
        : "Production Activity";

  const consumeItems = session.isConsume ? session.consumeItems : session.unconsumeItems;
  const consumeAction = session.isConsume ? "CONSUME" : "UNCONSUME";
  const consumeTitle = session.isConsume ? "Material Consumption" : "Material Unconsumption";

  return (
    <div className="space-y-4 p-5">
      <Card>
        <div className="flex items-center gap-3">
          <ActionLozenge action={session.sessionAction} />
          <span className="min-w-0 flex-1 truncate text-[18px] font-semibold text-[#172B4D]">{session.documentNo}</span>
        </div>
        <div className="my-5 h-px bg-[#DFE1E6]" />
        <div className="space-y-3">
          <InfoRow label="User" value={session.actor ?? "-"} />
          <InfoRow label="Date" value={fmtDate(session.startTime)} />
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <InfoRow label="Start" value={fmtTime(session.startTime, true)} />
            </div>
            <div className="min-w-0 flex-1">
              <InfoRow label="End" value={fmtTime(session.endTime, true)} />
            </div>
          </div>
          {session.requestId && <InfoRow label="Request ID" value={session.requestId} />}
        </div>
      </Card>

      {hasConsume && (
        <EventSection
          title={consumeTitle}
          action={consumeAction}
          items={consumeItems}
          isUnproduce={session.isUnconsume}
          isConsume={session.isConsume}
        />
      )}

      {hasProduce && (
        <EventSection
          title={productionTitle}
          action={session.isAdjust ? "ADJUST" : session.isProduce ? "PRODUCE" : "UNPRODUCE"}
          items={produceSource}
          isUnproduce={session.isUnproduce || session.isAdjust}
          isConsume={false}
        />
      )}

      {hasHeaderChanges && (
        <div>
          <SectionHeader title="Header Modifications" />
          <Card>
            <div className="space-y-4">
              {session.fieldChanges.map((c) => (
                <HeaderChangeRow key={c.key} change={c} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {hasDetails && (
        <div>
          <SectionHeader title="Detail Line Changes" subtitle={session.detailsSummary} />
          <Card>
            <div className="mb-4 flex flex-wrap gap-2">
              {session.detailsComparisons.filter((c) => c.status === "DELETED").length > 0 && (
                <AttributeBadge bg="#FFEBEB" fg="#BF2600">
                  Deleted: {session.detailsComparisons.filter((c) => c.status === "DELETED").length}
                </AttributeBadge>
              )}
              {session.detailsComparisons.filter((c) => c.status === "ADDED").length > 0 && (
                <AttributeBadge bg="#E3FCEF" fg="#006644">
                  Added: {session.detailsComparisons.filter((c) => c.status === "ADDED").length}
                </AttributeBadge>
              )}
              {session.detailsComparisons.filter((c) => c.status === "MODIFIED").length > 0 && (
                <AttributeBadge bg="#FFF0E5" fg="#974F0C">
                  Modified: {session.detailsComparisons.filter((c) => c.status === "MODIFIED").length}
                </AttributeBadge>
              )}
            </div>
            <div className="my-4 h-px bg-[#DFE1E6]" />
            <div className="space-y-3">
              {session.detailsComparisons.map((c) => (
                <DetailChangeRow key={c.key} comparison={c} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {session.output?.displayValue && (
        <div>
          <SectionHeader title="Output Relation" />
          <Card>
            <p className="mb-2.5 text-[13px] font-semibold text-[#42526E]">{session.output.displayLabel ?? "Output"}</p>
            <div className="flex items-center gap-2 rounded-[3px] border border-[#4C9AFF] bg-[#DEEBFF] p-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[#0052CC]" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span className="min-w-0 break-all text-[14px] font-semibold text-[#0747A6]">{session.output.displayValue}</span>
            </div>
          </Card>
        </div>
      )}

      {hasRaw && (
        <Card>
          <button
            type="button"
            onClick={() => setRawOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-[#42526E]" aria-hidden>
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
            </svg>
            <span className="flex-1 text-[14px] font-semibold text-[#172B4D]">Raw JSON Data</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-5 w-5 text-[#6B778C] transition-transform ${rawOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {rawOpen && (
            <div className="mt-4">
              {session.headerOld && <JsonBlock title="Header (Old)" json={session.headerOld} />}
              {session.headerNew && <JsonBlock title="Header (New)" json={session.headerNew} />}
              {session.headerDeleted && <JsonBlock title="Header (Deleted)" json={session.headerDeleted} />}
              {session.headerInserted && <JsonBlock title="Header (Inserted)" json={session.headerInserted} />}
              {session.detailsOldJson && <JsonBlock title="Details (Old)" json={session.detailsOldJson} />}
              {session.detailsNewJson && <JsonBlock title="Details (New)" json={session.detailsNewJson} />}
              {session.consumeJson && <JsonBlock title="Consume Data" json={session.consumeJson} />}
              {session.unconsumeJson && <JsonBlock title="Unconsume Data" json={session.unconsumeJson} />}
              {session.produceJson && <JsonBlock title="Produce Data" json={session.produceJson} />}
              {session.unproduceJson && <JsonBlock title="Unproduce Data" json={session.unproduceJson} />}
              {session.outputChanges && <JsonBlock title="Output Changes" json={session.outputChanges} />}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SessionRow({
  session,
  selected,
  onSelect,
}: {
  session: AuditSession;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-[#DFE1E6] px-4 py-3 text-left transition ${
        selected ? "border-l-[3px] border-l-[#0052CC] bg-[#DEEBFF]" : "border-l-[3px] border-l-transparent bg-white hover:bg-[#F4F5F7]"
      }`}
    >
      <ActionLozenge action={session.sessionAction} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <MetaItem>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {fmtDate(session.startTime)}
        </MetaItem>
        <MetaItem>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {fmtTime(session.startTime)}
        </MetaItem>
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: avatarColor(session.actor ?? "?") }}
          >
            {initials(session.actor ?? "?")}
          </span>
          <span className="truncate text-[13px] font-normal text-[#42526E]">{session.actor}</span>
        </span>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={`h-5 w-5 shrink-0 ${selected ? "text-[#0052CC]" : "text-[#A5ADBA]"}`}
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export function AuditHistoryDialog({ documentNo, docLabel, onClose }: Props) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    history: AuditHistory | null;
    selectedKey: string | null;
    requestId: number;
  }>(() => ({
    loading: true,
    error: null,
    history: null,
    selectedKey: null,
    requestId: 0,
  }));
  const listRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  const selected = useMemo(
    () => state.history?.sessions.find((s) => s.sessionKey === state.selectedKey) ?? null,
    [state.history, state.selectedKey],
  );

  useEffect(() => {
    let cancelled = false;
    reqRef.current += 1;
    const requestId = reqRef.current;
    setState((s) => ({ ...s, loading: true, error: null, history: null, selectedKey: null, requestId }));

    void (async () => {
      const res = await getAuditHistoryAction(documentNo);
      if (cancelled || requestId !== reqRef.current) return;
      if (res.ok) {
        setState((s) => ({
          ...s,
          loading: false,
          error: null,
          history: res.history,
          selectedKey: res.history.sessions[0]?.sessionKey ?? null,
          requestId: s.requestId,
        }));
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          error: res.error,
          history: null,
          selectedKey: null,
          requestId: s.requestId,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentNo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { loading, error, history } = state;
  const sessions = history?.sessions ?? [];
  const selectedSession = selected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#FAFBFC] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#DFE1E6] bg-white px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[#172B4D]">History Dokumen</p>
            <p className="truncate text-[12px] font-semibold text-[#44546F]">
              {docLabel} — {documentNo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Tutup"
            className="rounded-lg border border-[#DCDFE4] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#44546F] transition hover:bg-[#F1F5F7]"
          >
            Tutup
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 w-full flex-col border-b border-[#DFE1E6] bg-white md:w-[42%] md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-[#DFE1E6] bg-[#F4F5F7] px-4 py-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-[#42526E]" aria-hidden>
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <span className="text-[14px] font-semibold text-[#172B4D]">
                  {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
                </span>
              </div>
              {history && (
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#DEEBFF] px-2 py-1 text-[11px] font-bold tracking-[0.3px] text-[#0747A6]">
                  {history.displayName}
                  <span className="font-semibold">{history.documentNo}</span>
                </span>
              )}
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] font-semibold text-[#44546F]">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1565C0] border-t-transparent" />
                  Loading audit history…
                </div>
              )}

              {!loading && error && (
                <div className="m-4 rounded-xl border border-[#F5D2D0] bg-[#FFEBEB] px-4 py-3 text-[13px] font-semibold text-[#BF2600]">
                  {error}
                </div>
              )}

              {!loading && !error && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mb-4 h-16 w-16 text-[#A5ADBA]" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.2-3.2" />
                  </svg>
                  <p className="text-[15px] font-semibold text-[#42526E]">No Results Found</p>
                  <p className="mt-1 text-[13px] text-[#6B778C]">No audit sessions found for this document</p>
                </div>
              )}

              {!loading &&
                !error &&
                sessions.map((s) => (
                  <SessionRow
                    key={s.sessionKey}
                    session={s}
                    selected={s.sessionKey === state.selectedKey}
                    onSelect={() => setState((st) => ({ ...st, selectedKey: s.sessionKey }))}
                  />
                ))}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFBFC]">
            <div className="flex items-center gap-2.5 border-b border-[#DFE1E6] bg-white px-5 py-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-[#42526E]" aria-hidden>
                <path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" />
              </svg>
              <span className="text-[16px] font-semibold text-[#172B4D]">Activity Details</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedSession ? (
                <SessionDetail key={selectedSession.sessionKey} session={selectedSession} />
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mb-4 h-16 w-16 text-[#A5ADBA]" aria-hidden>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                  <p className="text-[15px] font-semibold text-[#42526E]">No activity selected</p>
                  <p className="mt-1 text-[13px] text-[#6B778C]">Select an activity from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
