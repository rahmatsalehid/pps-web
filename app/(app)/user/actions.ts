"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createUser,
  deleteUser,
  fetchEmployees,
  fetchGroupsOfUser,
  fetchUserGroups,
  fetchUsers,
  updateUser,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/services/mst-user-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getUserListAction() {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchUsers(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getUserGroupsAction() {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchUserGroups(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getGroupsOfUserAction(idUsername: number) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchGroupsOfUser(token, idUsername) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getEmployeesAction(db: string, q: string) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchEmployees(token, db, q) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveUserAction(input: UserCreateInput | UserUpdateInput) {
  try {
    const token = await getToken();
    if ("idUsername" in input && input.idUsername) {
      await updateUser(token, input);
    } else {
      await createUser(token, input as UserCreateInput);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteUserAction(idUsername: number) {
  try {
    const token = await getToken();
    await deleteUser(token, idUsername);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
