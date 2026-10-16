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
  /** Jika diisi, menu hanya tampil bila user punya permission ini. */
  perm?: string;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

// Sub-menu Label mengikuti kategori yang sama dengan backend
// (E:\JOB\API\pps-backend\src\modules\label\*).
const LABEL_CHILDREN: NavItem[] = [
  { label: "Bahan Baku", href: "/label/bahan-baku", icon: GrainIcon, perm: "label_bahanbaku:read" },
  { label: "Washing", href: "/label/washing", icon: DropletIcon, perm: "label_washing:read" },
  
  { label: "Bonggolan", href: "/label/bonggolan", icon: PackageIcon, perm: "label_bonggolan:read" },
  { label: "Broker", href: "/label/broker", icon: UsersIcon, perm: "label_broker:read" },
  { label: "Crusher", href: "/label/crusher", icon: HammerIcon, perm: "label_crusher:read" },
  { label: "Furniture WIP", href: "/label/furniture-wip", icon: FurnitureIcon, perm: "label_furniturewip:read" },
  { label: "Gilingan", href: "/label/gilingan", icon: DiscIcon, perm: "label_gilingan:read" },
  { label: "Mixer", href: "/label/mixer", icon: GearIcon, perm: "label_mixer:read" },
  { label: "Packing", href: "/label/packing", icon: BoxIcon, perm: "label_barangjadi:read" },
  { label: "Reject", href: "/label/reject", icon: TrashIcon, perm: "label_reject:read" },
  { label: "Bahan Pendukung", href: "#", icon: LayersIcon },
  { label: "Barang Dagang", href: "/label/barang-dagang", icon: ShoppingCartIcon, perm: "label_barangdagang:read" },
  
];

const WASHING_BROK: NavItem[] = [
  { label: "Penerimaan Bahan Baku", href: "/production/penerimaan-bahan-baku", icon: TruckIcon, perm: "penerimaanbahanbaku:read" },
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


const MSTSDM: NavItem[] = [
  { label: "Master Operator & Regu", href: "/master/operator-regu", icon: UsersIcon },
  { label: "Master Cetakan", href: "/master/cetakan", icon: LayersIcon },
  { label: "Master Formula", href: "/master/formula", icon: ClipboardListIcon },
  { label: "Blok & Lokasi", href: "/master/blok-lokasi", icon: MapIcon }
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
      { label: "Stock Opname (Old)", href: "/operasional/stock-opname-old", icon: ArchiveIcon }
    ],
  },



  {
    title: "SPK",
    items: [
      { label: "SPK Produksi Barang Jadi", href: "/production/spk-barang-jadi", icon: ClipboardListIcon }
    ],
  },  

  

  {
    title: "Laporan & Monitoring",
    items: [
      { label: "Laporan", href: "/laporan", icon: FileTextIcon, perm: "laporan:read" },
      { label: "History", href: "#", icon: HistoryIcon },
      { label: "Mapping", href: "/mapping", icon: MapIcon },
    ],
  },

  {
    title: "Master",
    items: [
      { label: "SDM & Produksi", href: "#", icon: FileTextIcon, children: MSTSDM}
    ],
  },




  {
    title: "System",
    items: [
      { label: "User", href: "/user", icon: UsersIcon },
      { label: "Role", href: "/master/permission-group", icon: ShieldIcon },
      { label: "Permission", href: "#", icon: KeyIcon },
    ],
  },
];
