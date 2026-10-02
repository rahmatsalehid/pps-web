import type { SpkDetail } from "@/services/spk-barang-jadi-service";
import { spkFormatDate, spkFormatNumber } from "./spk-format";

function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function spkPrintSpk(detail: SpkDetail): void {
  const win = window.open("", "_blank", "width=900,height=720");
  if (!win) return;

  const rows = detail.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(item.itemCode)}</td>
        <td>${esc(item.namaBJ)}</td>
        <td>${esc(item.uom)}</td>
        <td class="num">${esc(spkFormatNumber(item.stockSaatSPK))}</td>
        <td class="num">${esc(spkFormatNumber(item.minStock))}</td>
        <td class="num">${esc(spkFormatNumber(item.maxStock))}</td>
        <td class="num">${esc(spkFormatNumber(item.mpq))}</td>
        <td class="num">${esc(spkFormatNumber(item.qtyRekomendasi))}</td>
        <td class="num"><strong>${esc(spkFormatNumber(item.qtySpk))}</strong></td>
      </tr>`,
    )
    .join("");

  const totalQty = detail.items.reduce((sum, i) => sum + i.qtySpk, 0);

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>SPK ${esc(detail.noSpk)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #1A1D23; font-size: 12.5px; }
  h1 { font-size: 17px; margin: 0; letter-spacing: 0.4px; }
  .sub { color: #6B7280; font-size: 12px; margin-top: 3px; }
  .meta { margin-top: 16px; display: flex; gap: 28px; }
  .meta div span { display: block; color: #6B7280; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta div strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { border: 1px solid #C9D0D6; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F3F5F8; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; }
  td.num, th.num { text-align: right; }
  tfoot td { background: #F8F9FB; }
  .footer { margin-top: 26px; display: flex; justify-content: space-between; gap: 40px; }
  .sign { text-align: center; width: 200px; }
  .sign p { margin: 52px 0 0; font-size: 12px; border-top: 1px solid #1A1D23; padding-top: 6px; }
</style>
</head>
<body>
  <h1>SURAT PERINTAH KERJA (SPK) PRODUKSI</h1>
  <div class="sub">Barang Jadi &mdash; PPS</div>
  <div class="meta">
    <div><span>No. SPK</span><strong>${esc(detail.noSpk)}</strong></div>
    <div><span>Tanggal</span><strong>${esc(spkFormatDate(detail.tanggal))}</strong></div>
    <div><span>Status</span><strong>${esc(detail.status)}</strong></div>
    <div><span>Keterangan</span><strong>${esc(detail.keterangan ?? "-")}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Code</th>
        <th>Barang</th>
        <th>UOM</th>
        <th class="num">Stok Saat SPK</th>
        <th class="num">Min</th>
        <th class="num">Max</th>
        <th class="num">MPQ</th>
        <th class="num">Qty Rekomendasi</th>
        <th class="num">Qty SPK</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="9" class="num"><strong>Total Qty SPK</strong></td>
        <td class="num"><strong>${esc(spkFormatNumber(totalQty))}</strong></td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">
    <div class="sign"><p>Dibuat oleh</p></div>
    <div class="sign"><p>Disetujui oleh</p></div>
  </div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
