import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type StokItem = {
  idBB: number;
  nama: string;
  sakSisa: number;
  beratSisa: number;
  dateCreateTertua: string | null;
};

export type StokLabelItem = {
  noBahanBaku: string;
  noPallet: number;
  label: string;
  sakSisa: number;
  beratSisa: number;
  dateCreate: string | null;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function asDateStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v);
  return s;
}

function pickFirst(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return undefined;
}

function mapStokItem(raw: unknown): StokItem {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    idBB: asInt(
      pickFirst(j, [
        "IdWashing",
        "idWashing",
        "IdCrusher",
        "idCrusher",
        "IdBroker",
        "idBroker",
        "IdMixer",
        "idMixer",
        "IdReject",
        "idReject",
        "IdBB",
        "idBB",
        "id_bb",
      ]),
    ),
    nama: asStr(pickFirst(j, ["NamaCrusher", "namaCrusher", "NamaBroker", "NamaReject", "namaReject", "Nama", "nama", "Jenis", "jenis"])),
    sakSisa: asInt(pickFirst(j, ["SakSisa", "sakSisa", "sak_sisa"])),
    beratSisa: asNum(pickFirst(j, ["BeratSisa", "beratSisa", "berat_sisa"])),
    dateCreateTertua: asDateStr(
      pickFirst(j, ["DateCreateTertua", "dateCreateTertua", "date_create_tertua"]),
    ),
  };
}

function mapStokLabel(raw: unknown): StokLabelItem {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    noBahanBaku: asStr(
      pickFirst(j, ["NoWashing", "noWashing", "NoCrusher", "noCrusher", "NoBroker", "noBroker", "NoMixer", "noMixer", "NoReject", "noReject", "NoBahanBaku", "noBahanBaku"]),
    ),
    noPallet: asInt(pickFirst(j, ["NoPallet", "noPallet"])),
    label: asStr(pickFirst(j, ["Label", "label", "NoWashing", "NoCrusher", "NoBroker", "NoMixer", "NoReject"])),
    sakSisa: asInt(pickFirst(j, ["SakSisa", "sakSisa"])),
    beratSisa: asNum(pickFirst(j, ["BeratSisa", "beratSisa"])),
    dateCreate: asDateStr(pickFirst(j, ["DateCreate", "dateCreate"])),
  };
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const inner = (data as { data?: unknown }).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/** GET /master/bahan-baku/proses/stok — backend: { success, data: [...] } */
export async function fetchStokBahanBakuProses(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    "/master/bahan-baku/proses/stok",
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok item (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /master/bahan-baku/proses/:idbahanbaku/label */
export async function fetchStokBahanBakuProsesLabel(
  token: string | undefined,
  idBB: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/master/bahan-baku/proses/${idBB}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label stok (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Bonggolan (tab Stok Item Crusher) ───────────────────────────────────

export type BonggolanStokItem = {
  idBonggolan: number;
  nama: string;
  beratSisa: number;
  dateCreateTertua: string | null;
};

export type BonggolanStokLabel = {
  noBonggolan: string;
  label: string;
  dateCreate: string | null;
  beratSisa: number;
};

function mapBonggolanStok(raw: unknown): BonggolanStokItem {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    idBonggolan: asInt(pickFirst(j, ["IdBonggolan", "idBonggolan"])),
    nama: asStr(pickFirst(j, ["NamaBonggolan", "Nama", "nama"])),
    beratSisa: asNum(pickFirst(j, ["BeratSisa", "beratSisa"])),
    dateCreateTertua: asDateStr(
      pickFirst(j, ["DateCreateTertua", "dateCreateTertua"]),
    ),
  };
}

function mapBonggolanLabel(raw: unknown): BonggolanStokLabel {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    noBonggolan: asStr(pickFirst(j, ["NoBonggolan", "noBonggolan"])),
    label: asStr(pickFirst(j, ["Label", "label", "NoBonggolan"])),
    dateCreate: asDateStr(pickFirst(j, ["DateCreate", "dateCreate"])),
    beratSisa: asNum(pickFirst(j, ["BeratSisa", "beratSisa"])),
  };
}

/** GET /master/bonggolan/stok */
export async function fetchStokBonggolan(
  token: string | undefined,
): Promise<BonggolanStokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/master/bonggolan/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok bonggolan (${res.status})`);
  }
  return unwrapList(res.data).map(mapBonggolanStok);
}

/** GET /master/bonggolan/:idbonggolan/label */
export async function fetchStokBonggolanLabel(
  token: string | undefined,
  idBonggolan: number,
): Promise<BonggolanStokLabel[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/master/bonggolan/${idBonggolan}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label bonggolan (${res.status})`);
  }
  return unwrapList(res.data).map(mapBonggolanLabel);
}

// ── Stok Washing (drawer Proses Broker) ──────────────────────────────────────

/** GET /mst-washing/stok */
export async function fetchStokWashing(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/mst-washing/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok washing (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /mst-washing/:idwashing/label */
export async function fetchStokWashingLabel(
  token: string | undefined,
  idWashing: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/mst-washing/${idWashing}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label washing (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Crusher (drawer Proses Broker) ──────────────────────────────────────

/** GET /mst-crusher/stok */
export async function fetchStokCrusher(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/mst-crusher/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok crusher (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /mst-crusher/:idcrusher/label */
export async function fetchStokCrusherLabel(
  token: string | undefined,
  idCrusher: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/mst-crusher/${idCrusher}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label crusher (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Bahan Baku Pakai (drawer Proses Mixer) ──────────────────────────────

/** GET /master/bahan-baku/pakai/stok */
export async function fetchStokBahanBakuPakai(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    "/master/bahan-baku/pakai/stok",
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok bahan baku pakai (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /master/bahan-baku/pakai/:idbahanbaku/label */
export async function fetchStokBahanBakuPakaiLabel(
  token: string | undefined,
  idBB: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/master/bahan-baku/pakai/${idBB}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label bahan baku pakai (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Broker (drawer Proses Mixer) ────────────────────────────────────────

/** GET /mst-broker/stok */
export async function fetchStokBroker(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/mst-broker/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok broker (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /mst-broker/:idbroker/label */
export async function fetchStokBrokerLabel(
  token: string | undefined,
  idBroker: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/mst-broker/${idBroker}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label broker (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Mixer (drawer Proses Inject) ────────────────────────────────────────

/** GET /mst-mixer/stok */
export async function fetchStokMixer(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/mst-mixer/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok mixer (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /mst-mixer/:idmixer/label */
export async function fetchStokMixerLabel(
  token: string | undefined,
  idMixer: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(`/mst-mixer/${idMixer}/label`, t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label mixer (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}

// ── Stok Reject (drawer Proses Gilingan — tablet: Reject only) ───────────────

/** GET /reject-type/stok */
export async function fetchStokReject(
  token: string | undefined,
): Promise<StokItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>("/reject-type/stok", t);
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok reject (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokItem);
}

/** GET /reject-type/:idreject/label */
export async function fetchStokRejectLabel(
  token: string | undefined,
  idReject: number,
): Promise<StokLabelItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<unknown>(
    `/reject-type/${idReject}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label reject (${res.status})`);
  }
  return unwrapList(res.data).map(mapStokLabel);
}
