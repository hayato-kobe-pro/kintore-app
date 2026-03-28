<script setup lang="ts">
import {
  Chart,
  registerables,
  type Chart as ChartType,
} from "chart.js";
import { toValue, type MaybeRefOrGetter } from "vue";
import type { DisplayGoalKey } from "~/utils/displayGoalsFromProfile";
import {
  buildSeries,
  calendarMonthBounds,
  countPoints,
  dateToIsoWeekValue,
  eachDayInclusive,
  formatAxisLabel,
  isoWeekValueToMonday,
  parseYmd,
  rangeForPreset,
  resolveChartSpecs,
  type ConditionChartResolved,
  todayNoon,
  ymd,
  yRange,
} from "~/utils/conditionGraphCore";
import {
  CONDITION_LEVEL_EMOJI,
  CONDITION_LEVEL_LABELS,
  conditionEmojiForLabel,
} from "~/utils/conditionLevels";

Chart.register(...registerables);

const props = withDefaults(
  defineProps<{
    fetchDaily: (
      startYmd: string,
      endYmd: string,
    ) => Promise<Record<string, Record<string, unknown>>>;
    goals: MaybeRefOrGetter<Record<DisplayGoalKey, number>>;
    persistPreferences?: boolean;
    /** 空文字で従来の element id（graph ページ互換） */
    domIdPrefix?: string;
    chartsGrid?: boolean;
    /** タブ復帰時に親の目標キャッシュを更新（ログインユーザー向け） */
    externalGoalsRefresh?: () => void | Promise<void>;
    /** 管理画面など：体調ストリップの顔文字凡例を表示 */
    showMoodLegend?: boolean;
  }>(),
  {
    persistPreferences: true,
    domIdPrefix: "",
    chartsGrid: false,
    showMoodLegend: false,
  },
);

const preferencesFirestore = usePreferencesFirestore();

const chartSpecs = computed(() =>
  resolveChartSpecs(toValue(props.goals), props.domIdPrefix),
);

const mode = ref<"week" | "month" | "custom">("week");
const rangeStart = ref("");
const rangeEnd = ref("");

/** 管理画面（chartsGrid）：ISO 週 `<input type="week">` の値、月は `yyyy-MM` */
const adminCalendarWeekValue = ref("");
const adminMonthYm = ref("");

const hintHidden = reactive<Record<string, boolean>>({});
const chartEntries = ref<Record<string, Record<string, unknown>>>({});
const chartInstances: Record<string, ChartType> = {};

/** 体調ストリップ用（現在表示中の期間） */
const panelRangeStart = ref<Date | null>(null);
const panelRangeEnd = ref<Date | null>(null);

const periodName = computed(
  () => `period-${props.domIdPrefix || "default"}`,
);

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

function initAdminCalendarSelectors() {
  const t = todayNoon();
  adminCalendarWeekValue.value = dateToIsoWeekValue(t);
  adminMonthYm.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}

function adminDayAxisLabel(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

async function loadEntriesForRange(start: Date, end: Date) {
  const startYmd = ymd(start);
  const endYmd = ymd(end);
  chartEntries.value = await props.fetchDaily(startYmd, endYmd);
}

function renderChartForSpec(
  spec: ConditionChartResolved,
  start: Date,
  end: Date,
) {
  const canvas = document.getElementById(spec.id) as HTMLCanvasElement | null;
  const hintEl = document.getElementById(spec.emptyId);
  if (!canvas) return;

  destroyChart(spec.id);

  const entries = chartEntries.value;
  const { labels, values } = buildSeries(
    start,
    end,
    spec.field,
    entries,
    props.chartsGrid ? { formatDayLabel: adminDayAxisLabel } : undefined,
  );
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
          filter: (item) => item.datasetIndex === 0 && item.raw != null,
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
  chartSpecs.value.forEach((spec) => {
    renderChartForSpec(spec, start, end);
  });
}

async function refresh() {
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
  } else if (props.chartsGrid && mode.value === "week") {
    if (!adminCalendarWeekValue.value) initAdminCalendarSelectors();
    let mon = isoWeekValueToMonday(adminCalendarWeekValue.value);
    if (!mon) {
      initAdminCalendarSelectors();
      mon = isoWeekValueToMonday(adminCalendarWeekValue.value);
    }
    if (!mon) {
      const r = rangeForPreset("week");
      start = r.start;
      end = r.end;
    } else {
      start = mon;
      end = new Date(mon);
      end.setDate(end.getDate() + 6);
      end.setHours(12, 0, 0, 0);
    }
  } else if (props.chartsGrid && mode.value === "month") {
    if (!adminMonthYm.value) initAdminCalendarSelectors();
    const parts = adminMonthYm.value.split("-").map(Number);
    let y = parts[0];
    let mo = parts[1];
    if (!y || !mo || mo < 1 || mo > 12) {
      initAdminCalendarSelectors();
      const p2 = adminMonthYm.value.split("-").map(Number);
      y = p2[0]!;
      mo = p2[1]!;
    }
    const b = calendarMonthBounds(y, mo);
    start = b.start;
    end = b.end;
  } else {
    const r = rangeForPreset(mode.value);
    start = r.start;
    end = r.end;
  }
  panelRangeStart.value = start;
  panelRangeEnd.value = end;
  await loadEntriesForRange(start, end);
  nextTick(() => renderAllCharts(start, end));
}

type ConditionMoodCell = {
  key: string;
  dayLabel: string;
  emoji: string;
  hasData: boolean;
  isUnknown: boolean;
  titleAttr: string;
};

const conditionMoodCells = computed((): ConditionMoodCell[] => {
  const s = panelRangeStart.value;
  const e = panelRangeEnd.value;
  if (!s || !e) return [];
  const entries = chartEntries.value;
  const cells: ConditionMoodCell[] = [];
  eachDayInclusive(s, e, (d) => {
    const key = ymd(d);
    const raw = entries[key]?.condition;
    const str = raw != null && raw !== "" ? String(raw).trim() : "";
    const emoji = conditionEmojiForLabel(str);
    let display = "·";
    let isUnknown = false;
    if (emoji) {
      display = emoji;
    } else if (str) {
      display = "?";
      isUnknown = true;
    }
    const titleAttr = str
      ? `${key} ${str}`
      : `${key} 未記入`;
    cells.push({
      key,
      dayLabel: props.chartsGrid ? adminDayAxisLabel(d) : formatAxisLabel(d),
      emoji: display,
      hasData: Boolean(emoji),
      isUnknown,
      titleAttr,
    });
  });
  return cells;
});

const conditionMoodHasAny = computed(() =>
  conditionMoodCells.value.some((c) => c.hasData),
);

const moodHeadingId = computed(
  () => `${props.domIdPrefix || "graph"}__chart-h-condition-mood`,
);

/** 管理画面（chartsGrid）用：グラフ下の日別テーブル */
const conditionDataTableDays = computed(() => {
  const s = panelRangeStart.value;
  const e = panelRangeEnd.value;
  if (!s || !e) return [] as { ymd: string; header: string }[];
  const days: { ymd: string; header: string }[] = [];
  eachDayInclusive(s, e, (d) => {
    days.push({
      ymd: ymd(d),
      header: props.chartsGrid ? adminDayAxisLabel(d) : formatAxisLabel(d),
    });
  });
  return days;
});

function formatConditionTableGoal(spec: ConditionChartResolved): string {
  const g = spec.goal;
  if (!Number.isFinite(g)) return "—";
  if (spec.field === "weight" || spec.field === "sleep") {
    const r = Math.round(g * 10) / 10;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }
  return String(Math.round(g));
}

function formatConditionTableCell(
  field: DisplayGoalKey,
  v: number | null,
): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (field === "weight" || field === "sleep") {
    const r = Math.round(v * 10) / 10;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }
  return String(Math.round(v));
}

const conditionDataTableRows = computed(() => {
  const days = conditionDataTableDays.value;
  const entries = chartEntries.value;
  return chartSpecs.value.map((spec) => {
    const cells = days.map(({ ymd: key }) => {
      const raw = entries[key]?.[spec.field];
      const n = raw === "" || raw === undefined ? null : Number(raw);
      const v = Number.isFinite(n as number) ? (n as number) : null;
      return formatConditionTableCell(spec.field, v);
    });
    return {
      field: spec.field,
      title: spec.title,
      unit: spec.unit,
      goalDisplay: formatConditionTableGoal(spec),
      cells,
    };
  });
});

const conditionDataTableHeadingId = computed(
  () => `${props.domIdPrefix || "graph"}__condition-data-table-h`,
);

/** 日付列が多いときだけ幅 max-content＋横スクロール。週表示では width 100% のみ（WebKit で min-width:max-content が表を壊すのを避ける） */
const CONDITION_TABLE_SCROLL_DAY_THRESHOLD = 10;
const conditionDataTableNeedsHorizontalScroll = computed(
  () => conditionDataTableDays.value.length > CONDITION_TABLE_SCROLL_DAY_THRESHOLD,
);

const MACRO_SUMMARY_ROWS: {
  field: "calories" | "protein" | "fat" | "carbs" | "fiber";
  label: string;
  unit: string;
}[] = [
  { field: "calories", label: "カロリー", unit: "kcal" },
  { field: "protein", label: "タンパク質", unit: "g" },
  { field: "fat", label: "脂質", unit: "g" },
  { field: "carbs", label: "炭水化物", unit: "g" },
  { field: "fiber", label: "食物繊維", unit: "g" },
];

function formatMacroInt(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

/** 管理画面テーブル下：5マクロの「期間目標合計 vs 実績合計」と差分 */
const conditionMacroSummary = computed(() => {
  if (!props.chartsGrid) return [] as {
    field: string;
    label: string;
    unit: string;
    targetTotal: number;
    actualTotal: number;
    targetValid: boolean;
    delta: number;
    deltaClass: string;
    deltaText: string;
  }[];
  const days = conditionDataTableDays.value;
  const n = days.length;
  if (n === 0) return [];
  const goals = toValue(props.goals);
  const entries = chartEntries.value;

  return MACRO_SUMMARY_ROWS.map(({ field, label, unit }) => {
    const g = Number(goals[field]);
    const targetValid = Number.isFinite(g);
    const targetTotal = targetValid ? g * n : 0;
    let actualTotal = 0;
    for (const { ymd } of days) {
      const raw = entries[ymd]?.[field];
      const num = raw === "" || raw == null ? NaN : Number(raw);
      if (Number.isFinite(num)) actualTotal += num;
    }
    const delta = targetValid ? actualTotal - targetTotal : NaN;
    let deltaClass = "admin-macro-summary__delta";
    let deltaText = "—";
    if (targetValid && Number.isFinite(delta)) {
      if (delta > 0) {
        deltaClass += " admin-macro-summary__delta--pos";
        deltaText = `+${formatMacroInt(delta)}`;
      } else if (delta < 0) {
        deltaClass += " admin-macro-summary__delta--neg";
        deltaText = `${formatMacroInt(delta)}`;
      } else {
        deltaClass += " admin-macro-summary__delta--zero";
        deltaText = "±0";
      }
      deltaText += ` ${unit}`;
    }
    return {
      field,
      label,
      unit,
      targetTotal,
      actualTotal,
      targetValid,
      delta,
      deltaClass,
      deltaText,
    };
  });
});

const conditionMacroSummaryHeadingId = computed(
  () => `${props.domIdPrefix || "graph"}__macro-summary-h`,
);

const adminWeekRangeCaption = computed(() => {
  if (!props.chartsGrid || mode.value !== "week" || !adminCalendarWeekValue.value)
    return "";
  const mon = isoWeekValueToMonday(adminCalendarWeekValue.value);
  if (!mon) return "";
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  return `${fmt.format(mon)}〜${fmt.format(sun)}`;
});

function adminShiftWeek(deltaWeeks: number) {
  let mon = isoWeekValueToMonday(adminCalendarWeekValue.value);
  if (!mon) {
    initAdminCalendarSelectors();
    mon = isoWeekValueToMonday(adminCalendarWeekValue.value);
  }
  if (!mon) return;
  mon.setDate(mon.getDate() + deltaWeeks * 7);
  adminCalendarWeekValue.value = dateToIsoWeekValue(mon);
  void refresh();
}

function adminShiftMonth(deltaMonths: number) {
  const parts = adminMonthYm.value.split("-").map(Number);
  let y = parts[0] ?? todayNoon().getFullYear();
  let mo = parts[1] ?? todayNoon().getMonth() + 1;
  const d = new Date(y, mo - 1 + deltaMonths, 1, 12, 0, 0, 0);
  adminMonthYm.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  void refresh();
}

function onAdminWeekPickerChange() {
  void refresh();
}

function onAdminMonthPickerChange() {
  void refresh();
}

function onPeriodChange() {
  if (mode.value === "custom") {
    initCustomDefaults();
  }
  void nextTick(() => refresh());
}

function applyCustomRange() {
  void refresh();
}

const prefsHydrated = ref(false);
let prefSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSavePreferences() {
  if (!props.persistPreferences || !prefsHydrated.value) return;
  if (prefSaveTimer) clearTimeout(prefSaveTimer);
  prefSaveTimer = setTimeout(() => {
    void preferencesFirestore.merge({
      graphMode: mode.value,
      graphRangeStart: rangeStart.value,
      graphRangeEnd: rangeEnd.value,
    });
  }, 500);
}

function onVisibility() {
  if (document.visibilityState === "visible" && props.externalGoalsRefresh) {
    void props.externalGoalsRefresh();
  }
}

onMounted(async () => {
  if (props.persistPreferences) {
    const p = await preferencesFirestore.load();
    if (
      p.graphMode === "week" ||
      p.graphMode === "month" ||
      p.graphMode === "custom"
    ) {
      mode.value = p.graphMode;
    }
    if (p.graphRangeStart && p.graphRangeEnd) {
      rangeStart.value = p.graphRangeStart;
      rangeEnd.value = p.graphRangeEnd;
    } else {
      initCustomDefaults();
    }
    prefsHydrated.value = true;
  } else {
    initCustomDefaults();
  }

  if (props.externalGoalsRefresh) {
    await props.externalGoalsRefresh();
    document.addEventListener("visibilitychange", onVisibility);
  }
  if (props.chartsGrid) {
    initAdminCalendarSelectors();
  }
  void refresh();
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  if (prefSaveTimer) clearTimeout(prefSaveTimer);
  chartSpecs.value.forEach((s) => destroyChart(s.id));
});

watch(mode, () => {
  void nextTick(() => refresh());
});

watch([mode, rangeStart, rangeEnd], () => {
  scheduleSavePreferences();
});

watch(
  () => toValue(props.goals),
  () => {
    void nextTick(() => void refresh());
  },
  { deep: true },
);
</script>

<template>
  <div class="condition-log-panel">
    <div class="period-seg" role="group" aria-label="表示期間">
      <input
        :id="`${domIdPrefix || 'graph'}__period-week`"
        v-model="mode"
        type="radio"
        :name="periodName"
        value="week"
        @change="onPeriodChange"
      />
      <label :for="`${domIdPrefix || 'graph'}__period-week`">1週間</label>
      <input
        :id="`${domIdPrefix || 'graph'}__period-month`"
        v-model="mode"
        type="radio"
        :name="periodName"
        value="month"
        @change="onPeriodChange"
      />
      <label :for="`${domIdPrefix || 'graph'}__period-month`">1ヶ月</label>
      <input
        :id="`${domIdPrefix || 'graph'}__period-custom`"
        v-model="mode"
        type="radio"
        :name="periodName"
        value="custom"
        @change="onPeriodChange"
      />
      <label :for="`${domIdPrefix || 'graph'}__period-custom`">期間指定</label>
    </div>

    <div
      v-if="chartsGrid && mode === 'week'"
      class="admin-condition-period-nav"
      role="group"
      aria-label="表示する週の選択（月曜〜日曜）"
    >
      <div class="admin-condition-period-nav__row">
        <button
          type="button"
          class="admin-condition-period-nav__btn"
          @click="adminShiftWeek(-1)"
        >
          前の週
        </button>
        <label class="admin-condition-period-nav__picker">
          <span class="admin-condition-period-nav__picker-label">週を選択</span>
          <input
            v-model="adminCalendarWeekValue"
            class="admin-condition-period-nav__input"
            type="week"
            :name="`${domIdPrefix || 'graph'}__admin-week`"
            @change="onAdminWeekPickerChange"
          >
        </label>
        <button
          type="button"
          class="admin-condition-period-nav__btn"
          @click="adminShiftWeek(1)"
        >
          次の週
        </button>
      </div>
      <p
        v-if="adminWeekRangeCaption"
        class="admin-condition-period-nav__caption"
      >
        {{ adminWeekRangeCaption }}（月〜日の1週間）
      </p>
    </div>

    <div
      v-if="chartsGrid && mode === 'month'"
      class="admin-condition-period-nav"
      role="group"
      aria-label="表示する月の選択"
    >
      <div class="admin-condition-period-nav__row">
        <button
          type="button"
          class="admin-condition-period-nav__btn"
          @click="adminShiftMonth(-1)"
        >
          前の月
        </button>
        <label class="admin-condition-period-nav__picker">
          <span class="admin-condition-period-nav__picker-label">月を選択</span>
          <input
            v-model="adminMonthYm"
            class="admin-condition-period-nav__input"
            type="month"
            :name="`${domIdPrefix || 'graph'}__admin-month`"
            @change="onAdminMonthPickerChange"
          >
        </label>
        <button
          type="button"
          class="admin-condition-period-nav__btn"
          @click="adminShiftMonth(1)"
        >
          次の月
        </button>
      </div>
    </div>

    <div v-show="mode === 'custom'" class="custom-range">
      <div class="range-row">
        <label :for="`${domIdPrefix || 'graph'}__range-start`">開始日</label>
        <div class="range-input-shell">
          <input
            :id="`${domIdPrefix || 'graph'}__range-start`"
            v-model="rangeStart"
            type="date"
          >
        </div>
      </div>
      <div class="range-row">
        <label :for="`${domIdPrefix || 'graph'}__range-end`">終了日</label>
        <div class="range-input-shell">
          <input
            :id="`${domIdPrefix || 'graph'}__range-end`"
            v-model="rangeEnd"
            type="date"
          >
        </div>
      </div>
      <button type="button" class="btn-apply" @click="applyCustomRange">
        この期間で表示
      </button>
    </div>

    <div
      :class="[
        'condition-log-charts',
        chartsGrid ? 'admin-condition-chart-grid' : undefined,
      ]"
    >
      <section
        v-if="chartsGrid && conditionDataTableDays.length > 0"
        class="chart-card admin-condition-data-table-section"
        :aria-labelledby="conditionDataTableHeadingId"
      >
        <h2
          :id="conditionDataTableHeadingId"
          class="chart-heading admin-condition-data-table-section__title"
        >
          <span class="chart-heading__text">日別の数値</span>
        </h2>
        <div class="admin-condition-data-table-wrap">
          <table
            class="admin-condition-data-table"
            :class="{
              'admin-condition-data-table--scroll':
                conditionDataTableNeedsHorizontalScroll,
            }"
          >
            <colgroup>
              <col class="admin-condition-data-table__col-metric" />
              <col class="admin-condition-data-table__col-goal" />
              <col
                v-for="d in conditionDataTableDays"
                :key="d.ymd"
                class="admin-condition-data-table__col-day"
              />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" class="admin-condition-data-table__metric">
                  項目
                </th>
                <th scope="col" class="admin-condition-data-table__goal-col">
                  目標
                </th>
                <th
                  v-for="d in conditionDataTableDays"
                  :key="d.ymd"
                  scope="col"
                  class="admin-condition-data-table__day"
                >
                  {{ d.header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in conditionDataTableRows"
                :key="row.field"
              >
                <th scope="row" class="admin-condition-data-table__metric">
                  {{ row.title }}（{{ row.unit }}）
                </th>
                <td class="admin-condition-data-table__goal-col">
                  {{ row.goalDisplay }}
                </td>
                <td
                  v-for="(cell, idx) in row.cells"
                  :key="`${row.field}-${conditionDataTableDays[idx]!.ymd}`"
                  class="admin-condition-data-table__cell"
                >
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="conditionMacroSummary.length > 0"
          class="admin-macro-summary"
          :aria-labelledby="conditionMacroSummaryHeadingId"
        >
          <h3
            :id="conditionMacroSummaryHeadingId"
            class="admin-macro-summary__title"
          >
            期間の合計（対目標）
          </h3>
          <p class="admin-macro-summary__note">
            実績は入力日のみ合算。目標は「1日あたりの目標 × 表示日数」です。
          </p>
          <ul class="admin-macro-summary__list" role="list">
            <li
              v-for="row in conditionMacroSummary"
              :key="row.field"
              class="admin-macro-summary__item"
            >
              <span class="admin-macro-summary__label">{{ row.label }}</span>
              <div class="admin-macro-summary__body">
                <div class="admin-macro-summary__ratio">
                  <span class="admin-macro-summary__actual">
                    {{ formatMacroInt(row.actualTotal) }}{{ row.unit }}
                  </span>
                  <span class="admin-macro-summary__sep">/</span>
                  <span
                    class="admin-macro-summary__target"
                    :class="{
                      'admin-macro-summary__target--na': !row.targetValid,
                    }"
                  >
                    <template v-if="row.targetValid">
                      {{ formatMacroInt(row.targetTotal) }}{{ row.unit }}
                    </template>
                    <template v-else>—</template>
                  </span>
                </div>
                <span :class="row.deltaClass" aria-label="目標との差">{{
                  row.deltaText
                }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section
        class="chart-card"
        :aria-labelledby="moodHeadingId"
      >
        <h2 :id="moodHeadingId" class="chart-heading">
          <img
            class="chart-heading__icon"
            src="/icons/condition.png"
            alt=""
            width="16"
            height="16"
          >
          <span class="chart-heading__text">体調</span>
        </h2>
        <div class="emoji-strip" role="list">
          <div
            v-for="cell in conditionMoodCells"
            :key="cell.key"
            class="emoji-day"
            role="listitem"
            :title="cell.titleAttr"
          >
            <span class="emoji-day-date">{{ cell.dayLabel }}</span>
            <span
              class="emoji-face"
              :class="{
                'emoji-face--muted': !cell.hasData && !cell.isUnknown,
                'emoji-face--unknown': cell.isUnknown,
              }"
              aria-hidden="true"
            >{{ cell.emoji }}</span>
          </div>
        </div>
        <ul
          v-if="showMoodLegend"
          class="condition-mood-legend"
          aria-label="体調の凡例"
        >
          <li
            v-for="label in CONDITION_LEVEL_LABELS"
            :key="label"
            class="condition-mood-legend__item"
          >
            <span class="condition-mood-legend__emoji">{{
              CONDITION_LEVEL_EMOJI[label]
            }}</span>
            <span class="condition-mood-legend__label">{{ label }}</span>
          </li>
        </ul>
        <p
          v-if="conditionMoodCells.length > 0 && !conditionMoodHasAny"
          class="empty-hint"
        >
          この期間に体調の記録がありません
        </p>
      </section>
      <section
        v-for="spec in chartSpecs"
        :key="spec.id"
        class="chart-card"
        :aria-labelledby="'chart-h-' + spec.id"
      >
        <h2 :id="'chart-h-' + spec.id" class="chart-heading">
          <img
            v-if="spec.iconSrc"
            class="chart-heading__icon"
            :src="spec.iconSrc"
            alt=""
            width="16"
            height="16"
          >
          <span class="chart-heading__text">{{ spec.title }}</span>
        </h2>
        <div
          class="chart-wrap"
          :class="
            spec.field === 'weight'
              ? 'chart-wrap--tall'
              : 'chart-wrap--compact'
          "
        >
          <canvas :id="spec.id" :aria-label="`${spec.title}の折れ線グラフ`" />
        </div>
        <p
          :id="spec.emptyId"
          class="empty-hint"
          :hidden="hintHidden[spec.emptyId]"
        >
          この期間に{{ spec.title }}の記録がありません
        </p>
      </section>
    </div>
  </div>
</template>

<style>
@import "~/assets/css/graph.css";
</style>
