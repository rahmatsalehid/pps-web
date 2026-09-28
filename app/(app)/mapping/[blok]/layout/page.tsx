import type { Metadata } from "next";
import { MappingLayoutEditor } from "@/components/mapping/mapping-layout-editor";

export const metadata: Metadata = {
  title: "Edit Layout — PPS",
};

export default async function MappingLayoutEditorPage({
  params,
}: {
  params: Promise<{ blok: string }>;
}) {
  const { blok: raw } = await params;
  const blok = decodeURIComponent(raw);
  return <MappingLayoutEditor blok={blok} />;
}
