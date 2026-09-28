// Data dummy untuk tampilan dashboard — belum terhubung ke backend.

import { BoxIcon, DropletIcon, PackageIcon, TrendingUpIcon } from "./icons";

export const SUMMARY_CARDS = [
  {
    label: "Today's Production",
    value: "12,540 KG",
    icon: TrendingUpIcon,
    highlight: true,
  },
  {
    label: "Raw Material",
    value: "8,240 KG",
    icon: BoxIcon,
    highlight: false,
  },
  {
    label: "Washing",
    value: "4,820 KG",
    icon: DropletIcon,
    highlight: false,
  },
  {
    label: "Packing",
    value: "3,150 KG",
    icon: PackageIcon,
    highlight: false,
  },
];

export type ProductionStatus = "Completed" | "Processing";

export type ProductionActivity = {
  nik: string;
  mesin: string;
  role: string;
  berat: string;
  status: ProductionStatus;
};

export const PRODUCTION_ACTIVITIES: ProductionActivity[] = [
  { nik: "E.00006199", mesin: "M-04", role: "Operator", berat: "1,250 KG", status: "Completed" },
  { nik: "E.00006200", mesin: "M-02", role: "Operator", berat: "980 KG", status: "Processing" },
  { nik: "E.00006201", mesin: "M-01", role: "Supervisor", berat: "640 KG", status: "Completed" },
];
