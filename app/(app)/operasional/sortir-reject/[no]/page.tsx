import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { fetchSrDetail, type SrTransaction } from "@/services/sortir-reject-service";
import { SortirRejectDetailWorkspace } from "@/components/operasional/sortir-reject/sortir-reject-detail-workspace";

export const metadata: Metadata = {
  title: "Detail Sortir Reject — PPS",
};

export default async function SortirRejectDetailPage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const noSortir = decodeURIComponent(raw);

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  let detail: SrTransaction | null = null;
  try {
    detail = await fetchSrDetail(token, noSortir);
  } catch {
    // fallback: workspace memuat ulang lewat action
  }

  return (
    <SortirRejectDetailWorkspace noSortir={noSortir} initialDetail={detail} />
  );
}
