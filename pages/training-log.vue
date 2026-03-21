<script setup lang="ts">
import { KintoreExerciseCatalog } from "~/utils/exerciseCatalog";

const STORAGE_KEY = "kintore-training-v1";
const EXERCISE_OPTIONS = KintoreExerciseCatalog.names();

const EXERCISE_CHIP_STYLES = [
  { bg: "#e8f0fe", color: "#1967d2" },
  { bg: "#e6f4ea", color: "#137333" },
  { bg: "#fef7e0", color: "#b06000" },
  { bg: "#f3e8fd", color: "#7c2f9f" },
  { bg: "#fce8e6", color: "#c5221f" },
];

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      entries?: Record<string, unknown[]>;
    };
    return parsed.entries && typeof parsed.entries === "object"
      ? parsed.entries
      : {};
  } catch {
    return {};
  }
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeExercise(v: unknown) {
  const s = v != null ? String(v).trim() : "";
  if (s === "" || EXERCISE_OPTIONS.includes(s)) return s;
  return "";
}

function hasRepsEntered(row: unknown) {
  if (!row || typeof row !== "object") return false;
  const r = (row as { reps?: unknown }).reps;
  if (r === "" || r == null) return false;
  const n = parseInt(String(r), 10);
  return Number.isFinite(n);
}

function topDistinctExercises(
  key: string,
  entries: Record<string, unknown[]>,
) {
  const raw = entries[key];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of raw) {
    if (!hasRepsEntered(row)) continue;
    const ex = normalizeExercise((row as { exercise?: unknown }).exercise);
    if (!ex) continue;
    if (seen.has(ex)) continue;
    seen.add(ex);
    out.push(ex);
    if (out.length >= 3) break;
  }
  return out;
}

function chipStyle(name: string) {
  const i = EXERCISE_OPTIONS.indexOf(name);
  const idx = i >= 0 ? i : 0;
  return EXERCISE_CHIP_STYLES[idx % EXERCISE_CHIP_STYLES.length];
}

useHead({ title: "トレーニングログ" });

const viewMonth = ref(new Date());
viewMonth.value.setDate(1);
viewMonth.value.setHours(12, 0, 0, 0);

const tick = ref(0);

const monthTitle = computed(() =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(viewMonth.value),
);

type Cell = {
  key: string;
  dayNum: number;
  muted: boolean;
  isToday: boolean;
  chips: string[];
};

const cells = computed((): Cell[] => {
  tick.value;
  const entries = loadEntries() as Record<string, unknown[]>;
  const y = viewMonth.value.getFullYear();
  const m = viewMonth.value.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const prevDim = new Date(y, m, 0).getDate();

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayKey = ymd(today);

  const parts: Cell[] = [];

  for (let i = 0; i < firstDow; i += 1) {
    const day = prevDim - firstDow + i + 1;
    const d = new Date(y, m - 1, day);
    d.setHours(12, 0, 0, 0);
    parts.push({
      key: ymd(d),
      dayNum: day,
      muted: true,
      isToday: ymd(d) === todayKey,
      chips: topDistinctExercises(ymd(d), entries),
    });
  }

  for (let day = 1; day <= dim; day += 1) {
    const d = new Date(y, m, day);
    d.setHours(12, 0, 0, 0);
    const key = ymd(d);
    parts.push({
      key,
      dayNum: day,
      muted: false,
      isToday: key === todayKey,
      chips: topDistinctExercises(key, entries),
    });
  }

  const rem = parts.length % 7;
  const pad = rem === 0 ? 0 : 7 - rem;
  for (let i = 0; i < pad; i += 1) {
    const day = i + 1;
    const d = new Date(y, m + 1, day);
    d.setHours(12, 0, 0, 0);
    const key = ymd(d);
    parts.push({
      key,
      dayNum: day,
      muted: true,
      isToday: key === todayKey,
      chips: topDistinctExercises(key, entries),
    });
  }

  return parts;
});

function shiftMonth(delta: number) {
  const y = viewMonth.value.getFullYear();
  const m = viewMonth.value.getMonth() + delta;
  viewMonth.value = new Date(y, m, 1);
  viewMonth.value.setHours(12, 0, 0, 0);
}

function bump() {
  tick.value += 1;
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) bump();
}

onMounted(() => {
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
});

onUnmounted(() => {
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("pageshow", onPageShow);
  document.removeEventListener("visibilitychange", onVisibility);
});

function onPageShow(e: PageTransitionEvent) {
  if (e.persisted) bump();
}

function onVisibility() {
  if (document.visibilityState === "visible") bump();
}
</script>

<template>
  <main class="main tl-main">
    <h1 class="page-title">トレーニングログ</h1>

    <div class="tl-toolbar">
      <button
        id="tl-prev-month"
        type="button"
        class="tl-nav-btn"
        aria-label="前の月"
        @click="shiftMonth(-1)"
      >
        ‹
      </button>
      <h2 id="tl-month-title" class="tl-month-title">{{ monthTitle }}</h2>
      <button
        id="tl-next-month"
        type="button"
        class="tl-nav-btn"
        aria-label="次の月"
        @click="shiftMonth(1)"
      >
        ›
      </button>
    </div>

    <div id="tl-cal-grid" class="tl-cal-grid">
      <NuxtLink
        v-for="(c, i) in cells"
        :key="i"
        class="tl-cell"
        :class="{
          'tl-cell--muted': c.muted,
          'tl-cell--today': c.isToday,
        }"
        :to="{ path: '/training', query: { date: c.key } }"
        :aria-label="`${c.dayNum}日、トレーニングを記録`"
      >
        <span class="tl-cell__num">{{ c.dayNum }}</span>
        <div class="tl-cell__chips">
          <span
            v-for="name in c.chips"
            :key="name"
            class="tl-chip"
            :style="{
              background: chipStyle(name).bg,
              color: chipStyle(name).color,
            }"
          >{{ name }}</span>
        </div>
      </NuxtLink>
    </div>
  </main>
</template>

<style src="~/assets/css/training-log.css"></style>
