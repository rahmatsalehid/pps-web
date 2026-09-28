import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { ReturV3Workspace } from "@/components/warehouse/retur-v3/retur-v3-workspace";

export const metadata: Metadata = {
  title: "Retur v3 — PPS",
};

export default async function ReturV3Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canCreate = false;
  let canUpdate = false;
  let canDecide = false;
  try {
    const me = await fetchMyPermissions(token);
    const perms = me.data.permissions;
    canCreate = hasPermission(perms, "retur:create");
    canUpdate = hasPermission(perms, "retur:update");
    canDecide = hasPermission(perms, "retur:decide");
  } catch {
    canCreate = false;
    canUpdate = false;
    canDecide = false;
  }

  return (
    <ReturV3Workspace canCreate={canCreate} canUpdate={canUpdate} canDecide={canDecide} />
  );
}
