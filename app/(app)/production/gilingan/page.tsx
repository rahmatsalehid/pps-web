import type { Metadata } from "next";
import { GilinganWorkspace } from "@/components/production/gilingan/gilingan-workspace";

export const metadata: Metadata = {
  title: "Proses Gilingan — PPS",
};

export default function GilinganPage() {
  return <GilinganWorkspace />;
}
