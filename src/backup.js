const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isDateKey(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value); }
function validStroke(stroke) {
  return stroke && /^#[0-9a-f]{6}$/i.test(stroke.color) && Number.isFinite(stroke.width) && stroke.width >= 1 && stroke.width <= 20 && Array.isArray(stroke.points) && stroke.points.length <= 5000 && stroke.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
}
function validEntry(entry) {
  return entry && isDateKey(entry.dateKey) && typeof entry.quoteId === 'string' && entry.quoteId.length <= 100 && entry.quoteSnapshot && typeof entry.quoteSnapshot.text === 'string' && entry.quoteSnapshot.text.length <= 500 && typeof entry.note === 'string' && entry.note.length <= 2000 && Array.isArray(entry.strokes) && entry.strokes.length <= 500 && entry.strokes.every(validStroke);
}

export function validateBackup(text) {
  if (new Blob([text]).size > MAX_FILE_SIZE) throw new Error('백업 파일은 5MB 이하여야 합니다.');
  let data; try { data = JSON.parse(text); } catch { throw new Error('올바른 JSON 파일이 아닙니다.'); }
  if (data?.app !== 'one-line' || data.schemaVersion !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.favorites)) throw new Error('지원하지 않는 백업 형식입니다.');
  if (data.entries.length > 5000 || !data.entries.every(validEntry)) throw new Error('백업의 기록 데이터가 올바르지 않습니다.');
  if (data.favorites.length > 5000 || !data.favorites.every((f) => f && typeof f.quoteId === 'string' && f.quoteId.length <= 100)) throw new Error('백업의 즐겨찾기 데이터가 올바르지 않습니다.');
  return data;
}

export function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `one-line-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
