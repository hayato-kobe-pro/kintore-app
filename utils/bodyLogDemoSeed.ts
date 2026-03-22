import type { BodyLogEntry } from "~/composables/useBodyLog";

function svgDataUrl(label: string, bg: string) {
  const esc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="${bg}" width="120" height="120"/><text x="60" y="72" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui,sans-serif">${esc}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 一覧・ページング・期間絞り込みのテスト用（軽量 SVG データ URL） */
export function createBodyLogDemoEntries(count = 50): BodyLogEntry[] {
  const out: BodyLogEntry[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);

  const c = {
    front: "#c62828",
    back: "#1565c0",
    side: "#2e7d32",
    extra: "#ef6c00",
  };

  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i * 2);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${day}`;
    const n = i + 1;

    out.push({
      id: `demo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
      date,
      front: svgDataUrl(`正${n}`, c.front),
      back: i % 3 === 0 ? null : svgDataUrl(`背${n}`, c.back),
      side: i % 4 === 0 ? null : svgDataUrl(`側${n}`, c.side),
      extra: i % 5 === 0 ? null : svgDataUrl(`他${n}`, c.extra),
    });
  }

  return out;
}
