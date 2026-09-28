import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  fetchPbdDetail,
  type PbdDetail,
} from "@/services/penerimaan-barang-dagang-service";
import { PbdDetailWorkspace } from "@/components/warehouse/penerimaan-barang-dagang/pbd-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Penerimaan Barang Dagang — PPS",
};

export default async function PenerimaanBarangDagangDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noPenerimaan = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let detail: PbdDetail | null = null;
  try {
    detail = await fetchPbdDetail(token, noPenerimaan);
  } catch {
    // fallback: workspace memuat ulang lewat action
  }

  return (
    <PbdDetailWorkspace
      noPenerimaan={noPenerimaan}
      initialDetail={detail}
    />
  );
}
