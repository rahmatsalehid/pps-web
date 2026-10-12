import { ApiRequestError, apiFetchAuth } from "@/services/api";

export type AuditOldNew = { old: string | null; new: string | null };

export type AuditFieldChange = {
  key: string;
  label: string;
  relational: boolean;
  oldId: string | null;
  newId: string | null;
  oldName: string | null;
  newName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changed: boolean;
};

export type AuditDetailRow = Record<string, unknown>;

export type AuditEventItem = {
  tableName: string | null;
  action: string | null;
  row: AuditDetailRow;
};

export type AuditDetailComparison = {
  noSak: number | null;
  key: string;
  oldItem: AuditDetailRow | null;
  newItem: AuditDetailRow | null;
  status: "ADDED" | "DELETED" | "MODIFIED" | "UNCHANGED";
};

export type AuditOutput = {
  tableName: string | null;
  displayLabel: string | null;
  displayValue: string | null;
  action: string | null;
};

export type AuditSession = {
  startTime: string | null;
  endTime: string | null;
  actor: string | null;
  requestId: string | null;
  sessionKey: string;
  documentNo: string;
  sessionAction: string;
  isCreate: boolean;
  isUpdate: boolean;
  isDelete: boolean;
  isConsume: boolean;
  isUnconsume: boolean;
  isProduce: boolean;
  isUnproduce: boolean;
  isAdjust: boolean;
  isConsumeSession: boolean;
  isProduceSession: boolean;
  fieldChanges: AuditFieldChange[];
  headerOld: string | null;
  headerNew: string | null;
  headerDeleted: string | null;
  headerInserted: string | null;
  detailsOldJson: string | null;
  detailsNewJson: string | null;
  detailsOldList: AuditDetailRow[] | null;
  detailsNewList: AuditDetailRow[] | null;
  detailsSummary: string;
  detailsComparisons: AuditDetailComparison[];
  consumeItems: AuditEventItem[];
  unconsumeItems: AuditEventItem[];
  produceItems: AuditEventItem[];
  unproduceItems: AuditEventItem[];
  consumeJson: string | null;
  unconsumeJson: string | null;
  produceJson: string | null;
  unproduceJson: string | null;
  outputChanges: string | null;
  output: AuditOutput | null;
};

export type AuditModuleConfig = {
  module: string;
  pkField: string;
  displayName: string;
  fields: { idField: string; nameField: string | null; displayLabel: string; relational: boolean }[];
};

export type AuditHistory = {
  module: string;
  prefix: string | null;
  documentNo: string;
  pkField: string | null;
  displayName: string;
  sessions: AuditSession[];
};

type Envelope = {
  success?: boolean;
  message?: string;
  data?: {
    module?: string;
    prefix?: string | null;
    documentNo?: string;
    pkField?: string | null;
    sessions?: Record<string, unknown>[];
  };
};

const MODULE_CONFIGS: Record<string, AuditModuleConfig> = {
  broker: {
    module: "broker",
    pkField: "NoBroker",
    displayName: "Broker",
    fields: [
      { idField: "IdJenisPlastik", nameField: "NamaJenisPlastik", displayLabel: "Jenis Plastik", relational: true },
      { idField: "IdWarehouse", nameField: "NamaWarehouse", displayLabel: "Warehouse", relational: true },
      { idField: "Blok", nameField: null, displayLabel: "Blok", relational: false },
      { idField: "IdLokasi", nameField: null, displayLabel: "Lokasi", relational: false },
    ],
  },
  bonggolan: {
    module: "bonggolan",
    pkField: "NoBonggolan",
    displayName: "Bonggolan",
    fields: [
      { idField: "IdBonggolan", nameField: "NamaBonggolan", displayLabel: "Jenis Bonggolan", relational: true },
      { idField: "IdWarehouse", nameField: "NamaWarehouse", displayLabel: "Warehouse", relational: true },
      { idField: "Berat", nameField: null, displayLabel: "Berat (kg)", relational: false },
      { idField: "DateCreate", nameField: null, displayLabel: "Tanggal Buat", relational: false },
      { idField: "Blok", nameField: null, displayLabel: "Blok", relational: false },
      { idField: "IdLokasi", nameField: null, displayLabel: "Lokasi", relational: false },
    ],
  },
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Sesi login berakhir, silakan login ulang");
  return token;
}

const str = (v: unknown): string => (v == null ? "" : String(v));
const strOrNull = (v: unknown): string | null => {
  const s = str(v).trim();
  return s === "" ? null : s;
};

function parseList(raw: unknown): Record<string, unknown>[] {
  if (raw == null || raw === "") return [];
  let value: unknown = raw;
  for (let i = 0; i < 3 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.filter((e): e is Record<string, unknown> => e != null && typeof e === "object");
  }
  if (value && typeof value === "object") return [value as Record<string, unknown>];
  return [];
}

function parseMap(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  let value: unknown = raw;
  for (let i = 0; i < 3 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseEventItems(ev: Record<string, unknown>): Record<string, unknown>[] {
  const raw = ev.NewData ?? ev.OldData;
  return parseList(raw);
}

function flattenEvents(raw: unknown): AuditEventItem[] {
  const events = parseList(raw);
  const out: AuditEventItem[] = [];
  for (const ev of events) {
    const tableName = strOrNull(ev.TableName);
    const action = strOrNull(ev.Action);
    for (const row of parseEventItems(ev)) {
      out.push({ tableName, action, row });
    }
  }
  return out;
}

function pickFirst(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = strOrNull(row[k]);
    if (v) return v;
  }
  return null;
}

const LABEL_KEYS = [
  "NoBahanBaku",
  "NoWashing",
  "NoBroker",
  "NoBonggolan",
  "NoCrusher",
  "NoGilingan",
  "NoMixer",
  "NoFurnitureWIP",
  "NoBJ",
  "NoBongkarSusun",
  "NoPacking",
  "NoBJSortir",
  "NoBJJual",
  "NoRetur",
];

export function extractLabelNo(row: AuditDetailRow): string {
  return pickFirst(row, LABEL_KEYS) ?? "-";
}

export function extractProduksiNo(row: AuditDetailRow): string {
  return (
    pickFirst(row, ["NoProduksi", "NoCrusherProduksi", "NoPacking", "NoBJSortir", "NoBJJual", "NoBongkarSusun", "NoRetur"]) ??
    "-"
  );
}

function itemsDifferent(oldItem: Record<string, unknown> | null, newItem: Record<string, unknown> | null): boolean {
  if (oldItem == null || newItem == null) return true;
  return (
    strOrNull(oldItem.Berat) !== strOrNull(newItem.Berat) ||
    strOrNull(oldItem.IsPartial) !== strOrNull(newItem.IsPartial) ||
    strOrNull(oldItem.DateUsage) !== strOrNull(newItem.DateUsage) ||
    strOrNull(oldItem.Pcs) !== strOrNull(newItem.Pcs)
  );
}

function buildDetailComparisons(
  oldList: Record<string, unknown>[],
  newList: Record<string, unknown>[],
): AuditDetailComparison[] {
  const oldMap = new Map<string, Record<string, unknown>>();
  const newMap = new Map<string, Record<string, unknown>>();
  for (const item of oldList) {
    const k = strOrNull(item.NoSak) ?? str(item.NoSak) ?? "";
    if (k) oldMap.set(k, item);
  }
  for (const item of newList) {
    const k = strOrNull(item.NoSak) ?? "";
    if (k) newMap.set(k, item);
  }
  const allKeys = Array.from(new Set([...oldMap.keys(), ...newMap.keys()])).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });

  return allKeys.map((key) => {
    const oldItem = oldMap.get(key) ?? null;
    const newItem = newMap.get(key) ?? null;
    const noSak = Number(key);
    let status: AuditDetailComparison["status"];
    if (oldItem && !newItem) status = "DELETED";
    else if (!oldItem && newItem) status = "ADDED";
    else if (itemsDifferent(oldItem, newItem)) status = "MODIFIED";
    else status = "UNCHANGED";
    return {
      key,
      noSak: Number.isFinite(noSak) ? noSak : null,
      oldItem,
      newItem,
      status,
    };
  });
}

function buildDetailsSummary(comparisons: AuditDetailComparison[]): string {
  const oldCount = comparisons.filter((c) => c.oldItem).length;
  const newCount = comparisons.filter((c) => c.newItem).length;
  if (oldCount === 0 && newCount === 0) return "No changes";
  if (oldCount === 0) return `Added ${newCount} item(s)`;
  if (newCount === 0) return `Removed ${oldCount} item(s)`;
  const diff = newCount - oldCount;
  if (diff === 0) return "Modified (same count)";
  if (diff > 0) return `Added ${diff} item(s)`;
  return `Removed ${Math.abs(diff)} item(s)`;
}

function buildFieldChanges(
  r: Record<string, unknown>,
  config: AuditModuleConfig,
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  for (const f of config.fields) {
    const oldId = strOrNull(r[`Old${f.idField}`]);
    const newId = strOrNull(r[`New${f.idField}`]);
    const oldName = f.nameField ? strOrNull(r[`Old${f.nameField}`]) : null;
    const newName = f.nameField ? strOrNull(r[`New${f.nameField}`]) : null;
    const oldValue = f.relational ? oldName ?? oldId : oldId;
    const newValue = f.relational ? newName ?? newId : newId;
    if (oldValue == null && newValue == null) continue;
    changes.push({
      key: f.idField,
      label: f.displayLabel,
      relational: f.relational,
      oldId,
      newId,
      oldName,
      newName,
      oldValue,
      newValue,
      changed: oldValue !== newValue,
    });
  }

  const oldStatus = strOrNull(r.OldStatusText);
  const newStatus = strOrNull(r.NewStatusText);
  if (oldStatus != null || newStatus != null) {
    changes.push({
      key: "StatusText",
      label: "Status",
      relational: false,
      oldId: oldStatus,
      newId: newStatus,
      oldName: oldStatus,
      newName: newStatus,
      oldValue: oldStatus,
      newValue: newStatus,
      changed: oldStatus !== newStatus,
    });
  }
  return changes;
}

function parseOutput(raw: unknown): AuditOutput | null {
  const m = parseMap(raw);
  if (!m) return null;
  return {
    tableName: strOrNull(m.TableName),
    displayLabel: strOrNull(m.DisplayLabel),
    displayValue: strOrNull(m.DisplayValue),
    action: strOrNull(m.Action),
  };
}

function parseSession(r: Record<string, unknown>, config: AuditModuleConfig | null): AuditSession {
  const action = str(r.SessionAction).trim().toUpperCase() || "UNKNOWN";
  const detailsOldList = parseList(r.DetailsOldJson);
  const detailsNewList = parseList(r.DetailsNewJson);
  const hasOldDetails = strOrNull(r.DetailsOldJson) != null;
  const hasNewDetails = strOrNull(r.DetailsNewJson) != null;
  const comparisons =
    hasOldDetails || hasNewDetails ? buildDetailComparisons(detailsOldList, detailsNewList) : [];

  const fieldChanges = config
    ? buildFieldChanges(r, config)
    : [];

  const consumeItems = flattenEvents(r.ConsumeJson);
  const unconsumeItems = flattenEvents(r.UnconsumeJson);
  const produceItems = flattenEvents(r.ProduceJson);
  const unproduceItems = flattenEvents(r.UnproduceJson);

  return {
    startTime: strOrNull(r.StartTime),
    endTime: strOrNull(r.EndTime),
    actor: strOrNull(r.Actor),
    requestId: strOrNull(r.RequestId),
    sessionKey: str(r.SessionKey) || str(r.RequestId) || `${str(r.StartTime)}-${action}`,
    documentNo: str(r.DocumentNo),
    sessionAction: action,
    isCreate: action === "CREATE",
    isUpdate: action === "UPDATE",
    isDelete: action === "DELETE",
    isConsume: action === "CONSUME",
    isUnconsume: action === "UNCONSUME",
    isProduce: action === "PRODUCE",
    isUnproduce: action === "UNPRODUCE",
    isAdjust: action === "ADJUST",
    isConsumeSession: action === "CONSUME" || action === "UNCONSUME",
    isProduceSession: action === "PRODUCE" || action === "UNPRODUCE" || action === "ADJUST",
    fieldChanges,
    headerOld: strOrNull(r.HeaderOld),
    headerNew: strOrNull(r.HeaderNew),
    headerDeleted: strOrNull(r.HeaderDeleted),
    headerInserted: strOrNull(r.HeaderInserted),
    detailsOldJson: strOrNull(r.DetailsOldJson),
    detailsNewJson: strOrNull(r.DetailsNewJson),
    detailsOldList: hasOldDetails ? detailsOldList : null,
    detailsNewList: hasNewDetails ? detailsNewList : null,
    detailsSummary: buildDetailsSummary(comparisons),
    detailsComparisons: comparisons,
    consumeItems,
    unconsumeItems,
    produceItems,
    unproduceItems,
    consumeJson: strOrNull(r.ConsumeJson),
    unconsumeJson: strOrNull(r.UnconsumeJson),
    produceJson: strOrNull(r.ProduceJson),
    unproduceJson: strOrNull(r.UnproduceJson),
    outputChanges: strOrNull(r.OutputChanges),
    output: parseOutput(r.OutputChanges),
  };
}

export function moduleDisplayName(module: string): string {
  return MODULE_CONFIGS[module]?.displayName ?? module.toUpperCase().replace(/_/g, " ");
}

export async function fetchAuditHistory(
  token: string | undefined,
  documentNo: string,
): Promise<AuditHistory> {
  const t = requireToken(token);
  const doc = documentNo.trim();
  if (!doc) throw new ApiRequestError("Document number is required");

  const res = await apiFetchAuth<Envelope>(
    `/audit/${encodeURIComponent(doc)}/history`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat history (${res.status})`);
  }
  const data = res.data.data;
  if (!data) throw new ApiRequestError("Respons history tidak valid");

  const moduleKey = str(data.module).toLowerCase();
  const config = MODULE_CONFIGS[moduleKey] ?? null;
  return {
    module: moduleKey,
    prefix: strOrNull(data.prefix),
    documentNo: str(data.documentNo) || doc,
    pkField: strOrNull(data.pkField),
    displayName: moduleDisplayName(moduleKey),
    sessions: (data.sessions ?? []).map((s) => parseSession(s, config)),
  };
}
