// Small hand-written SVG charts, no libraries needed.

export function ring(pct, size = 150) {
  const r = 58, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 150 150" width="${size}" height="${size}">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#265289"/><stop offset="1" stop-color="#4f86c6"/></linearGradient></defs>
    <circle cx="75" cy="75" r="${r}" class="ring-bg"/>
    <circle cx="75" cy="75" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 75 75)"/>
    <text x="75" y="80" text-anchor="middle" class="ring-num">${pct}%</text>
    <text x="75" y="100" text-anchor="middle" class="ring-sub">last 7 days</text>
  </svg>`;
}

// show at most ~7 x-axis labels so dates never overlap
const showLabel = (i, n) => n <= 7 || i % Math.ceil(n / 7) === 0 || i === n - 1;

export function lineChart(points, label = 'Score over time') {
  const W = 560, H = 230, L = 40, R = 18, T = 18, B = 34;
  const x = (i) => (points.length === 1 ? W / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v) => T + ((100 - v) * (H - T - B)) / 100;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`;
  const grid = [0, 50, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}</text>`).join('');
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="5" class="dot"><title>${p.label}: ${p.value}</title></circle>${showLabel(i, points.length) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="axis">${p.label}</text>` : ''}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${label}">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#265289" stop-opacity=".22"/><stop offset="1" stop-color="#265289" stop-opacity="0"/></linearGradient></defs>
    ${grid}${points.length > 1 ? `<path d="${area}" fill="url(#ag)"/>` : ''}<path d="${line}" class="line"/>${dots}</svg>`;
}

// several 1-5 ratings on one chart. series: [{ name, cls, values }], labels: x-axis text
export function multiLine(series, labels, label = 'Ratings over time') {
  const W = 560, H = 230, L = 40, R = 18, T = 18, B = 34, n = labels.length;
  const x = (i) => (n === 1 ? W / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + ((5 - v) * (H - T - B)) / 4;
  const grid = [1, 2, 3, 4, 5].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}</text>`).join('');
  const xs = labels.map((t, i) => (showLabel(i, n) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="axis">${t}</text>` : '')).join('');
  const lines = series.map((s) => `<path d="${s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')}" class="line ${s.cls}"/>${s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" class="dot ${s.cls}"><title>${s.name}, ${labels[i]}: ${v}/5</title></circle>`).join('')}`).join('');
  const legend = series.map((s) => `<span class="key ${s.cls}"><i></i>${s.name}</span>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${label}">${grid}${xs}${lines}</svg><div class="legend">${legend}</div>`;
}

export function barChart(items, label = 'Weekly consistency') {
  const W = 560, H = 200, T = 22, B = 30, gap = 14;
  const bw = (W - gap * (items.length + 1)) / items.length;
  const bars = items.map((it, i) => {
    const h = ((H - T - B) * it.value) / 100, bx = gap + i * (bw + gap);
    return `<rect x="${bx}" y="${H - B - h}" width="${bw}" height="${Math.max(h, 2)}" rx="8" class="bar ${it.value < 60 ? 'low' : ''}"/>
      <text x="${bx + bw / 2}" y="${H - B - h - 6}" text-anchor="middle" class="axis">${it.value}%</text>
      <text x="${bx + bw / 2}" y="${H - 10}" text-anchor="middle" class="axis">${it.label}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${label}">${bars}</svg>`;
}
