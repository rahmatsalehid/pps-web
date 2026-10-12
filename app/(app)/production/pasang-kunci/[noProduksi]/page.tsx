import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { fetchPasangKunciOne } from "@/services/pasang-kunci-service";
import { PasangKunciDetailWorkspace } from "@/components/production/pasang-kunci/pasang-kunci-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Produksi Pasang Kunci — PPS",
};

export default async function PasangKunciDetailPage({
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
    header = await fetchPasangKunciOne(token, noProduksi);
  } catch {
    // fallback: render with noProduksi only
  }

  let canLock = false;
  try {
    const me = await fetchMyPermissions(token);
    canLock = hasPermission(me.data.permissions, "pasangkunci:lock");
  } catch {
    canLock = false;
  }

  if (!header && !noProduksi) notFound();

  return (
    <PasangKunciDetailWorkspace
      noProduksi={noProduksi}
      initialHeader={header}
      canLock={canLock}
    />
  );
}
