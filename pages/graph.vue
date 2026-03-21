<script setup lang="ts">
import {
  Chart,
  registerables,
  type Chart as ChartType,
} from "chart.js";
import "~/assets/css/graph.css";

Chart.register(...registerables);

const STORAGE_KEY = "kintore-daily-v1";

const CHART_SPECS = [
  {
    id: "weight-chart",
    emptyId: "empty-weight",
    field: "weight",
    title: "体重",
    legendLabel: "体重 (kg)",
    unit: "kg",
    goal: 65,
    color: "#2563eb",
  },
  {
    id: "chart-calories",
    emptyId: "empty-calories",
    field: "calories",
    title: "カロリー",
    legendLabel: "カロリー (kcal)",
    unit: "kcal",
    goal: 1844,
    color: "#0d9488",
  },
  {
    id: "chart-protein",
    emptyId: "empty-protein",
    field: "protein",
    title: "タンパク質",
    legendLabel: "タンパク質 (g)",
    unit: "g",
    goal: 152,
    color: "#db2777",
  },
  {
    id: "chart-fat",
    emptyId: "empty-fat",
    field: "fat",
    title: "脂質",
    legendLabel: "脂質 (g)",
    unit: "g",
    goal: 31,
    color: "#ea580c",
  },
  {
    id: "chart-carbs",
    emptyId: "empty-carbs",
    field: "carbs",
    title: "炭水化物",
    legendLabel: "炭水化物 (g)",
    unit: "g",
    goal: 240,
    color: "#4f46e5",
  },
  {
    id: "chart-fiber",
    emptyId: "empty-fiber",
    field: "fiber",
    title: "食物繊維",
    legendLabel: "食物繊維 (g)",
    unit: "g",
    goal: 20,
    color: "#16a34a",
  },
  {
    id: "chart-sleep",
    emptyId: "empty-sleep",
    field: "sleep",
    title: "睡眠時間",
    legendLabel: "睡眠時間 (h)",
    unit: "h",
    goal: 7,
    color: "#7c3aed",
  },
] as const;

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      entries?: Record<string, Record<string, unknown>>;
    };
    return parsed.entries && typeof parsed.entries === "object"
      ? parsed.entries
      : {};
  } catch {
    return {};
  }
}

function eachDayInclusive(start: Date, end: Date, fn: (d: Date) => void) {
  const d = new Date(start);
  d.setHours(12, 0, 0, 0);
  const endT = new Date(end);
  endT.setHours(12, 0, 0, 0);
  while (d <= endT) {
    fn(new Date(d));
    d.setDate(d.getDate() + 1);
  }
}

function formatAxisLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function buildSeries(
  start: Date,
  end: Date,
  fieldKey: string,
  entries: Record<string, Record<string, unknown>>,
) {
  const labels: string[] = [];
  const values: (number | null)[] = [];
  eachDayInclusive(start, end, (d) => {
    labels.push(formatAxisLabel(d));
    const key = ymd(d);
    const raw = entries[key]?.[fieldKey];
    const n = raw === "" || raw === undefined ? null : Number(raw);
    values.push(Number.isFinite(n as number) ? (n as number) : null);
  });
  return { labels, values };
}

function countPoints(values: (number | null)[]) {
  return values.filter((v) => v != null && Number.isFinite(v as number)).length;
}

function todayNoon() {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return t;
}

function rangeForPreset(preset: "week" | "month") {
  const end = todayNoon();
  const start = new Date(end);
  if (preset === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  return { start, end };
}

function yRange(values: (number | null)[], goal: number | undefined) {
  const nums = values.filter((v) => v != null && Number.isFinite(v as number)) as number[];
  if (nums.length === 0) return { min: undefined as number | undefined, max: undefined as number | undefined };
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

useHead({ title: "コンディションログ" });

const mode = ref<"week" | "month" | "custom">("week");
const rangeStart = ref("");
const rangeEnd = ref("");

/** 空データヒントを隠す（n > 0 のとき true） */
const hintHidden = reactive<Record<string, boolean>>({});

const chartInstances: Record<string, ChartType> = {};

function destroyChart(id: string) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function initCustomDefaults() {
  const { start, end } = rangeForPreset("month");
  rangeStart.value = ymd(start);
  rangeEnd.value = ymd(end);
}

function renderChartForSpec(
  spec: (typeof CHART_SPECS)[number],
  start: Date,
  end: Date,
) {
  const canvas = document.getElementById(spec.id) as HTMLCanvasElement | null;
  const hintEl = document.getElementById(spec.emptyId);
  if (!canvas) return;

  destroyChart(spec.id);

  const entries = loadEntries();
  const { labels, values } = buildSeries(start, end, spec.field, entries);
  const n = countPoints(values);
  if (hintEl) hintEl.hidden = n > 0;
  hintHidden[spec.emptyId] = n > 0;

  if (n === 0) return;

  const yr = yRange(values, spec.goal);
  const goalLine = labels.map(() => spec.goal);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  chartInstances[spec.id] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: spec.legendLabel,
          data: values,
          borderColor: spec.color,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: spec.color,
          fill: false,
        },
        {
          label: "目標",
          data: goalLine,
          borderColor: "#dc2626",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 11 },
            color: "#525252",
          },
        },
        tooltip: {
          filter: (item) =>
            item.datasetIndex === 0 && item.raw != null,
          callbacks: {
            label(ctx) {
              return `${spec.title}: ${ctx.raw} ${spec.unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: mode.value === "week" ? 8 : 12,
            font: { size: 10 },
            color: "#737373",
          },
        },
        y: {
          beginAtZero: false,
          min: yr.min,
          max: yr.max,
          ticks: {
            font: { size: 10 },
            color: "#737373",
          },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
      },
    },
  });
}

function renderAllCharts(start: Date, end: Date) {
  CHART_SPECS.forEach((spec) => {
    renderChartForSpec(spec, start, end);
  });
}

function refresh() {
  let start: Date;
  let end: Date;
  if (mode.value === "custom") {
    if (!rangeStart.value || !rangeEnd.value) return;
    start = parseYmd(rangeStart.value);
    end = parseYmd(rangeEnd.value);
    if (start > end) {
      const t = start;
      start = end;
      end = t;
    }
  } else {
    const r = rangeForPreset(mode.value);
    start = r.start;
    end = r.end;
  }
  renderAllCharts(start, end);
}

function onPeriodChange() {
  if (mode.value === "custom") {
    initCustomDefaults();
  }
  nextTick(() => refresh());
}

function applyCustomRange() {
  refresh();
}

onMounted(() => {
  initCustomDefaults();
  refresh();
});

onBeforeUnmount(() => {
  CHART_SPECS.forEach((s) => destroyChart(s.id));
});

watch(mode, () => {
  nextTick(() => refresh());
});
</script>

<template>
  <main class="main">
    <h1 class="page-title">コンディションログ</h1>
    <div class="period-seg" role="group" aria-label="表示期間">
      <input
        id="period-week"
        v-model="mode"
        type="radio"
        name="period"
        value="week"
        @change="onPeriodChange"
      />
      <label for="period-week">1週間</label>
      <input
        id="period-month"
        v-model="mode"
        type="radio"
        name="period"
        value="month"
        @change="onPeriodChange"
      />
      <label for="period-month">1ヶ月</label>
      <input
        id="period-custom"
        v-model="mode"
        type="radio"
        name="period"
        value="custom"
        @change="onPeriodChange"
      />
      <label for="period-custom">期間指定</label>
    </div>

    <div v-show="mode === 'custom'" class="custom-range" id="custom-range">
      <div class="range-row">
        <label for="range-start">開始日</label>
        <input id="range-start" v-model="rangeStart" type="date" />
      </div>
      <div class="range-row">
        <label for="range-end">終了日</label>
        <input id="range-end" v-model="rangeEnd" type="date" />
      </div>
      <button
        type="button"
        class="btn-apply"
        id="btn-apply-range"
        @click="applyCustomRange"
      >
        この期間で表示
      </button>
    </div>

    <section
      v-for="spec in CHART_SPECS"
      :key="spec.id"
      class="chart-card"
      :aria-labelledby="'chart-h-' + spec.field"
    >
      <h2 :id="'chart-h-' + spec.field" class="chart-heading">
        {{ spec.title }}
      </h2>
      <div
        class="chart-wrap"
        :class="
          spec.id === 'weight-chart'
            ? 'chart-wrap--tall'
            : 'chart-wrap--compact'
        "
      >
        <canvas :id="spec.id" :aria-label="`${spec.title}の折れ線グラフ`" />
      </div>
      <p :id="spec.emptyId" class="empty-hint" :hidden="hintHidden[spec.emptyId]">
        この期間に{{ spec.title }}の記録がありません
      </p>
    </section>
  </main>
</template>
