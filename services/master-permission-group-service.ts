import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type PermGroupRow = {
  idUGroup: number;
  uGroupName: string;
  totalAllow: number;
  totalPermission: number;
};

export type PermListItem = {
  noPermission: string;
  permission: string;
};

export type PermGroupPermission = {
  noPermission: string;
  permission: string;
  allow: boolean;
};

export type PermGroupDetail = {
  idUGroup: number;
  uGroupName: string;
  permissions: PermGroupPermission[];
};

export type PermGroupSaveInput = {
  uGroupName: string;
  permissions: { noPermission: string; allow: boolean }[];
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function errMsg(
  data: { message?: string } | null,
  fallback: string,
): string {
  const m = data?.message?.trim();
  if (m && m !== "Internal Server Error") return m;
  return fallback;
}

async function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): Promise<void> {
  if ([200, 201].includes(status) && (!data || data.success !== false)) return;
  throw new ApiRequestError(errMsg(data, fallback));
}

function rowsOf(res: { data: unknown }): Record<string, unknown>[] {
  const d = res.data as { data?: unknown } | null | undefined;
  return Array.isArray(d?.data) ? (d.data as Record<string, unknown>[]) : [];
}

function dataOf(res: { data: unknown }): Record<string, unknown> {
  const d = res.data as { data?: unknown } | null | undefined;
  return d?.data && typeof d.data === "object"
    ? (d.data as Record<string, unknown>)
    : {};
}

const BASE = "/master-permission-group";

export async function fetchPermGroupList(
  token: string | undefined,
  filter?: string,
): Promise<PermGroupRow[]> {
  const t = requireToken(token);
  const query = filter ? `?filter=${encodeURIComponent(filter)}` : "";
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}${query}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data group permission");
  return rowsOf(res).map((row) => ({
    idUGroup: asInt(row["IdUGroup"] ?? row["idUGroup"]),
    uGroupName: asStr(row["UGroupName"] ?? row["uGroupName"]),
    totalAllow: asInt(row["TotalAllow"] ?? row["totalAllow"]),
    totalPermission: asInt(row["TotalPermission"] ?? row["totalPermission"]),
  }));
}

export async function fetchPermGroupDetail(
  token: string | undefined,
  idUGroup: number,
): Promise<PermGroupDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/${idUGroup}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail group permission");
  const d = dataOf(res);
  return {
    idUGroup: asInt(d["IdUGroup"] ?? d["idUGroup"]),
    uGroupName: asStr(d["UGroupName"] ?? d["uGroupName"]),
    permissions: Array.isArray(d["Permissions"])
      ? (d["Permissions"] as Record<string, unknown>[]).map((p) => ({
          noPermission: asStr(p["NoPermission"] ?? p["noPermission"]),
          permission: asStr(p["Permission"] ?? p["permission"]),
          allow: asBool(p["Allow"] ?? p["allow"]),
        }))
      : [],
  };
}

export async function fetchPermList(
  token: string | undefined,
): Promise<PermListItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/permissions`, t);
  await expectOk(res.status, res.data, "Gagal memuat data permission");
  return rowsOf(res).map((row) => ({
    noPermission: asStr(row["NoPermission"] ?? row["noPermission"]),
    permission: asStr(row["Permission"] ?? row["permission"]),
  }));
}

export async function savePermGroup(
  token: string | undefined,
  idUGroup: number | null,
  input: PermGroupSaveInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(idUGroup != null ? `${BASE}/${idUGroup}` : BASE, t, {
    method: idUGroup != null ? "PUT" : "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan group permission");
}

export async function deletePermGroup(
  token: string | undefined,
  idUGroup: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/${idUGroup}`, t, { method: "DELETE" });
  await expectOk(res.status, res.data, "Gagal menghapus group permission");
}

export async function createPermItem(
  token: string | undefined,
  noPermission: string,
  permission: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/permissions`, t, {
    method: "POST",
    body: JSON.stringify({ noPermission, permission }),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan permission");
}

export async function updatePermItem(
  token: string | undefined,
  noPermission: string,
  permission: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/permissions/${encodeURIComponent(noPermission)}`, t, {
    method: "PUT",
    body: JSON.stringify({ noPermission, permission }),
  });
  await expectOk(res.status, res.data, "Gagal mengubah permission");
}

export async function deletePermItem(
  token: string | undefined,
  noPermission: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`${BASE}/permissions/${encodeURIComponent(noPermission)}`, t, {
    method: "DELETE",
  });
  await expectOk(res.status, res.data, "Gagal menghapus permission");
}
