import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  fetchPbbDetail,
  type PbbDetail,
} from "@/services/penerimaan-bahan-baku-service";
import { PbbDetailWorkspace } from "@/components/production/penerimaan-bahan-baku/pbb-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Penerimaan Bahan Baku • PPS",
};

export default async function PenerimaanBahanBakuDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noPenerimaan = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let detail: PbbDetail | null = null;
  try {
    detail = await fetchPbbDetail(token, noPenerimaan);
  } catch {
    // fallback: workspace memuat ulang lewat action
  }

  return (
    <PbbDetailWorkspace noPenerimaan={noPenerimaan} initialDetail={detail} />
  );
}
