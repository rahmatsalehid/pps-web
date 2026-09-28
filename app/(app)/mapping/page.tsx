import type { Metadata } from "next";
import { MappingBlokList } from "@/components/mapping/mapping-blok-list";

export const metadata: Metadata = {
  title: "Mapping — PPS",
};

export default function MappingPage() {
  return <MappingBlokList />;
}
