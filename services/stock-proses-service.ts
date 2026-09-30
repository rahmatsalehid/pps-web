import { ApiRequestError, apiFetchAuth } from "./api";

export type StockProsesKey =
  | "washing"
  | "broker"
  | "crusher"
  | "bonggolan"
  | "gilingan"
  | "mixer"
  | "furnitureWip"
  | "barangJadi"
  | "reject"
  | "bahanBaku";

export type StockSourceKey = "proses" | "pakai";

export type StockItemRow = {
  id: number;
  nama: string;
  labelSisa: number;
  sakSisa: number;
  beratSisa: number;
  dateCreateTertua: string | null;
};

export type StockLabelRow = {
  label: string;
  dateCreate: string | null;
  sakSisa: number;
  beratSisa: number;
};

export type StockProsesMeta = {
  key: StockProsesKey;
  label: string;
  unit: "kg" | "pcs";
  showSak: boolean;
  showBerat: boolean;
  paneLabel: string;
  hasSources: boolean;
};

export type StockTotal = {
  labelSisa: number;
  amount: number;
  failed: boolean;
};

export type StockTotals = Record<StockProsesKey, StockTotal>;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export const STOCK_PROSES_LIST: StockProsesMeta[] = [
  { key: "washing", label: "Washing", unit: "kg", showSak: false, showBerat: true, paneLabel: "Washing", hasSources: false },
  { key: "broker", label: "Broker", unit: "kg", showSak: false, showBerat: true, paneLabel: "Broker", hasSources: false },
  { key: "crusher", label: "Crusher", unit: "kg", showSak: false, showBerat: true, paneLabel: "Crusher", hasSources: false },
  { key: "bonggolan", label: "Bonggolan", unit: "kg", showSak: false, showBerat: true, paneLabel: "Bonggolan", hasSources: false },
  { key: "gilingan", label: "Gilingan", unit: "kg", showSak: false, showBerat: true, paneLabel: "Gilingan", hasSources: false },
  { key: "mixer", label: "Mixer", unit: "kg", showSak: false, showBerat: true, paneLabel: "Mixer", hasSources: false },
  { key: "furnitureWip", label: "Furniture WIP", unit: "pcs", showSak: true, showBerat: false, paneLabel: "Furniture WIP", hasSources: false },
  { key: "barangJadi", label: "Barang Jadi", unit: "pcs", showSak: true, showBerat: false, paneLabel: "Barang Jadi", hasSources: false },
  { key: "reject", label: "Reject", unit: "kg", showSak: false, showBerat: true, paneLabel: "Reject", hasSources: false },
  { key: "bahanBaku", label: "Bahan Baku", unit: "kg", showSak: false, showBerat: true, paneLabel: "Bahan Baku Proses", hasSources: true },
];

const LIST_PATHS: Record<StockProsesKey, Record<StockSourceKey, string>> = {
  washing: { proses: "/mst-washing/stok", pakai: "/mst-washing/stok" },
  broker: { proses: "/mst-broker/stok", pakai: "/mst-broker/stok" },
  crusher: { proses: "/mst-crusher/stok", pakai: "/mst-crusher/stok" },
  bonggolan: { proses: "/mst-bonggolan/stok", pakai: "/mst-bonggolan/stok" },
  gilingan: { proses: "/mst-gilingan/stok", pakai: "/mst-gilingan/stok" },
  mixer: { proses: "/mst-mixer/stok", pakai: "/mst-mixer/stok" },
  furnitureWip: { proses: "/mst-furniture-wip/stok", pakai: "/mst-furniture-wip/stok" },
  barangJadi: { proses: "/mst-barang-jadi/stok", pakai: "/mst-barang-jadi/stok" },
  reject: { proses: "/reject-type/stok", pakai: "/reject-type/stok" },
  bahanBaku: {
    proses: "/master/bahan-baku/proses/stok",
    pakai: "/master/bahan-baku/pakai/stok",
  },
};

const LABEL_BASE: Record<StockProsesKey, Record<StockSourceKey, string>> = {
  washing: { proses: "/mst-washing", pakai: "/mst-washing" },
  broker: { proses: "/mst-broker", pakai: "/mst-broker" },
  crusher: { proses: "/mst-crusher", pakai: "/mst-crusher" },
  bonggolan: { proses: "/mst-bonggolan", pakai: "/mst-bonggolan" },
  gilingan: { proses: "/mst-gilingan", pakai: "/mst-gilingan" },
  mixer: { proses: "/mst-mixer", pakai: "/mst-mixer" },
  furnitureWip: { proses: "/mst-furniture-wip", pakai: "/mst-furniture-wip" },
  barangJadi: { proses: "/mst-barang-jadi", pakai: "/mst-barang-jadi" },
  reject: { proses: "/reject-type", pakai: "/reject-type" },
  bahanBaku: {
    proses: "/master/bahan-baku/proses",
    pakai: "/master/bahan-baku/pakai",
  },
};

const ITEM_FIELDS: Record<
  StockProsesKey,
  { id: string[]; nama: string[]; sak: string[] | null; berat: string[] | null }
> = {
  washing: { id: ["IdWashing"], nama: ["Nama"], sak: ["SakSisa"], berat: ["BeratSisa"] },
  broker: { id: ["IdBroker", "id_broker"], nama: ["Nama"], sak: ["SakSisa", "sak_sisa"], berat: ["BeratSisa", "berat_sisa"] },
  crusher: { id: ["IdCrusher"], nama: ["NamaCrusher", "Nama"], sak: null, berat: ["BeratSisa"] },
  bonggolan: { id: ["IdBonggolan"], nama: ["NamaBonggolan", "Nama"], sak: null, berat: ["BeratSisa"] },
  gilingan: { id: ["IdGilingan"], nama: ["NamaGilingan", "Nama"], sak: null, berat: ["BeratSisa"] },
  mixer: { id: ["IdMixer"], nama: ["Jenis", "Nama"], sak: ["SakSisa"], berat: ["BeratSisa"] },
  furnitureWip: { id: ["IdCabinetWIP"], nama: ["Nama"], sak: ["PcsSisa"], berat: ["BeratSisa"] },
  barangJadi: { id: ["IdBJ"], nama: ["NamaBJ", "Nama"], sak: ["PcsSisa"], berat: ["BeratSisa"] },
  reject: { id: ["IdReject"], nama: ["NamaReject", "Nama"], sak: null, berat: ["BeratSisa"] },
  bahanBaku: { id: ["IdBB"], nama: ["Nama"], sak: ["SakSisa"], berat: ["BeratSisa"] },
};

const LABEL_FIELDS: Record<
  StockProsesKey,
  { label: string[]; sak: string[] | null; berat: string[] }
> = {
  washing: { label: ["Label", "NoWashing"], sak: ["SakSisa"], berat: ["BeratSisa"] },
  broker: { label: ["Label", "NoBroker"], sak: ["SakSisa"], berat: ["BeratSisa"] },
  crusher: { label: ["Label", "NoCrusher"], sak: null, berat: ["BeratSisa"] },
  bonggolan: { label: ["Label", "NoBonggolan"], sak: null, berat: ["BeratSisa"] },
  gilingan: { label: ["Label", "NoGilingan"], sak: null, berat: ["Berat", "BeratSisa"] },
  mixer: { label: ["Label", "NoMixer"], sak: ["SakSisa"], berat: ["BeratSisa"] },
  furnitureWip: { label: ["Label", "NoFurnitureWIP"], sak: ["Pcs"], berat: ["Berat", "BeratSisa"] },
  barangJadi: { label: ["Label", "NoBJ"], sak: ["Pcs"], berat: ["Berat", "BeratSisa"] },
  reject: { label: ["Label", "NoReject"], sak: null, berat: ["Berat", "BeratSisa"] },
  bahanBaku: { label: ["Label"], sak: ["SakSisa"], berat: ["BeratSisa"] },
};

function pick(rec: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = rec[key];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function int(v: unknown, fallback = 0): number {
  return Math.trunc(num(v, fallback));
}

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function strOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v;
  if (v instanceof Date) return v.toISOString();
  return null;
}

function parseItem(key: StockProsesKey, raw: unknown): StockItemRow | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const fields = ITEM_FIELDS[key];
  return {
    id: int(pick(rec, fields.id)),
    nama: str(pick(rec, fields.nama)),
    labelSisa: int(pick(rec, ["LabelSisa", "label_sisa"])),
    sakSisa: fields.sak ? int(pick(rec, fields.sak)) : 0,
    beratSisa: fields.berat ? num(pick(rec, fields.berat)) : 0,
    dateCreateTertua: strOrNull(pick(rec, ["DateCreateTertua"])),
  };
}

function parseLabel(key: StockProsesKey, raw: unknown): StockLabelRow | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const fields = LABEL_FIELDS[key];
  let label = str(pick(rec, fields.label));
  if (!label && key === "bahanBaku") {
    const no = str(pick(rec, ["NoBahanBaku"]));
    const pallet = pick(rec, ["NoPallet"]);
    if (no) label = pallet != null ? `${no}-${int(pallet)}` : no;
  }
  if (!label) return null;
  return {
    label,
    dateCreate: strOrNull(pick(rec, ["DateCreate"])),
    sakSisa: fields.sak ? int(pick(rec, fields.sak)) : 0,
    beratSisa: num(pick(rec, fields.berat)),
  };
}

function toList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

async function fetchList<T>(
  path: string,
  token: string,
  fallback: string,
  parse: (raw: unknown) => T | null,
): Promise<T[]> {
  const res = await apiFetchAuth<Envelope<unknown>>(path, token);
  if (res.data && res.data.data != null) {
    return toList(res.data.data)
      .map(parse)
      .filter((row): row is T => row !== null);
  }
  throw new ApiRequestError(res.data?.message || fallback);
}

export async function fetchStockItems(
  token: string,
  key: StockProsesKey,
  source: StockSourceKey = "proses",
): Promise<StockItemRow[]> {
  return fetchList(
    LIST_PATHS[key][source],
    token,
    "Gagal memuat stok item",
    (raw) => parseItem(key, raw),
  );
}

export async function fetchStockLabels(
  token: string,
  key: StockProsesKey,
  id: number,
  source: StockSourceKey = "proses",
): Promise<StockLabelRow[]> {
  return fetchList(
    `${LABEL_BASE[key][source]}/${id}/label`,
    token,
    "Gagal memuat label",
    (raw) => parseLabel(key, raw),
  );
}
