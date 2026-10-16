import type { LaporanData } from "@/services/laporan-service";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}

function u32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

/** ZIP (stored, tanpa kompresi) — cukup utk container XLSX. */
function buildZip(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();

  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  let cdSize = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const header = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(dosTime),
      ...u16(dosDate),
      ...u32(crc),
      ...u32(entry.data.length),
      ...u32(entry.data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...nameBytes,
    ]);
    parts.push(header, entry.data);

    const central = new Uint8Array([
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(dosTime),
      ...u16(dosDate),
      ...u32(crc),
      ...u32(entry.data.length),
      ...u32(entry.data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nameBytes,
    ]);
    centralParts.push(central);
    cdSize += central.length;
    offset += header.length + entry.data.length;
  }

  const eocd = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(cdSize),
    ...u32(offset),
    ...u16(0),
  ]);

  const all = [...parts, ...centralParts, eocd];
  const total = all.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of all) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function xmlEsc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colRef(index: number): string {
  let ref = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    ref = String.fromCharCode(65 + rem) + ref;
    n = Math.floor((n - 1) / 26);
  }
  return ref;
}

function buildSheetXml(data: LaporanData): string {
  const widths = data.columns.map((col) => {
    let max = col.label.length;
    for (const row of data.rows) {
      const v = row[col.key];
      if (v != null) max = Math.max(max, String(v).length);
    }
    return Math.min(Math.max(max + 2, 8), 40);
  });

  const colsXml = `<cols>${widths
    .map(
      (w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`,
    )
    .join("")}</cols>`;

  const headerCells = data.columns
    .map(
      (col, i) =>
        `<c r="${colRef(i)}1" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(
          col.label,
        )}</t></is></c>`,
    )
    .join("");
  const headerRow = `<row r="1">${headerCells}</row>`;

  const bodyRows = data.rows
    .map((row, ri) => {
      const r = ri + 2;
      const cells = data.columns
        .map((col, ci) => {
          const ref = `${colRef(ci)}${r}`;
          const v = row[col.key];
          if (typeof v === "number" && Number.isFinite(v)) {
            return `<c r="${ref}"><v>${v}</v></c>`;
          }
          if (v == null || v === "") return "";
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(
            String(v),
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colsXml}<sheetData>${headerRow}${bodyRows}</sheetData></worksheet>`;
}

/** Bangun byte .xlsx (sheet tunggal) dari data laporan. */
export function buildLaporanXlsxBytes(data: LaporanData): Uint8Array {
  return buildZip([
    { name: "[Content_Types].xml", data: new TextEncoder().encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: new TextEncoder().encode(ROOT_RELS) },
    { name: "xl/workbook.xml", data: new TextEncoder().encode(WORKBOOK_XML) },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: new TextEncoder().encode(WORKBOOK_RELS),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: new TextEncoder().encode(buildSheetXml(data)),
    },
  ]);
}

/** Unduh data laporan sebagai file .xlsx (Excel). */
export function exportLaporanXlsx(filename: string, data: LaporanData): void {
  const bytes = buildLaporanXlsxBytes(data);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
