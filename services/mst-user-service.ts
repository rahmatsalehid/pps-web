import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type UserRow = {
  idUsername: number;
  username: string;
  fName: string;
  lName: string;
  employeeId: number | string;
  companyId: string;
  nik: string;
  status: string;
  isEnable: boolean;
  groupName: string;
};

export type UserGroup = {
  idUGroup: number;
  uGroupName: string;
};

export type EmployeeRow = {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  companyId: string;
};

export type UserCreateInput = {
  fName: string;
  lName: string;
  username: string;
  password: string;
  employeeId: number;
  companyId: string;
  nik: string;
  idUGroup: number[];
};

export type UserUpdateInput = {
  idUsername: number;
  fName: string;
  lName: string;
  employeeId: number;
  resetPassword: boolean;
  idUGroup: number[];
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

function parseUser(raw: Record<string, unknown>): UserRow {
  const empRaw = raw["EmployeeID"] ?? raw["employeeId"];
  return {
    idUsername: asInt(raw["IdUsername"] ?? raw["idUsername"]),
    username: asStr(raw["Username"] ?? raw["username"]),
    fName: asStr(raw["FName"] ?? raw["fName"]),
    lName: asStr(raw["LName"] ?? raw["lName"]),
    employeeId:
      typeof empRaw === "number" || typeof empRaw === "string" ? empRaw : "",
    companyId: asStr(raw["CompanyID"] ?? raw["companyId"]),
    nik: asStr(raw["Nik"] ?? raw["nik"]),
    status: asStr(raw["Status"] ?? raw["status"]),
    isEnable: asBool(raw["IsEnable"] ?? raw["isEnable"]),
    groupName: asStr(raw["GroupName"] ?? raw["groupName"]),
  };
}

function parseGroup(raw: Record<string, unknown>): UserGroup {
  return {
    idUGroup: asInt(raw["IdUGroup"] ?? raw["idUGroup"]),
    uGroupName: asStr(raw["UGroupName"] ?? raw["uGroupName"]),
  };
}

function parseEmployee(raw: Record<string, unknown>): EmployeeRow {
  return {
    employeeId: asInt(raw["EmployeeID"] ?? raw["employeeId"]),
    employeeCode: asStr(raw["EmployeeCode"] ?? raw["employeeCode"]),
    fullName: asStr(raw["FullName"] ?? raw["fullName"]),
    companyId: asStr(raw["CompanyID"] ?? raw["companyId"]),
  };
}

export async function fetchUsers(
  token: string | undefined,
  q?: string,
): Promise<UserRow[]> {
  const t = requireToken(token);
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-user${query}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data user");
  return rowsOf(res).map(parseUser);
}

export async function fetchUserGroups(
  token: string | undefined,
): Promise<UserGroup[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-user/groups", t);
  await expectOk(res.status, res.data, "Gagal memuat data group permission");
  return rowsOf(res).map(parseGroup);
}

export async function fetchGroupsOfUser(
  token: string | undefined,
  idUsername: number,
): Promise<UserGroup[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-user/${idUsername}/group`, t);
  await expectOk(res.status, res.data, "Gagal memuat group user");
  return rowsOf(res).map(parseGroup);
}

export async function fetchEmployees(
  token: string | undefined,
  db: string,
  q?: string,
): Promise<EmployeeRow[]> {
  const t = requireToken(token);
  const params = new URLSearchParams({ db });
  if (q) params.set("q", q);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-user/employees?${params.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data karyawan");
  return rowsOf(res).map(parseEmployee);
}

export async function createUser(
  token: string | undefined,
  input: UserCreateInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-user", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan data user");
}

export async function updateUser(
  token: string | undefined,
  input: UserUpdateInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-user", t, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal mengubah data user");
}

export async function deleteUser(
  token: string | undefined,
  idUsername: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-user?idUsername=${idUsername}`, t, {
    method: "DELETE",
  });
  await expectOk(res.status, res.data, "Gagal menghapus data user");
}
