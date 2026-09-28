import type { Metadata } from "next";
import { MixerWorkspace } from "@/components/production/mixer/mixer-workspace";

export const metadata: Metadata = {
  title: "Proses Mixer — PPS",
};

export default function MixerPage() {
  return <MixerWorkspace />;
}
