import type { Metadata } from "next";
import { SpannerWorkspace } from "@/components/production/spanner/spanner-workspace";

export const metadata: Metadata = {
  title: "Proses Packing Spanner — PPS",
};

export default function SpannerPage() {
  return <SpannerWorkspace />;
}
