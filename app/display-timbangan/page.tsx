import type { Metadata } from "next";
import { PbbDisplayView } from "@/components/production/penerimaan-bahan-baku/pbb-display-view";

export const metadata: Metadata = {
  title: "Display Timbangan • PPS",
};

export default function DisplayTimbanganPage() {
  return <PbbDisplayView />;
}
