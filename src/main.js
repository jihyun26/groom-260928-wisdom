import { loadQuotes, localDateKey, quoteForDate } from './quotes.js';
import { getEntry, getAllEntries, putEntry, getFavorites, isFavorite, toggleFavorite, clearAll, replaceData, exportData } from './storage.js';
import { createDrawing } from './drawing.js';
import { validateBackup, downloadJson } from './backup.js';
import { createCard, shareCard } from './share.js';

const $ = (selector) => document.querySelector(selector);
const refs = {
  date: $('#todayDate'), todayLabel: $('#todayLabel'), quote: $('#quoteText'), source: $('#quoteSource'), note: $('#noteInput'), count: $('#noteCount'), status: $('#saveStatus'), favorite: $('#favoriteButton'), canvas: $('#drawingCanvas'), archive: $('#archiveList'), search: $('#searchInput'), favoriteFilter: $('#favoriteFilter'), storage: $('#storageSummary'), toast: $('#toast')
};
const state = { quotes: [], entry: null, viewedDate: null, saveTimer: null, drawing: null, importData: null };

function toast(message) { refs.toast.textContent = message; refs.toast.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { refs.toast.hidden = true; }, 2600); }
function formatDate(dateKey, long = true) { const [y, m, d] = dateKey.split('-').map(Number); return new Intl.DateTimeFormat('ko-KR', long ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } : { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d)); }
function setStatus(text) { refs.status.textContent = text; }
function setFavoriteUi(active) { refs.favorite.setAttribute('aria-pressed', String(active)); refs.favorite.querySelector('[aria-hidden]').textContent = active ? '★' : '☆'; refs.favorite.querySelector('.sr-only').textContent = active ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'; }

async function entryFor(dateKey) {
  const saved = await getEntry(dateKey); if (saved) return saved;
  const entries = await getAllEntries(); const previous = entries.filter((e) => e.dateKey < dateKey).sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
  const quote = quoteForDate(dateKey, state.quotes, previous?.quoteId);
  const now = new Date().toISOString();
  const entry = { dateKey, quoteId: quote.id, quoteSnapshot: { text: quote.text, sourceTitle: quote.sourceTitle }, note: '', strokes: [], createdAt: now, updatedAt: now };
  await putEntry(entry); return entry;
}

async function showEntry(dateKey) {
  await flushSave(); state.viewedDate = dateKey; state.entry = await entryFor(dateKey);
  refs.date.dateTime = dateKey; refs.date.textContent = formatDate(dateKey); refs.todayLabel.textContent = dateKey === localDateKey() ? '오늘' : '지난 기록';
  refs.quote.textContent = state.entry.quoteSnapshot.text; refs.source.textContent = `— ${state.entry.quoteSnapshot.sourceTitle || '오늘의 한 줄'}`;
  refs.note.value = state.entry.note; refs.count.textContent = `${state.entry.note.length.toLocaleString()} / 2,000`;
  state.drawing.setStrokes(state.entry.strokes); setFavoriteUi(await isFavorite(state.entry.quoteId)); setStatus('저장됨');
}

function scheduleSave() { setStatus('저장 중…'); clearTimeout(state.saveTimer); state.saveTimer = setTimeout(saveCurrent, 500); }
async function saveCurrent() { clearTimeout(state.saveTimer); state.saveTimer = null; if (!state.entry) return; state.entry.note = refs.note.value.slice(0, 2000); state.entry.strokes = state.drawing.getStrokes(); state.entry.updatedAt = new Date().toISOString(); try { await putEntry(state.entry); setStatus('저장됨'); } catch (error) { console.error(error); setStatus('저장 실패'); toast('저장 공간을 확인해 주세요.'); } }
async function flushSave() { if (state.saveTimer) await saveCurrent(); }

async function renderArchive() {
  const [entries, favorites] = await Promise.all([getAllEntries(), getFavorites()]); const favoriteIds = new Set(favorites.map((f) => f.quoteId)); const term = refs.search.value.trim().toLocaleLowerCase('ko');
  const filtered = entries.filter((entry) => (entry.note.trim() || entry.strokes.length) && (!refs.favoriteFilter.checked || favoriteIds.has(entry.quoteId)) && (!term || entry.note.toLocaleLowerCase('ko').includes(term) || entry.quoteSnapshot.text.toLocaleLowerCase('ko').includes(term))).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  refs.archive.replaceChildren();
  if (!filtered.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.innerHTML = `<strong>${term || refs.favoriteFilter.checked ? '조건에 맞는 기록이 없어요' : '아직 남긴 기록이 없어요'}</strong><br><span>오늘의 생각을 한 줄 적어 보세요.</span>`; refs.archive.append(empty); return; }
  for (const entry of filtered) { const link = document.createElement('a'); link.className = 'archive-item'; link.href = `#today/${entry.dateKey}`; const top = document.createElement('div'); top.className = 'archive-date'; const date = document.createElement('time'); date.dateTime = entry.dateKey; date.textContent = formatDate(entry.dateKey, false); const star = document.createElement('span'); star.textContent = favoriteIds.has(entry.quoteId) ? '★' : ''; top.append(date, star); const title = document.createElement('h2'); title.textContent = entry.quoteSnapshot.text; const note = document.createElement('p'); note.textContent = entry.note || (entry.strokes.length ? '그림으로 남긴 기록' : ''); link.append(top, title, note); refs.archive.append(link); }
}

async function updateStorageSummary() { const entries = await getAllEntries(); const saved = entries.filter((e) => e.note.trim() || e.strokes.length).length; let estimate = ''; if (navigator.storage?.estimate) { const { usage = 0 } = await navigator.storage.estimate(); estimate = ` · 약 ${(usage / 1024).toFixed(0)}KB 사용 중`; } refs.storage.textContent = `기록 ${saved}개${estimate}`; }
function applyTheme(theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('one-line-theme', theme); document.querySelector(`input[name="theme"][value="${theme}"]`).checked = true; }

async function route() {
  const match = location.hash.match(/^#(today|archive|settings)(?:\/(\d{4}-\d{2}-\d{2}))?/); const name = match?.[1] || 'today';
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.dataset.view !== name; }); document.querySelectorAll('.bottom-nav a').forEach((link) => link.classList.toggle('active', link.dataset.route === name));
  if (name === 'today') await showEntry(match?.[2] || localDateKey()); if (name === 'archive') { await flushSave(); await renderArchive(); } if (name === 'settings') { await flushSave(); await updateStorageSummary(); }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function boot() {
  applyTheme(localStorage.getItem('one-line-theme') || 'system'); state.quotes = await loadQuotes();
  state.drawing = createDrawing(refs.canvas, { onChange: (strokes) => { if (state.entry) { state.entry.strokes = strokes; scheduleSave(); } } });
  refs.note.addEventListener('input', () => { refs.count.textContent = `${refs.note.value.length.toLocaleString()} / 2,000`; scheduleSave(); });
  refs.favorite.addEventListener('click', async () => { setFavoriteUi(await toggleFavorite(state.entry.quoteId)); toast('즐겨찾기를 변경했어요.'); });
  $('#penColor').addEventListener('input', (e) => state.drawing.setColor(e.target.value)); $('#penWidth').addEventListener('input', (e) => state.drawing.setWidth(e.target.value)); $('#undoButton').addEventListener('click', () => state.drawing.undo()); $('#clearDrawingButton').addEventListener('click', () => state.drawing.clear());
  refs.search.addEventListener('input', renderArchive); refs.favoriteFilter.addEventListener('change', renderArchive);
  $('#themeOptions').addEventListener('change', (e) => { if (e.target.name === 'theme') applyTheme(e.target.value); });
  $('#themeQuickButton').addEventListener('click', () => { const order = ['system', 'light', 'dark', 'green']; const current = localStorage.getItem('one-line-theme') || 'system'; applyTheme(order[(order.indexOf(current) + 1) % order.length]); toast('테마를 변경했어요.'); });
  $('#exportButton').addEventListener('click', async () => { await flushSave(); downloadJson(await exportData()); toast('백업을 저장했어요.'); });
  $('#importInput').addEventListener('change', handleImport); $('#importDialog').addEventListener('close', performImport);
  $('#deleteAllButton').addEventListener('click', () => $('#confirmDialog').showModal()); $('#confirmDialog').addEventListener('close', async (e) => { if (e.target.returnValue !== 'confirm') return; await clearAll(); toast('모든 기록을 삭제했어요.'); location.hash = '#today'; await showEntry(localDateKey()); });
  $('#shareButton').addEventListener('click', async () => { try { await flushSave(); const result = await shareCard(await createCard(state.entry), state.entry.dateKey); toast(result === 'shared' ? '공유했어요.' : 'PNG로 저장했어요.'); } catch (error) { if (error.name !== 'AbortError') toast('이미지를 만들지 못했습니다.'); } });
  window.addEventListener('hashchange', route); document.addEventListener('visibilitychange', async () => { if (document.hidden) await flushSave(); else if (state.viewedDate !== localDateKey() && (location.hash === '#today' || !location.hash)) await showEntry(localDateKey()); }); window.addEventListener('pagehide', flushSave);
  setInterval(() => { if (state.viewedDate && state.viewedDate !== localDateKey() && state.viewedDate === location.hash.slice(7)) return; if (state.viewedDate !== localDateKey() && location.hash === '#today') showEntry(localDateKey()); }, 60_000);
  await route(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
}

async function handleImport(event) { const file = event.target.files[0]; event.target.value = ''; if (!file) return; try { state.importData = validateBackup(await file.text()); const current = new Set((await getAllEntries()).map((e) => e.dateKey)); const duplicates = state.importData.entries.filter((e) => current.has(e.dateKey)).length; $('#importPreview').textContent = `기록 ${state.importData.entries.length}개, 즐겨찾기 ${state.importData.favorites.length}개를 찾았습니다. 같은 날짜 기록 ${duplicates}개가 있습니다. 병합하면 백업의 같은 날짜 기록으로 갱신됩니다.`; $('#importDialog').showModal(); } catch (error) { toast(error.message); } }
async function performImport(event) { const mode = event.target.returnValue; if (!state.importData || !['merge', 'replace'].includes(mode)) { state.importData = null; return; } try { await replaceData(state.importData, mode === 'replace'); if (state.importData.settings?.theme && ['system', 'light', 'dark', 'green'].includes(state.importData.settings.theme)) applyTheme(state.importData.settings.theme); toast('백업을 가져왔어요.'); await route(); } catch { toast('복원하지 못해 기존 데이터를 유지했어요.'); } finally { state.importData = null; } }

boot().catch((error) => { console.error(error); document.body.innerHTML = '<main class="view"><h1>앱을 열지 못했어요</h1><p>로컬 서버에서 다시 열어 주세요.</p></main>'; });
