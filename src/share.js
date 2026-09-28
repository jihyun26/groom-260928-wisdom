export async function createCard(entry) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4f0e6'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#245a4a'; ctx.fillRect(70, 70, 940, 620); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(940, 610, 180, 0, Math.PI * 2); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '700 64px Georgia, serif'; drawWrapped(ctx, entry.quoteSnapshot.text, 130, 210, 820, 96);
  ctx.font = '28px system-ui'; ctx.globalAlpha = .75; ctx.fillText(entry.quoteSnapshot.sourceTitle || '오늘의 한 줄', 130, 610); ctx.globalAlpha = 1;
  ctx.fillStyle = '#183b32'; ctx.font = '700 30px system-ui'; ctx.fillText(entry.dateKey.replaceAll('-', '. '), 100, 790);
  ctx.font = '38px system-ui'; drawWrapped(ctx, entry.note || '오늘의 마음을 그림으로 남겼어요.', 100, 870, 880, 62, 5);
  drawStrokes(ctx, entry.strokes || [], { x: 100, y: 1060, width: 880, height: 190 });
  ctx.font = '700 25px system-ui'; ctx.fillStyle = '#245a4a'; ctx.fillText('오늘의 한 줄', 100, 1295);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.')), 'image/png'));
}
function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) { let line = '', lineNo = 0; for (const char of text) { const test = line + char; if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, y + lineNo * lineHeight); line = char; if (++lineNo >= maxLines) return; } else line = test; } ctx.fillText(line, x, y + lineNo * lineHeight); }
function drawStrokes(ctx, strokes, box) { ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip(); for (const stroke of strokes) { ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width * 2; ctx.lineCap = 'round'; stroke.points.forEach((p, i) => { const x = box.x + p.x * box.width, y = box.y + p.y * box.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); } ctx.restore(); }
export async function shareCard(blob, dateKey) { const file = new File([blob], `one-line-${dateKey}.png`, { type: 'image/png' }); if (navigator.canShare?.({ files: [file] })) { await navigator.share({ title: '오늘의 한 줄', text: '오늘의 기록', files: [file] }); return 'shared'; } const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); return 'downloaded'; }
