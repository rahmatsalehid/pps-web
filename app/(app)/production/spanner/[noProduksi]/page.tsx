import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_TOKEN_COOKIE,
  fetchMyPermissions,
  hasPermission,
} from "@/services/auth-service";
import { fetchSpannerOne } from "@/services/spanner-service";
import { SpannerDetailWorkspace } from "@/components/production/spanner/spanner-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Produksi Spanner — PPS",
};

export default async function SpannerDetailPage({
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
    header = await fetchSpannerOne(token, noProduksi);
  } catch {
    // fallback: render with noProduksi only
  }

  let canLock = false;
  try {
    const me = await fetchMyPermissions(token);
    canLock = hasPermission(me.data.permissions, "produksi_spanner:lock");
  } catch {
    canLock = false;
  }

  if (!header && !noProduksi) notFound();

  return (
    <SpannerDetailWorkspace
      noProduksi={noProduksi}
      initialHeader={header}
      canLock={canLock}
    />
  );
}
