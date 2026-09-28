import { NAV_SECTIONS, type NavItem } from "./nav-items";

export type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

export type NavMeta = {
  title: string;
  subtitle: string;
  crumbs: BreadcrumbCrumb[];
};

const ROOT_CRUMB: BreadcrumbCrumb = { label: "Dashboard", href: "/" };

function matchHref(pathname: string, href: string): boolean {
  if (!href || href === "#") return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavMatch = {
  /** rantai item dari parent → leaf */
  chain: NavItem[];
  /** seberapa dalam kecocokannya (makin panjang href makin spesifik) */
  score: number;
};

function findBestMatch(pathname: string): NavMatch | null {
  let best: NavMatch | null = null;

  const walk = (items: NavItem[], chain: NavItem[]) => {
    for (const item of items) {
      const nextChain = [...chain, item];
      if (matchHref(pathname, item.href)) {
        const score = item.href.length;
        if (!best || score > best.score) {
          best = { chain: nextChain, score };
        }
      }
      if (item.children?.length) walk(item.children, nextChain);
    }
  };

  for (const section of NAV_SECTIONS) {
    walk(section.items, []);
  }

  return best;
}

/** Resolusi judul header + breadcrumb dari pathname. */
export function resolveNavMeta(pathname: string): NavMeta {
  const path = pathname || "/";

  // Detail washing: /production/washing/<noProduksi>
  const washingDetail = /^\/production\/washing\/(.+)$/.exec(path);
  const washingListMatch =
    path === "/production/washing" || path.startsWith("/production/washing/");

  if (washingDetail && washingDetail[1]) {
    const noProduksi = decodeURIComponent(washingDetail[1]);
    return {
      title: "Proses Washing",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/washing" },
        { label: "Proses Washing", href: "/production/washing" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (washingListMatch) {
    return {
      title: "Proses Washing",
      subtitle: "Washing & Broker",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/washing" },
        { label: "Proses Washing", href: "/production/washing" },
      ],
    };
  }

  // Detail crusher: /production/crusher/<noProduksi>
  const crusherDetail = /^\/production\/crusher\/(.+)$/.exec(path);
  const crusherListMatch =
    path === "/production/crusher" || path.startsWith("/production/crusher/");

  if (crusherDetail && crusherDetail[1]) {
    const noProduksi = decodeURIComponent(crusherDetail[1]);
    return {
      title: "Proses Crusher",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/crusher" },
        { label: "Proses Crusher", href: "/production/crusher" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (crusherListMatch) {
    return {
      title: "Proses Crusher",
      subtitle: "Washing & Broker",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/crusher" },
        { label: "Proses Crusher", href: "/production/crusher" },
      ],
    };
  }

  // Detail mixer: /production/mixer/<noProduksi>
  const mixerDetail = /^\/production\/mixer\/(.+)$/.exec(path);
  const mixerListMatch =
    path === "/production/mixer" || path.startsWith("/production/mixer/");

  if (mixerDetail && mixerDetail[1]) {
    const noProduksi = decodeURIComponent(mixerDetail[1]);
    return {
      title: "Proses Mixer",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/mixer" },
        { label: "Proses Mixer", href: "/production/mixer" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (mixerListMatch) {
    return {
      title: "Proses Mixer",
      subtitle: "Pin Hulu",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/mixer" },
        { label: "Proses Mixer", href: "/production/mixer" },
      ],
    };
  }

  // Detail gilingan: /production/gilingan/<noProduksi>
  const gilinganDetail = /^\/production\/gilingan\/(.+)$/.exec(path);
  const gilinganListMatch =
    path === "/production/gilingan" || path.startsWith("/production/gilingan/");

  if (gilinganDetail && gilinganDetail[1]) {
    const noProduksi = decodeURIComponent(gilinganDetail[1]);
    return {
      title: "Proses Gilingan",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/gilingan" },
        { label: "Proses Gilingan", href: "/production/gilingan" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (gilinganListMatch) {
    return {
      title: "Proses Gilingan",
      subtitle: "Pin Hulu",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/gilingan" },
        { label: "Proses Gilingan", href: "/production/gilingan" },
      ],
    };
  }

  // Bongkar Susun: list / buat baru / detail
  if (path === "/operasional/bongkar-susun") {
    return {
      title: "Bongkar Susun",
      subtitle: "Operasional",
      crumbs: [
        ROOT_CRUMB,
        { label: "Operasional", href: path },
        { label: "Bongkar Susun", href: path },
      ],
    };
  }

  if (path === "/operasional/bongkar-susun/baru") {
    return {
      title: "Buat Baru",
      subtitle: "Bongkar Susun",
      crumbs: [
        ROOT_CRUMB,
        { label: "Bongkar Susun", href: "/operasional/bongkar-susun" },
        { label: "Buat Baru", href: path },
      ],
    };
  }

  const bsDetail = /^\/operasional\/bongkar-susun\/(.+)$/.exec(path);
  if (bsDetail && bsDetail[1]) {
    const noBongkarSusun = decodeURIComponent(bsDetail[1]);
    return {
      title: "Bongkar Susun",
      subtitle: "Operasional",
      crumbs: [
        ROOT_CRUMB,
        { label: "Bongkar Susun", href: "/operasional/bongkar-susun" },
        { label: noBongkarSusun },
      ],
    };
  }

  // Sortir Reject: list / buat baru / detail
  if (path === "/operasional/sortir-reject") {
    return {
      title: "Sortir Reject",
      subtitle: "Operasional",
      crumbs: [
        ROOT_CRUMB,
        { label: "Operasional", href: path },
        { label: "Sortir Reject", href: path },
      ],
    };
  }

  if (path === "/operasional/sortir-reject/baru") {
    return {
      title: "Buat Baru",
      subtitle: "Sortir Reject",
      crumbs: [
        ROOT_CRUMB,
        { label: "Sortir Reject", href: "/operasional/sortir-reject" },
        { label: "Buat Baru", href: path },
      ],
    };
  }

  const srDetail = /^\/operasional\/sortir-reject\/(.+)$/.exec(path);
  if (srDetail && srDetail[1]) {
    const noSortir = decodeURIComponent(srDetail[1]);
    return {
      title: "Sortir Reject",
      subtitle: "Operasional",
      crumbs: [
        ROOT_CRUMB,
        { label: "Sortir Reject", href: "/operasional/sortir-reject" },
        { label: noSortir },
      ],
    };
  }

  if (path === "/warehouse/penjualan" || path.startsWith("/warehouse/penjualan/")) {
    return {
      title: "Penjualan",
      subtitle: "Warehouse",
      crumbs: [
        ROOT_CRUMB,
        { label: "Warehouse", href: "/warehouse/penjualan" },
        { label: "Penjualan", href: "/warehouse/penjualan" },
      ],
    };
  }

  if (
    path === "/warehouse/good-transfer" ||
    path.startsWith("/warehouse/good-transfer/")
  ) {
    return {
      title: "Good Transfer",
      subtitle: "Warehouse",
      crumbs: [
        ROOT_CRUMB,
        { label: "Warehouse", href: "/warehouse/penjualan" },
        { label: "Good Transfer", href: path },
      ],
    };
  }

  if (path === "/warehouse/retur-v3" || path.startsWith("/warehouse/retur-v3/")) {
    return {
      title: "Retur v3",
      subtitle: "Warehouse",
      crumbs: [
        ROOT_CRUMB,
        { label: "Warehouse", href: "/warehouse/penjualan" },
        { label: "Retur v3", href: path },
      ],
    };
  }

  if (
    path === "/warehouse/trade-in" ||
    path.startsWith("/warehouse/trade-in/")
  ) {
    return {
      title: "Penerimaan Trade In",
      subtitle: "Warehouse",
      crumbs: [
        ROOT_CRUMB,
        { label: "Warehouse", href: "/warehouse/penjualan" },
        { label: "Penerimaan Trade In", href: path },
      ],
    };
  }

  const pbdDetail = /^\/warehouse\/penerimaan-barang-dagang\/(.+)$/.exec(
    path,
  );
  if (pbdDetail && pbdDetail[1]) {
    const noPenerimaan = decodeURIComponent(pbdDetail[1]);
    return {
      title: "Penerimaan Barang Dagang",
      subtitle: "Warehouse",
      crumbs: [
        ROOT_CRUMB,
        { label: "Warehouse", href: "/warehouse/penjualan" },
        {
          label: "Penerimaan Barang Dagang",
          href: "/warehouse/penerimaan-barang-dagang",
        },
        { label: noPenerimaan },
      ],
    };
  }

  if (path === "/production/penerimaan-bahan-baku") {
    return {
      title: "Penerimaan Bahan Baku",
      subtitle: "Washing & Broker",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/washing" },
        { label: "Penerimaan Bahan Baku", href: path },
      ],
    };
  }

  const pbbDetail =
    /^\/production\/penerimaan-bahan-baku\/(.+)$/.exec(path);
  if (pbbDetail && pbbDetail[1]) {
    const noPenerimaan = decodeURIComponent(pbbDetail[1]);
    return {
      title: "Penerimaan Bahan Baku",
      subtitle: "Washing & Broker",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/washing" },
        {
          label: "Penerimaan Bahan Baku",
          href: "/production/penerimaan-bahan-baku",
        },
        { label: noPenerimaan },
      ],
    };
  }

  if (path === "/bahan-pendukung/penerimaan") {
    return {
      title: "Penerimaan Bahan Pendukung",
      subtitle: "Bahan Pendukung",
      crumbs: [
        ROOT_CRUMB,
        { label: "Bahan Pendukung", href: path },
        { label: "Penerimaan Bahan Pendukung", href: path },
      ],
    };
  }

  const pbpDetail = /^\/bahan-pendukung\/penerimaan\/(.+)$/.exec(path);
  if (pbpDetail && pbpDetail[1]) {
    const noPenerimaan = decodeURIComponent(pbpDetail[1]);
    return {
      title: "Penerimaan Bahan Pendukung",
      subtitle: "Bahan Pendukung",
      crumbs: [
        ROOT_CRUMB,
        { label: "Bahan Pendukung", href: "/bahan-pendukung/penerimaan" },
        {
          label: "Penerimaan Bahan Pendukung",
          href: "/bahan-pendukung/penerimaan",
        },
        { label: noPenerimaan },
      ],
    };
  }

  // Detail inject: /production/inject/<noProduksi>
  const injectDetail = /^\/production\/inject\/(.+)$/.exec(path);
  const injectListMatch =
    path === "/production/inject" || path.startsWith("/production/inject/");

  if (injectDetail && injectDetail[1]) {
    const noProduksi = decodeURIComponent(injectDetail[1]);
    return {
      title: "Proses Inject",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/inject" },
        { label: "Proses Inject", href: "/production/inject" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (injectListMatch) {
    return {
      title: "Proses Inject",
      subtitle: "Pin Hulu",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hulu", href: "/production/inject" },
        { label: "Proses Inject", href: "/production/inject" },
      ],
    };
  }

  // Detail stamping: /production/stamping/<noProduksi>
  const stampingDetail = /^\/production\/stamping\/(.+)$/.exec(path);
  const stampingListMatch =
    path === "/production/stamping" || path.startsWith("/production/stamping/");

  if (stampingDetail && stampingDetail[1]) {
    const noProduksi = decodeURIComponent(stampingDetail[1]);
    return {
      title: "Proses Stamping",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/stamping" },
        { label: "Proses Stamping", href: "/production/stamping" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (stampingListMatch) {
    return {
      title: "Proses Stamping",
      subtitle: "Pin Hilir",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/stamping" },
        { label: "Proses Stamping", href: "/production/stamping" },
      ],
    };
  }

  // Detail pasang kunci: /production/pasang-kunci/<noProduksi>
  const pasangKunciDetail = /^\/production\/pasang-kunci\/(.+)$/.exec(path);
  const pasangKunciListMatch =
    path === "/production/pasang-kunci" ||
    path.startsWith("/production/pasang-kunci/");

  if (pasangKunciDetail && pasangKunciDetail[1]) {
    const noProduksi = decodeURIComponent(pasangKunciDetail[1]);
    return {
      title: "Proses Pasang Kunci",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/pasang-kunci" },
        { label: "Proses Pasang Kunci", href: "/production/pasang-kunci" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (pasangKunciListMatch) {
    return {
      title: "Proses Pasang Kunci",
      subtitle: "Pin Hilir",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/pasang-kunci" },
        { label: "Proses Pasang Kunci", href: "/production/pasang-kunci" },
      ],
    };
  }

  // Detail packing spanner: /production/spanner/<noProduksi>
  const spannerDetail = /^\/production\/spanner\/(.+)$/.exec(path);
  const spannerListMatch =
    path === "/production/spanner" || path.startsWith("/production/spanner/");

  if (spannerDetail && spannerDetail[1]) {
    const noProduksi = decodeURIComponent(spannerDetail[1]);
    return {
      title: "Packing Spanner",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/spanner" },
        { label: "Packing Spanner", href: "/production/spanner" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (spannerListMatch) {
    return {
      title: "Packing Spanner",
      subtitle: "Pin Hilir",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/spanner" },
        { label: "Packing Spanner", href: "/production/spanner" },
      ],
    };
  }

  // Detail packing: /production/packing/<noPacking>
  const packingDetail = /^\/production\/packing\/(.+)$/.exec(path);
  const packingListMatch =
    path === "/production/packing" || path.startsWith("/production/packing/");

  if (packingDetail && packingDetail[1]) {
    const noProduksi = decodeURIComponent(packingDetail[1]);
    return {
      title: "Proses Packing",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/packing" },
        { label: "Proses Packing", href: "/production/packing" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (packingListMatch) {
    return {
      title: "Proses Packing",
      subtitle: "Pin Hilir",
      crumbs: [
        ROOT_CRUMB,
        { label: "Pin Hilir", href: "/production/packing" },
        { label: "Proses Packing", href: "/production/packing" },
      ],
    };
  }

  // Detail broker: /production/broker/<noProduksi>
  const brokerDetail = /^\/production\/broker\/(.+)$/.exec(path);
  const brokerListMatch =
    path === "/production/broker" || path.startsWith("/production/broker/");

  if (brokerDetail && brokerDetail[1]) {
    const noProduksi = decodeURIComponent(brokerDetail[1]);
    return {
      title: "Proses Broker",
      subtitle: "Input Produksi",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/broker" },
        { label: "Proses Broker", href: "/production/broker" },
        { label: "Input Produksi", href: path },
        { label: noProduksi },
      ],
    };
  }

  if (brokerListMatch) {
    return {
      title: "Proses Broker",
      subtitle: "Washing & Broker",
      crumbs: [
        ROOT_CRUMB,
        { label: "Washing & Broker", href: "/production/broker" },
        { label: "Proses Broker", href: "/production/broker" },
      ],
    };
  }

  // Mapping: /mapping (blok), /mapping/<blok>, /mapping/<blok>/layout
  if (path === "/mapping") {
    return {
      title: "Mapping",
      subtitle: "Laporan & Monitoring",
      crumbs: [
        ROOT_CRUMB,
        { label: "Laporan & Monitoring" },
        { label: "Mapping", href: path },
      ],
    };
  }

  const mappingLayout = /^\/mapping\/([^/]+)\/layout$/.exec(path);
  if (mappingLayout && mappingLayout[1]) {
    const blok = decodeURIComponent(mappingLayout[1]);
    return {
      title: "Edit Layout",
      subtitle: `Layout ${blok}`,
      crumbs: [
        ROOT_CRUMB,
        { label: "Mapping", href: "/mapping" },
        { label: `Layout ${blok}`, href: `/mapping/${encodeURIComponent(blok)}` },
        { label: "Edit Layout", href: path },
      ],
    };
  }

  const mappingDetail = /^\/mapping\/([^/]+)$/.exec(path);
  if (mappingDetail && mappingDetail[1]) {
    const blok = decodeURIComponent(mappingDetail[1]);
    return {
      title: `Layout ${blok}`,
      subtitle: "Mapping",
      crumbs: [
        ROOT_CRUMB,
        { label: "Mapping", href: "/mapping" },
        { label: `Layout ${blok}`, href: path },
      ],
    };
  }

  const match = findBestMatch(path);
  if (match && match.chain.length > 0) {
    const crumbs: BreadcrumbCrumb[] = [ROOT_CRUMB];
    const leaf = match.chain[match.chain.length - 1];

    // parent dengan href "#" tetap ditampilkan sebagai label non-link
    // (kecuali leaf-nya sendiri yang sudah punya href valid)
    for (let i = 0; i < match.chain.length; i++) {
      const item = match.chain[i];
      const isLeaf = i === match.chain.length - 1;
      if (item.href && item.href !== "#") {
        // hindari duplikat dengan ROOT
        if (!(item.href === "/" && crumbs.some((c) => c.href === "/"))) {
          crumbs.push({
            label: item.label,
            href: isLeaf ? path : item.href,
          });
        }
      } else if (isLeaf || item.label) {
        // parent placeholder (mis. "Washing & Broker" href="#")
        if (!crumbs.some((c) => c.label === item.label)) {
          crumbs.push({ label: item.label });
        }
      }
    }

    // leaf terakhir selalu menunjuk path sekarang
    const last = crumbs[crumbs.length - 1];
    if (last && last.label === leaf.label) {
      last.href = path === "/" ? "/" : path;
    }

    return {
      title: leaf.label,
      subtitle:
        match.chain.length >= 2
          ? match.chain[match.chain.length - 2].label
          : "PPS",
      crumbs,
    };
  }

  // fallback: pecah path menjadi crumb per segmen
  const segs = path.split("/").filter(Boolean);
  const crumbs: BreadcrumbCrumb[] = [ROOT_CRUMB];
  let acc = "";
  for (const seg of segs) {
    acc += `/${seg}`;
    crumbs.push({ label: seg, href: acc });
  }

  return {
    title: segs.length ? segs[segs.length - 1] : "Dashboard",
    subtitle: "PPS",
    crumbs,
  };
}
