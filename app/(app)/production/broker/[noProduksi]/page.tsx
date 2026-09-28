import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { fetchBrokerOne } from "@/services/broker-service";
import { BrokerDetailWorkspace } from "@/components/production/broker/broker-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Produksi Broker — PPS",
};

export default async function BrokerDetailPage({
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
    header = await fetchBrokerOne(token, noProduksi);
  } catch {
    // fallback: render with noProduksi only
  }

  let canLock = false;
  try {
    const me = await fetchMyPermissions(token);
    canLock = hasPermission(me.data.permissions, "produksi_broker:lock");
  } catch {
    canLock = false;
  }

  if (!header && !noProduksi) notFound();

  return (
    <BrokerDetailWorkspace
      noProduksi={noProduksi}
      initialHeader={header}
      canLock={canLock}
    />
  );
}
