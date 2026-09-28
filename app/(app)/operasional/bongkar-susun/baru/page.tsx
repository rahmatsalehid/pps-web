import type { Metadata } from "next";
import { BongkarSusunCreateWorkspace } from "@/components/operasional/bongkar-susun/bongkar-susun-create-workspace";

export const metadata: Metadata = {
  title: "Buat Bongkar Susun — PPS",
};

export default function BongkarSusunCreatePage() {
  return <BongkarSusunCreateWorkspace />;
}
