export type LaporanField =
  | {
      key: string;
      label: string;
      type: "date";
      default: string;
    }
  | {
      key: string;
      label: string;
      type: "number";
      default: number;
    }
  | {
      key: string;
      label: string;
      type: "select";
      default: string;
      optionsSource?: "warehouse";
      options?: { value: string; label: string }[];
    };

export type LaporanSpec = {
  kode: string;
  title: string;
  endpoint: string;
  fields: LaporanField[];
  kind?: "grid" | "pdf";
};

export type LaporanItem = {
  title: string;
  kode?: string;
};

export type LaporanKategori = {
  nama: string;
  ikon: string;
  items: LaporanItem[];
};

export const LAPORAN_KATEGORI: LaporanKategori[] = [
  {
    nama: "Bahan Baku",
    ikon: "📦",
    items: [
      { title: "Stok Bahan Baku", kode: "stok-bahan-baku" },
      { title: "Mutasi Bahan Baku", kode: "mutasi-bahan-baku" },
      { title: "Penerimaan Bahan Baku", kode: "penerimaan-bahan-baku" },
      { title: "Kartu Stok Bahan Baku", kode: "kartu-stok-bahan-baku" },
      { title: "Stock Opname Bahan Baku" },
      { title: "Umur Bahan Baku", kode: "umur-bahan-baku" },
    ],
  },
  {
    nama: "Washing",
    ikon: "🧼",
    items: [
      { title: "Stok Washing", kode: "stok-washing" },
      { title: "Mutasi Washing", kode: "mutasi-washing" },
      { title: "Produksi Washing", kode: "produksi-washing" },
      { title: "Stock Opname Washing" },
      { title: "Umur Washing", kode: "umur-washing" },
    ],
  },
  {
    nama: "Broker",
    ikon: "🔗",
    items: [
      { title: "Stok Broker", kode: "stok-broker" },
      { title: "Mutasi Broker", kode: "mutasi-broker" },
      { title: "Produksi Broker", kode: "produksi-broker" },
      { title: "Stock Opname Broker" },
      { title: "Umur Broker", kode: "umur-broker" },
      { title: "Stok Broker QC", kode: "stok-broker-qc" },
    ],
  },
  {
    nama: "Bonggolan",
    ikon: "🪨",
    items: [
      { title: "Stok Bonggolan", kode: "stok-bonggolan" },
      { title: "Stock Opname Bonggolan" },
      { title: "Umur Bonggolan", kode: "umur-bonggolan" },
    ],
  },
  {
    nama: "Crusher",
    ikon: "⚙️",
    items: [
      { title: "Stok Crusher", kode: "stok-crusher" },
      { title: "Mutasi Crusher", kode: "mutasi-crusher" },
      { title: "Produksi Crusher", kode: "produksi-crusher" },
      { title: "Stock Opname Crusher" },
      { title: "Umur Crusher", kode: "umur-crusher" },
    ],
  },
  {
    nama: "Gilingan",
    ikon: "🌾",
    items: [
      { title: "Stok Gilingan", kode: "stok-gilingan" },
      { title: "Mutasi Gilingan", kode: "mutasi-gilingan" },
      { title: "Produksi Gilingan", kode: "produksi-gilingan" },
      { title: "Stock Opname Gilingan" },
      { title: "Umur Gilingan", kode: "umur-gilingan" },
    ],
  },
  {
    nama: "Mixer",
    ikon: "🔄",
    items: [
      { title: "Stok Mixer (Per Jenis)", kode: "stok-mixer" },
      { title: "Mutasi Mixer", kode: "mutasi-mixer" },
      { title: "Produksi Mixer", kode: "produksi-mixer" },
      { title: "Stock Opname Mixer" },
      { title: "Umur Mixer", kode: "umur-mixer" },
    ],
  },
  {
    nama: "Reject",
    ikon: "❌",
    items: [
      { title: "Stok Reject", kode: "stok-reject" },
      { title: "Mutasi Reject", kode: "mutasi-reject" },
      { title: "Stock Opname" },
    ],
  },
  {
    nama: "Furniture WIP",
    ikon: "🪑",
    items: [
      { title: "Stok Furniture WIP", kode: "stok-furniture-wip" },
      { title: "Mutasi Furniture WIP", kode: "mutasi-furniture-wip" },
    ],
  },
  {
    nama: "Barang Jadi",
    ikon: "📊",
    items: [
      { title: "Stok Barang Jadi", kode: "stok-barang-jadi" },
      { title: "Mutasi Barang Jadi", kode: "mutasi-barang-jadi" },
    ],
  },
  {
    nama: "Rekap Produksi",
    ikon: "📈",
    items: [
      { title: "Rekap Washing", kode: "rekap-washing" },
      { title: "Rekap Broker", kode: "rekap-broker" },
      { title: "Rekap Crusher", kode: "rekap-crusher" },
      { title: "Rekap Gilingan", kode: "rekap-gilingan" },
      { title: "Rekap Mixer", kode: "rekap-mixer" },
      { title: "Rekap Inject Barang Jadi", kode: "rekap-inject-bj" },
      { title: "Rekap Inject FWIP", kode: "rekap-inject-fwip" },
      { title: "Rekap Packing", kode: "rekap-packing" },
      { title: "Rekap Hot Stamping", kode: "rekap-hot-stamping" },
      { title: "Rekap Pasang Kunci", kode: "rekap-pasang-kunci" },
      { title: "Rekap Spanner", kode: "rekap-spanner" },
    ],
  },
  {
    nama: "Semua Laporan",
    ikon: "📋",
    items: [
      { title: "Semua Label", kode: "semua-label" },
      { title: "Rekap Produksi Harian", kode: "rekap-harian" },
      { title: "Dashboard Produktifitas", kode: "dashboard-produktifitas" },
      { title: "Hasil Produksi", kode: "hasil-produksi" },
      { title: "Produktivitas Washing", kode: "produktivitas-washing" },
      { title: "Produktivitas Broker", kode: "produktivitas-broker" },
      { title: "Laporan Bongkar Susun", kode: "bongkar-susun" },
      { title: "Laporan Sortir Reject", kode: "sortir-reject" },
    ],
  },
];

const STOK_FIELDS: LaporanField[] = [
  { key: "tglAkhir", label: "Tanggal", type: "date", default: "today" },
  {
    key: "warehouse",
    label: "Warehouse",
    type: "select",
    default: "ALL",
    optionsSource: "warehouse",
  },
];

const MUTASI_FIELDS: LaporanField[] = [
  { key: "tglAwal", label: "Tanggal Awal", type: "date", default: "monthStart" },
  { key: "tglAkhir", label: "Tanggal Akhir", type: "date", default: "today" },
];

const UMUR_FIELDS: LaporanField[] = [
  { key: "umur1", label: "Periode 1 (hari)", type: "number", default: 30 },
  { key: "umur2", label: "Periode 2 (hari)", type: "number", default: 60 },
  { key: "umur3", label: "Periode 3 (hari)", type: "number", default: 90 },
  { key: "umur4", label: "Periode 4 (hari)", type: "number", default: 120 },
  { key: "umur5", label: "Periode 5 (hari)", type: "number", default: 150 },
];

const stokSpec = (kode: string, title: string, jenis: string): LaporanSpec => ({
  kode,
  title,
  endpoint: `/laporan/stok/${jenis}`,
  fields: STOK_FIELDS,
});

const mutasiSpec = (kode: string, title: string, jenis: string): LaporanSpec => ({
  kode,
  title,
  endpoint: `/laporan/mutasi/${jenis}`,
  fields: MUTASI_FIELDS,
});

const umurSpec = (kode: string, title: string, jenis: string): LaporanSpec => ({
  kode,
  title,
  endpoint: `/laporan/umur/${jenis}`,
  fields: UMUR_FIELDS,
});

const produksiSpec = (kode: string, title: string, jenis: string): LaporanSpec => ({
  kode,
  title,
  endpoint: `/laporan/produksi/${jenis}`,
  fields: MUTASI_FIELDS,
});

const rekapSpec = (kode: string, title: string, jenis: string): LaporanSpec => ({
  kode,
  title,
  endpoint: `/laporan/rekap/${jenis}`,
  fields: [{ key: "tglAkhir", label: "Tanggal", type: "date", default: "today" }],
});

export const LAPORAN_REGISTRY: Record<string, LaporanSpec> = {
  "stok-bahan-baku": {
    kode: "stok-bahan-baku",
    title: "Stok Bahan Baku",
    endpoint: "/laporan/bahan-baku/stok",
    fields: [
      { key: "tglAkhir", label: "Tanggal", type: "date", default: "today" },
      {
        key: "warehouse",
        label: "Warehouse",
        type: "select",
        default: "ALL",
        optionsSource: "warehouse",
      },
    ],
  },
  "mutasi-bahan-baku": {
    kode: "mutasi-bahan-baku",
    title: "Mutasi Bahan Baku",
    endpoint: "/laporan/bahan-baku/mutasi",
    fields: [
      { key: "tglAwal", label: "Tanggal Awal", type: "date", default: "monthStart" },
      { key: "tglAkhir", label: "Tanggal Akhir", type: "date", default: "today" },
    ],
  },
  "penerimaan-bahan-baku": {
    kode: "penerimaan-bahan-baku",
    title: "Penerimaan Bahan Baku",
    endpoint: "/laporan/bahan-baku/penerimaan",
    fields: [
      { key: "tglAwal", label: "Tanggal Awal", type: "date", default: "monthStart" },
      { key: "tglAkhir", label: "Tanggal Akhir", type: "date", default: "today" },
    ],
  },
  "kartu-stok-bahan-baku": {
    kode: "kartu-stok-bahan-baku",
    title: "Kartu Stok Bahan Baku",
    endpoint: "/laporan/bahan-baku/kartu-stok",
    fields: [
      { key: "tglAwal", label: "Tanggal Awal", type: "date", default: "monthStart" },
      { key: "tglAkhir", label: "Tanggal Akhir", type: "date", default: "today" },
    ],
  },
  "umur-bahan-baku": {
    kode: "umur-bahan-baku",
    title: "Umur Bahan Baku",
    endpoint: "/laporan/bahan-baku/umur",
    fields: UMUR_FIELDS,
  },
  "stok-washing": stokSpec("stok-washing", "Stok Washing", "washing"),
  "stok-broker": stokSpec("stok-broker", "Stok Broker", "broker"),
  "stok-bonggolan": stokSpec("stok-bonggolan", "Stok Bonggolan", "bonggolan"),
  "stok-crusher": stokSpec("stok-crusher", "Stok Crusher", "crusher"),
  "stok-gilingan": stokSpec("stok-gilingan", "Stok Gilingan", "gilingan"),
  "stok-mixer": stokSpec("stok-mixer", "Stok Mixer (Per Jenis)", "mixer"),
  "stok-furniture-wip": stokSpec("stok-furniture-wip", "Stok Furniture WIP", "furniture-wip"),
  "stok-barang-jadi": stokSpec("stok-barang-jadi", "Stok Barang Jadi", "barang-jadi"),
  "stok-reject": {
    kode: "stok-reject",
    title: "Stok Reject",
    endpoint: "/laporan/reject/stok",
    fields: STOK_FIELDS,
  },
  "mutasi-washing": mutasiSpec("mutasi-washing", "Mutasi Washing", "washing"),
  "mutasi-broker": mutasiSpec("mutasi-broker", "Mutasi Broker", "broker"),
  "mutasi-crusher": mutasiSpec("mutasi-crusher", "Mutasi Crusher", "crusher"),
  "mutasi-gilingan": mutasiSpec("mutasi-gilingan", "Mutasi Gilingan", "gilingan"),
  "mutasi-mixer": mutasiSpec("mutasi-mixer", "Mutasi Mixer", "mixer"),
  "mutasi-reject": mutasiSpec("mutasi-reject", "Mutasi Reject", "reject"),
  "mutasi-furniture-wip": mutasiSpec("mutasi-furniture-wip", "Mutasi Furniture WIP", "furniture-wip"),
  "mutasi-barang-jadi": mutasiSpec("mutasi-barang-jadi", "Mutasi Barang Jadi", "barang-jadi"),
  "umur-washing": umurSpec("umur-washing", "Umur Washing", "washing"),
  "umur-broker": umurSpec("umur-broker", "Umur Broker", "broker"),
  "umur-bonggolan": umurSpec("umur-bonggolan", "Umur Bonggolan", "bonggolan"),
  "umur-crusher": umurSpec("umur-crusher", "Umur Crusher", "crusher"),
  "umur-gilingan": umurSpec("umur-gilingan", "Umur Gilingan", "gilingan"),
  "umur-mixer": umurSpec("umur-mixer", "Umur Mixer", "mixer"),
  "produksi-washing": produksiSpec("produksi-washing", "Produksi Washing", "washing"),
  "produksi-broker": produksiSpec("produksi-broker", "Produksi Broker", "broker"),
  "produksi-crusher": produksiSpec("produksi-crusher", "Produksi Crusher", "crusher"),
  "produksi-gilingan": produksiSpec("produksi-gilingan", "Produksi Gilingan", "gilingan"),
  "produksi-mixer": produksiSpec("produksi-mixer", "Produksi Mixer", "mixer"),
  "rekap-washing": rekapSpec("rekap-washing", "Rekap Washing", "washing"),
  "rekap-broker": rekapSpec("rekap-broker", "Rekap Broker", "broker"),
  "rekap-crusher": rekapSpec("rekap-crusher", "Rekap Crusher", "crusher"),
  "rekap-gilingan": rekapSpec("rekap-gilingan", "Rekap Gilingan", "gilingan"),
  "rekap-mixer": rekapSpec("rekap-mixer", "Rekap Mixer", "mixer"),
  "rekap-inject-bj": rekapSpec("rekap-inject-bj", "Rekap Inject Barang Jadi", "inject-bj"),
  "rekap-inject-fwip": rekapSpec("rekap-inject-fwip", "Rekap Inject FWIP", "inject-fwip"),
  "rekap-packing": rekapSpec("rekap-packing", "Rekap Packing", "packing"),
  "rekap-hot-stamping": rekapSpec("rekap-hot-stamping", "Rekap Hot Stamping", "hot-stamping"),
  "rekap-pasang-kunci": rekapSpec("rekap-pasang-kunci", "Rekap Pasang Kunci", "pasang-kunci"),
  "rekap-spanner": rekapSpec("rekap-spanner", "Rekap Spanner", "spanner"),
  "semua-label": {
    kode: "semua-label",
    title: "Semua Label",
    endpoint: "/laporan/semua-label",
    fields: [],
  },
  "rekap-harian": {
    kode: "rekap-harian",
    title: "Rekap Produksi Harian",
    endpoint: "/laporan/rekap-harian",
    fields: [
      {
        key: "jenis",
        label: "Jenis Rekap",
        type: "select",
        default: "inject-bj",
        options: [
          { value: "inject-bj", label: "Inject Barang Jadi" },
          { value: "inject-fwip", label: "Inject FWIP" },
          { value: "packing", label: "Packing" },
          { value: "hot-stamping", label: "Hot Stamping" },
          { value: "pasang-kunci", label: "Pasang Kunci" },
          { value: "spanner", label: "Spanner" },
        ],
      },
      { key: "tglAkhir", label: "Tanggal", type: "date", default: "today" },
    ],
  },
  "dashboard-produktifitas": {
    kode: "dashboard-produktifitas",
    title: "Dashboard Produktifitas",
    endpoint: "/laporan/dashboard-produktifitas",
    fields: [{ key: "tglAkhir", label: "Tanggal", type: "date", default: "today" }],
  },
  "hasil-produksi": {
    kode: "hasil-produksi",
    title: "Hasil Produksi",
    endpoint: "/laporan/hasil-produksi",
    fields: MUTASI_FIELDS,
  },
  "produktivitas-washing": {
    kode: "produktivitas-washing",
    title: "Produktivitas Washing",
    endpoint: "/laporan/produktivitas/washing",
    fields: MUTASI_FIELDS,
  },
  "produktivitas-broker": {
    kode: "produktivitas-broker",
    title: "Produktivitas Broker",
    endpoint: "/laporan/produktivitas/broker",
    fields: MUTASI_FIELDS,
  },
  "bongkar-susun": {
    kode: "bongkar-susun",
    title: "Laporan Bongkar Susun",
    endpoint: "",
    kind: "pdf",
    fields: [
      { key: "startDate", label: "Tanggal Awal", type: "date", default: "monthStart" },
      { key: "endDate", label: "Tanggal Akhir", type: "date", default: "today" },
    ],
  },
  "sortir-reject": {
    kode: "sortir-reject",
    title: "Laporan Sortir Reject",
    endpoint: "",
    kind: "pdf",
    fields: [
      { key: "startDate", label: "Tanggal Awal", type: "date", default: "monthStart" },
      { key: "endDate", label: "Tanggal Akhir", type: "date", default: "today" },
    ],
  },
  "stok-broker-qc": {
    kode: "stok-broker-qc",
    title: "Stok Broker QC",
    endpoint: "",
    kind: "pdf",
    fields: [{ key: "tglAkhir", label: "Tanggal", type: "date", default: "today" }],
  },
};
