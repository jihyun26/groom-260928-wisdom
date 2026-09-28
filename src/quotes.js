let catalog;

export async function loadQuotes() {
  if (catalog) return catalog;
  const response = await fetch('./data/quotes.original.json');
  if (!response.ok) throw new Error('문장 목록을 불러오지 못했습니다.');
  const data = await response.json();
  catalog = data.filter(isUsableQuote).sort((a, b) => a.id.localeCompare(b.id));
  if (!catalog.length) throw new Error('사용 가능한 문장이 없습니다.');
  return catalog;
}

export function isUsableQuote(quote) {
  return Boolean(quote && typeof quote.id === 'string' && typeof quote.text === 'string'
    && quote.text.trim() && quote.text.length <= 500 && quote.reviewStatus === 'approved' && quote.enabled === true);
}

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function quoteForDate(dateKey, quotes, previousQuoteId = null) {
  let hash = 2166136261;
  for (const char of `v1:${dateKey}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let index = (hash >>> 0) % quotes.length;
  if (quotes.length > 1 && quotes[index].id === previousQuoteId) index = (index + 1) % quotes.length;
  return quotes[index];
}
