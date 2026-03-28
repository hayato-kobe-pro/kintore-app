import type { DisplayGoalKey } from "~/utils/displayGoalsFromProfile";

/** コンディション各チャートの定義（canvas / empty 要素の id 接尾辞に使う） */
export const CONDITION_CHART_METAS = [
  {
    id: "weight-chart",
    emptyId: "empty-weight",
    field: "weight" as const,
    title: "体重",
    legendLabel: "体重 (kg)",
    unit: "kg",
    color: "#2563eb",
    iconSrc: "/icons/weight.png",
  },
  {
    id: "chart-calories",
    emptyId: "empty-calories",
    field: "calories" as const,
    title: "カロリー",
    legendLabel: "カロリー (kcal)",
    unit: "kcal",
    color: "#0d9488",
    iconSrc: "/icons/calorie.png",
  },
  {
    id: "chart-protein",
    emptyId: "empty-protein",
    field: "protein" as const,
    title: "タンパク質",
    legendLabel: "タンパク質 (g)",
    unit: "g",
    color: "#db2777",
    iconSrc: "/icons/protein.png",
  },
  {
    id: "chart-fat",
    emptyId: "empty-fat",
    field: "fat" as const,
    title: "脂質",
    legendLabel: "脂質 (g)",
    unit: "g",
    color: "#ea580c",
    iconSrc: "/icons/lipid.png",
  },
  {
    id: "chart-carbs",
    emptyId: "empty-carbs",
    field: "carbs" as const,
    title: "炭水化物",
    legendLabel: "炭水化物 (g)",
    unit: "g",
    color: "#4f46e5",
    iconSrc: "/icons/carbohydrates.png",
  },
  {
    id: "chart-fiber",
    emptyId: "empty-fiber",
    field: "fiber" as const,
    title: "食物繊維",
    legendLabel: "食物繊維 (g)",
    unit: "g",
    color: "#16a34a",
    iconSrc: "/icons/dietary_fiber.png",
  },
  {
    id: "chart-sleep",
    emptyId: "empty-sleep",
    field: "sleep" as const,
    title: "睡眠時間",
    legendLabel: "睡眠時間 (h)",
    unit: "h",
    color: "#7c3aed",
    iconSrc: "/icons/sleep.png",
  },
] as const;

export type ConditionChartMeta = (typeof CONDITION_CHART_METAS)[number];
export type ConditionChartResolved = ConditionChartMeta & { goal: number };

export function conditionChartDomId(prefix: string, baseId: string) {
  return prefix ? `${prefix}__${baseId}` : baseId;
}

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

export function eachDayInclusive(
  start: Date,
  end: Date,
  fn: (d: Date) => void,
) {
  const d = new Date(start);
  d.setHours(12, 0, 0, 0);
  const endT = new Date(end);
  endT.setHours(12, 0, 0, 0);
  while (d <= endT) {
    fn(new Date(d));
    d.setDate(d.getDate() + 1);
  }
}

export function formatAxisLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export function buildSeries(
  start: Date,
  end: Date,
  fieldKey: string,
  entries: Record<string, Record<string, unknown>>,
  opts?: { formatDayLabel?: (d: Date) => string },
) {
  const fmt = opts?.formatDayLabel ?? formatAxisLabel;
  const labels: string[] = [];
  const values: (number | null)[] = [];
  eachDayInclusive(start, end, (d) => {
    labels.push(fmt(d));
    const key = ymd(d);
    const raw = entries[key]?.[fieldKey];
    const n = raw === "" || raw === undefined ? null : Number(raw);
    values.push(Number.isFinite(n as number) ? (n as number) : null);
  });
  return { labels, values };
}

export function countPoints(values: (number | null)[]) {
  return values.filter((v) => v != null && Number.isFinite(v as number)).length;
}

export function todayNoon() {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return t;
}

export function rangeForPreset(preset: "week" | "month") {
  const end = todayNoon();
  const start = new Date(end);
  if (preset === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  return { start, end };
}

/** 暦日のみの差分（時刻・DSTの影響を避ける） */
function calendarDaysBetweenUtc(a: Date, b: Date): number {
  const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((t2 - t1) / 86400000);
}

/** その日を含む週の月曜日（ローカル暦・正午基準） */
export function mondayOfWeekContaining(date: Date): Date {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
  const dow = d.getDay();
  const diff = (dow + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** `<input type="week">` 用 `yyyy-Www`（ISO 週・月曜始まり） */
export function dateToIsoWeekValue(d: Date): string {
  const mon = mondayOfWeekContaining(d);
  const thu = new Date(mon);
  thu.setDate(mon.getDate() + 3);
  let isoYear = thu.getFullYear();
  let jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0);
  let week1Mon = mondayOfWeekContaining(jan4);
  if (mon < week1Mon) {
    isoYear -= 1;
    jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0);
    week1Mon = mondayOfWeekContaining(jan4);
  }
  const diffDays = calendarDaysBetweenUtc(week1Mon, mon);
  const weekNum = Math.floor(diffDays / 7) + 1;
  return `${isoYear}-W${String(weekNum).padStart(2, "0")}`;
}

/** `yyyy-Www` → その週の月曜（不正なら null） */
export function isoWeekValueToMonday(value: string): Date | null {
  const m = /^(\d{4})-W(\d{1,2})$/i.exec(value.trim());
  if (!m) return null;
  const isoYear = Number(m[1]);
  const week = Number(m[2]);
  if (!isoYear || week < 1 || week > 53) return null;
  const jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0);
  const week1Mon = mondayOfWeekContaining(jan4);
  const start = new Date(week1Mon);
  start.setDate(week1Mon.getDate() + (week - 1) * 7);
  return start;
}

/** カレンダー月の初日・末日（ローカル・正午） */
export function calendarMonthBounds(year: number, month1to12: number) {
  const start = new Date(year, month1to12 - 1, 1, 12, 0, 0, 0);
  const end = new Date(year, month1to12, 0, 12, 0, 0, 0);
  return { start, end };
}

export function yRange(values: (number | null)[], goal: number | undefined) {
  const nums = values.filter(
    (v) => v != null && Number.isFinite(v as number),
  ) as number[];
  if (nums.length === 0)
    return {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
    };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (goal != null && Number.isFinite(goal)) {
    min = Math.min(min, goal);
    max = Math.max(max, goal);
  }
  const span = max - min || Math.abs(max) * 0.08 || 1;
  const pad = Math.max(span * 0.12, span * 0.03);
  return { min: min - pad, max: max + pad };
}

export function resolveChartSpecs(
  goals: Record<DisplayGoalKey, number>,
  domPrefix: string,
): ConditionChartResolved[] {
  return CONDITION_CHART_METAS.map((b) => ({
    ...b,
    id: conditionChartDomId(domPrefix, b.id),
    emptyId: conditionChartDomId(domPrefix, b.emptyId),
    goal: goals[b.field as DisplayGoalKey],
  }));
}
