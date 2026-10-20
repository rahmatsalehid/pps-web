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

  // Scan/buat DO & edit item butuh penjualan:create (sama dengan tablet).
  let canCreate = false;
  let canDelete = false;
  try {
    const me = await fetchMyPermissions(token);
    canCreate = hasPermission(me.data.permissions, "penjualan:create");
    canDelete = hasPermission(me.data.permissions, "penjualan:delete");
  } catch {
    canCreate = false;
    canDelete = false;
  }

  return <PenjualanWorkspace canScan={canCreate} canCreate={canCreate}
      canDelete={canDelete}
    />;
}
