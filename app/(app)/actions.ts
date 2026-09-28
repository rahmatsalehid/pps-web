"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/services/auth-service";

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_TOKEN_COOKIE);
  cookieStore.delete(AUTH_USER_COOKIE);
  redirect("/login");
}
