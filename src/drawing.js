const MAX_STROKES = 500;
const MAX_POINTS = 5000;

export function createDrawing(canvas, { onChange }) {
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let active = null;
  let color = '#183b32';
  let width = 3;

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }
  function drawStroke(stroke) {
    if (!stroke.points.length) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * rect.width, y = point.y * rect.height;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    if (stroke.points.length === 1) { const p = stroke.points[0]; ctx.lineTo(p.x * rect.width + .01, p.y * rect.height + .01); }
    ctx.stroke();
  }
  function redraw() { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes.forEach(drawStroke); }
  function point(event) { const rect = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; }
  canvas.addEventListener('pointerdown', (event) => { if (strokes.length >= MAX_STROKES) return; canvas.setPointerCapture(event.pointerId); active = { color, width, points: [point(event)] }; strokes.push(active); redraw(); });
  canvas.addEventListener('pointermove', (event) => { if (!active || active.points.length >= MAX_POINTS) return; active.points.push(point(event)); drawStroke(active); });
  const finish = () => { if (!active) return; active = null; onChange(strokes); };
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  const observer = new ResizeObserver(sizeCanvas); observer.observe(canvas);
  return {
    setStrokes(value) { strokes = Array.isArray(value) ? structuredClone(value) : []; redraw(); },
    getStrokes() { return structuredClone(strokes); },
    setColor(value) { color = value; }, setWidth(value) { width = Number(value); },
    undo() { if (strokes.length) { strokes.pop(); redraw(); onChange(strokes); } },
    clear() { if (strokes.length) { strokes = []; redraw(); onChange(strokes); } }, redraw
  };
}
