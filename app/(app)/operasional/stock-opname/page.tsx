import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { SoKategoriWorkspace } from "@/components/operasional/stock-opname/so-kategori-workspace";

export const metadata: Metadata = {
  title: "Stock Opname — PPS",
};

export default async function StockOpnamePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canManage = false;
  try {
    const me = await fetchMyPermissions(token);
    canManage = hasPermission(me.data.permissions, "stockopname:create");
  } catch {
    canManage = false;
  }

  return <SoKategoriWorkspace canManage={canManage} />;
}
