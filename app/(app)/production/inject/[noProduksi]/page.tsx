import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { fetchInjectOne } from "@/services/inject-service";
import { InjectDetailWorkspace } from "@/components/production/inject/inject-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Produksi Inject — PPS",
};

export default async function InjectDetailPage({
  params,
}: {
  params: Promise<{ noProduksi: string }>;
}) {
  const { noProduksi: raw } = await params;
  const noProduksi = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let header = null;
  try {
    header = await fetchInjectOne(token, noProduksi);
  } catch {
    // fallback: render with noProduksi only
  }

  let canLock = false;
  try {
    const me = await fetchMyPermissions(token);
    canLock = hasPermission(me.data.permissions, "injectproduksi:lock");
  } catch {
    canLock = false;
  }

  if (!header && !noProduksi) notFound();

  return (
    <InjectDetailWorkspace
      noProduksi={noProduksi}
      initialHeader={header}
      canLock={canLock}
    />
  );
}
