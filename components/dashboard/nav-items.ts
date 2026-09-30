import type { ComponentType } from "react";
import {
  ArchiveIcon,
  ArrowDownIcon,
  BoxIcon,
  ClipboardIcon,
  ClipboardListIcon,
  CogIcon,
  DiscIcon,
  DropletIcon,
  FileTextIcon,
  FlaskIcon,
  FurnitureIcon,
  GearIcon,
  GrainIcon,
  HammerIcon,
  HistoryIcon,
  HomeIcon,
  KeyIcon,
  LayersIcon,
  MapIcon,
  PackageIcon,
  QrCodeIcon,
  RotateCcwIcon,
  SendIcon,
  ShieldIcon,
  ShoppingCartIcon,
  SwapIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
  UsersIcon,
  WarehouseIcon,
  WrenchIcon,
} from "./icons";

export type NavItem = {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  children?: NavItem[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

// Sub-menu Label mengikuti kategori yang sama dengan backend
// (E:\JOB\API\pps-backend\src\modules\label\*).
const LABEL_CHILDREN: NavItem[] = [
  { label: "Bahan Baku", href: "#", icon: GrainIcon },
  { label: "Bahan Pendukung", href: "#", icon: LayersIcon },
  { label: "Barang Dagang", href: "#", icon: ShoppingCartIcon },
  { label: "Bonggolan", href: "#", icon: PackageIcon },
  { label: "Broker", href: "#", icon: UsersIcon },
  { label: "Crusher", href: "#", icon: HammerIcon },
  { label: "Furniture WIP", href: "#", icon: FurnitureIcon },
  { label: "Gilingan", href: "#", icon: DiscIcon },
  { label: "Mixer", href: "#", icon: GearIcon },
  { label: "Packing", href: "#", icon: BoxIcon },
  { label: "Reject", href: "#", icon: TrashIcon },
  { label: "Washing", href: "#", icon: DropletIcon },
];

const WASHING_BROK: NavItem[] = [
  { label: "Penerimaan Bahan Baku", href: "/production/penerimaan-bahan-baku", icon: TruckIcon },
  { label: "Proses Washing", href: "/production/washing", icon: DropletIcon },
  { label: "Proses Broker", href: "/production/broker", icon: ClipboardIcon },
  { label: "Proses Crusher", href: "/production/crusher", icon: HammerIcon }
];

const PIN_HULU: NavItem[] = [
  { label: "Proses Mixer", href: "/production/mixer", icon: GearIcon },
  { label: "Proses Inject", href: "/production/inject", icon: ArrowDownIcon },
  { label: "Proses Gilingan", href: "/production/gilingan", icon: DiscIcon }
];

const PIN_HILIR: NavItem[] = [
  { label: "Proses Stamping", href: "/production/stamping", icon: HammerIcon },
  { label: "Proses Pasang Kunci", href: "/production/pasang-kunci", icon: KeyIcon },
  { label: "Packing Spanner", href: "/production/spanner", icon: WrenchIcon },
  { label: "Packing", href: "/production/packing", icon: PackageIcon }
];

const WAREHOUSE: NavItem[] = [
  { label: "Penjualan", href: "/warehouse/penjualan", icon: ShoppingCartIcon },
  { label: "Good Transfer", href: "/warehouse/good-transfer", icon: SwapIcon },
  { label: "In Transit", href: "/warehouse/in-transit", icon: SendIcon },
  { label: "Retur v3", href: "/warehouse/retur-v3", icon: RotateCcwIcon },
  { label: "Penerimaan Trade In", href: "/warehouse/trade-in", icon: QrCodeIcon },
  { label: "Penerimaan Barang Dagang", href: "/warehouse/penerimaan-barang-dagang", icon: TruckIcon }
];

// Hanya "Dashboard" yang punya halaman sungguhan sejauh ini — item lain
// masih placeholder (href "#") sampai modulnya dibuat.
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/", icon: HomeIcon },
    ],
  },

  {
    title: "Label",
    items: [
      { label: "Label", href: "#", icon: TagIcon, children: LABEL_CHILDREN }
    ],
  },

  {
    title: "Bahan Pendukung",
    items: [
      { label: "Penerimaan Bahan Pendukung", href: "/bahan-pendukung/penerimaan", icon: TruckIcon}
    ],
  },

{
    title: "Proses Produksi",
    items: [
      { label: "Washing & Broker", href: "#", icon: DropletIcon, children: WASHING_BROK},
      { label: "Pin Hulu", href: "#", icon: FlaskIcon, children: PIN_HULU},
      { label: "Pin Hilir", href: "#", icon: CogIcon, children: PIN_HILIR},
      { label: "Warehouse", href: "#", icon: WarehouseIcon, children: WAREHOUSE}
    ],
  },

  {
    title: "Operasional",
    items: [
      { label: "Stock", href: "/operasional/stock", icon: BoxIcon },
      { label: "Bongkar Susun", href: "/operasional/bongkar-susun", icon: LayersIcon },
      { label: "Sortir Reject", href: "/operasional/sortir-reject", icon: ClipboardIcon },
      { label: "Stock Opname", href: "/operasional/stock-opname", icon: ClipboardListIcon },
      { label: "Stock Opname (Old)", href: "#", icon: ArchiveIcon }
    ],
  },

  {
    title: "Laporan & Monitoring",
    items: [
      { label: "Laporan", href: "#", icon: FileTextIcon },
      { label: "History", href: "#", icon: HistoryIcon },
      { label: "Mapping", href: "/mapping", icon: MapIcon },
    ],
  },
  {
    title: "System",
    items: [
      { label: "User", href: "#", icon: UsersIcon },
      { label: "Role", href: "#", icon: ShieldIcon },
      { label: "Permission", href: "#", icon: KeyIcon },
    ],
  },
];
