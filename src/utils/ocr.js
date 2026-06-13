import Tesseract from 'tesseract.js';

export async function runOCR(imageFile, onProgress) {
  const result = await Tesseract.recognize(imageFile, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  return result.data.text || '';
}

/**
 * Parse OCR text into proposed sales entries against the product catalogue.
 */
export function parseSalesText(text, products) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/[|·•]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 1);

  const entries = [];
  for (const line of lines) {
    const skuMatch = products.find(p =>
      p.sku && line.toLowerCase().includes(p.sku.toLowerCase())
    );
    const product = skuMatch || fuzzyFindProduct(line, products);
    if (!product) continue;

    const qty = extractQty(line) || 1;
    entries.push({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      unit_price: product.price,
      quantity: qty,
      raw_line: line
    });
  }
  return entries;
}

function extractQty(line) {
  const xMatch = line.match(/x\s*(\d{1,3})\b/i) || line.match(/×\s*(\d{1,3})\b/);
  if (xMatch) return parseInt(xMatch[1], 10);
  const tail = line.match(/(\d{1,3})\s*$/);
  if (tail) return parseInt(tail[1], 10);
  const lead = line.match(/^(\d{1,3})\s+/);
  if (lead) return parseInt(lead[1], 10);
  return 0;
}

function fuzzyFindProduct(line, products) {
  const tokens = line.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
  let best = null, bestScore = 0;
  for (const p of products) {
    const nameTokens = p.name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    let score = 0;
    for (const nt of nameTokens) {
      if (tokens.includes(nt)) score += 2;
      else if (tokens.some(t => t.startsWith(nt.slice(0, 4)) || nt.startsWith(t.slice(0, 4)))) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore >= 2 ? best : null;
}
