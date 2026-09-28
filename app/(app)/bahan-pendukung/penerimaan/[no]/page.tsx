import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  fetchPbpDetail,
  type PbpDetail,
} from "@/services/penerimaan-bahan-pendukung-service";
import { PbpDetailWorkspace } from "@/components/bahan-pendukung/penerimaan/pbp-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Penerimaan Bahan Pendukung — PPS",
};

export default async function PenerimaanBahanPendukungDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noPenerimaan = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let detail: PbpDetail | null = null;
  try {
    detail = await fetchPbpDetail(token, noPenerimaan);
  } catch {
    // fallback: workspace memuat ulang lewat action
  }

  return (
    <PbpDetailWorkspace
      noPenerimaan={noPenerimaan}
      initialDetail={detail}
    />
  );
}
