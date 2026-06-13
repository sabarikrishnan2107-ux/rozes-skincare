import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fmtAED, fmtDate } from './format';
import { channelLabel } from './channels';

export function exportSalesPDF({ title, rangeLabel, summary, rows, returns = [] }) {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(204, 70, 36);
  doc.text('Rozes Skincare', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(title, 14, 26);
  doc.setFontSize(9);
  doc.text(rangeLabel, 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(40);
  let y = 42;
  Object.entries(summary).forEach(([k, v]) => {
    doc.text(`${k}: ${v}`, 14, y);
    y += 6;
  });

  const totalUnits = rows.reduce((a, r) => a + (Number(r.quantity) || 0), 0);
  const totalAmount = rows.reduce((a, r) => a + (Number(r.total_amount) || 0), 0);

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Product', 'SKU', 'Channel', 'Qty', 'Unit', 'Total']],
    body: rows.map(r => [
      fmtDate(r.sale_date),
      r.product_name,
      r.sku,
      channelLabel(r.source),
      r.quantity,
      fmtAED(r.unit_price),
      fmtAED(r.total_amount)
    ]),
    foot: [['', '', '', 'Total', totalUnits, '', fmtAED(totalAmount)]],
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [204, 70, 36], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [253, 246, 243] }
  });

  if (returns.length > 0) {
    const returnUnits = returns.reduce((a, r) => a + (Number(r.quantity) || 0), 0);
    let ry = (doc.lastAutoTable?.finalY || y) + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(204, 70, 36);
    doc.text('Returns', 14, ry);
    autoTable(doc, {
      startY: ry + 4,
      head: [['Date', 'Product', 'SKU', 'Channel', 'Qty', 'Reason']],
      body: returns.map(r => [
        fmtDate(r.return_date),
        r.product_name,
        r.sku,
        channelLabel(r.channel),
        r.quantity,
        r.reason || ''
      ]),
      foot: [['', '', '', 'Total', returnUnits, '']],
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9 },
      headStyles: { fillColor: [120, 48, 25], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [253, 246, 243] }
    });
  }

  doc.save(`rozes-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export function exportSalesExcel({ title, rows, returns = [] }) {
  const data = rows.map(r => ({
    Date: r.sale_date,
    Product: r.product_name,
    SKU: r.sku,
    Channel: channelLabel(r.source),
    Quantity: r.quantity,
    'Unit Price (AED)': r.unit_price,
    'Total (AED)': r.total_amount
  }));
  // Totals row
  data.push({
    Date: '',
    Product: 'TOTAL',
    SKU: '',
    Channel: '',
    Quantity: rows.reduce((a, r) => a + (Number(r.quantity) || 0), 0),
    'Unit Price (AED)': '',
    'Total (AED)': rows.reduce((a, r) => a + (Number(r.total_amount) || 0), 0)
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');

  if (returns.length > 0) {
    const rdata = returns.map(r => ({
      Date: r.return_date,
      Product: r.product_name,
      SKU: r.sku,
      Channel: channelLabel(r.channel),
      Quantity: r.quantity,
      Reason: r.reason || ''
    }));
    rdata.push({
      Date: '', Product: 'TOTAL', SKU: '', Channel: '',
      Quantity: returns.reduce((a, r) => a + (Number(r.quantity) || 0), 0), Reason: ''
    });
    const rws = XLSX.utils.json_to_sheet(rdata);
    rws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, rws, 'Returns');
  }

  XLSX.writeFile(wb, `rozes-${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

export function exportReturnsExcel({ title, rows }) {
  const data = rows.map(r => ({
    Date: r.return_date,
    Product: r.product_name,
    SKU: r.sku,
    Channel: channelLabel(r.channel),
    Quantity: r.quantity,
    Reason: r.reason || ''
  }));
  data.push({
    Date: '', Product: 'TOTAL', SKU: '', Channel: '',
    Quantity: rows.reduce((a, r) => a + (Number(r.quantity) || 0), 0), Reason: ''
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Returns');
  XLSX.writeFile(wb, `rozes-${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

export function exportProductsCSV(products) {
  const headers = ['name', 'sku', 'category', 'price', 'stock_quantity', 'initial_stock', 'low_stock_threshold'];
  const lines = [headers.join(',')];
  products.forEach(p => {
    lines.push(headers.map(h => JSON.stringify(p[h] ?? '')).join(','));
  });
  triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv' }), 'rozes-products.csv');
}

export function importProductsCSV(file, onParsed) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
    const rows = lines.map(line => {
      const values = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        let v = values[i];
        if (['price', 'stock_quantity', 'initial_stock', 'low_stock_threshold'].includes(h)) {
          v = Number(v) || 0;
        }
        obj[h] = v;
      });
      return obj;
    });
    onParsed(rows);
  };
  reader.readAsText(file);
}

function parseCsvLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data, filename) {
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}
