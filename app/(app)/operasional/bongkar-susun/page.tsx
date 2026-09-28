import type { Metadata } from "next";
import { BongkarSusunWorkspace } from "@/components/operasional/bongkar-susun/bongkar-susun-workspace";

export const metadata: Metadata = {
  title: "Bongkar Susun — PPS",
};

export default function BongkarSusunPage() {
  return <BongkarSusunWorkspace />;
}
