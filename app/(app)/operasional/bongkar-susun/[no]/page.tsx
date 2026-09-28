import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { fetchBsDetail, type BsDetail } from "@/services/bongkar-susun-service";
import { BongkarSusunDetailWorkspace } from "@/components/operasional/bongkar-susun/bongkar-susun-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Bongkar Susun — PPS",
};

export default async function BongkarSusunDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noBongkarSusun = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let detail: BsDetail | null = null;
  try {
    detail = await fetchBsDetail(token, noBongkarSusun);
  } catch {
    // fallback: workspace memuat ulang lewat action
  }

  return (
    <BongkarSusunDetailWorkspace
      noBongkarSusun={noBongkarSusun}
      initialDetail={detail}
    />
  );
}
