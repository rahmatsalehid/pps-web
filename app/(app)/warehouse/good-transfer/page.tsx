import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { GoodTransferWorkspace } from "@/components/warehouse/good-transfer/good-transfer-workspace";

export const metadata: Metadata = {
  title: "Good Transfer — PPS",
};

export default async function GoodTransferPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  // Scan/undo/kirim butuh goods_transfer:update (sama dengan tablet).
  let canUpdate = false;
  try {
    const me = await fetchMyPermissions(token);
    canUpdate = hasPermission(me.data.permissions, "goods_transfer:update");
  } catch {
    canUpdate = false;
  }

  return <GoodTransferWorkspace canUpdate={canUpdate} />;
}
