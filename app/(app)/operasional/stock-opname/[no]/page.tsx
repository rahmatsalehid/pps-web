import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { SoDetailWorkspace } from "@/components/operasional/stock-opname/so-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Stock Opname — PPS",
};

export default async function StockOpnameDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const stockOpnameNo = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let canManage = false;
  try {
    const me = await fetchMyPermissions(token);
    canManage = hasPermission(me.data.permissions, "stockopname:create");
  } catch {
    canManage = false;
  }

  return (
    <SoDetailWorkspace stockOpnameNo={stockOpnameNo} canManage={canManage} />
  );
}
