import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { PenjualanWorkspace } from "@/components/warehouse/penjualan/penjualan-workspace";

export const metadata: Metadata = {
  title: "Penjualan — PPS",
};

export default async function PenjualanPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  // Scan label butuh penjualan:create (sama dengan tablet).
  let canScan = false;
  try {
    const me = await fetchMyPermissions(token);
    canScan = hasPermission(me.data.permissions, "penjualan:create");
  } catch {
    canScan = false;
  }

  return <PenjualanWorkspace canScan={canScan} />;
}
