"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createPermItem,
  deletePermGroup,
  deletePermItem,
  fetchPermGroupDetail,
  fetchPermGroupList,
  fetchPermList,
  savePermGroup,
  updatePermItem,
  type PermGroupSaveInput,
} from "@/services/master-permission-group-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPermGroupListAction(filter?: string) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchPermGroupList(token, filter) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPermGroupDetailAction(idUGroup: number) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchPermGroupDetail(token, idUGroup) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPermListAction() {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchPermList(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function savePermGroupAction(
  idUGroup: number | null,
  input: PermGroupSaveInput,
) {
  try {
    const token = await getToken();
    await savePermGroup(token, idUGroup, input);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePermGroupAction(idUGroup: number) {
  try {
    const token = await getToken();
    await deletePermGroup(token, idUGroup);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function savePermItemAction(
  noPermission: string,
  permission: string,
  editMode: boolean,
) {
  try {
    const token = await getToken();
    if (editMode) {
      await updatePermItem(token, noPermission, permission);
    } else {
      await createPermItem(token, noPermission, permission);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePermItemAction(noPermission: string) {
  try {
    const token = await getToken();
    await deletePermItem(token, noPermission);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
