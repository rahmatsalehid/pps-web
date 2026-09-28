import type { Metadata } from "next";
import { MappingLokasiView } from "@/components/mapping/mapping-lokasi-view";

export const metadata: Metadata = {
  title: "Layout Blok — PPS",
};

export default async function MappingLokasiPage({
  params,
}: {
  params: Promise<{ blok: string }>;
}) {
  const { blok: raw } = await params;
  const blok = decodeURIComponent(raw);
  return <MappingLokasiView blok={blok} />;
}
