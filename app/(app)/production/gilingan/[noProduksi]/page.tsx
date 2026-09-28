import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { fetchGilinganOne } from "@/services/gilingan-service";
import { GilinganDetailWorkspace } from "@/components/production/gilingan/gilingan-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Produksi Gilingan — PPS",
};

export default async function GilinganDetailPage({
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
    header = await fetchGilinganOne(token, noProduksi);
  } catch {
    // fallback: render with noProduksi only
  }

  let canLock = false;
  try {
    const me = await fetchMyPermissions(token);
    canLock = hasPermission(me.data.permissions, "produksi_gilingan:lock");
  } catch {
    canLock = false;
  }

  if (!header && !noProduksi) notFound();

  return (
    <GilinganDetailWorkspace
      noProduksi={noProduksi}
      initialHeader={header}
      canLock={canLock}
    />
  );
}
