<script setup lang="ts">
import { KintoreExerciseCatalog } from "~/utils/exerciseCatalog";
import { KintoreSessions } from "~/utils/sessionsStore";

const STORAGE_KEY = "kintore-training-v1";
const SOURCE_NEW = "__new__";

const EXERCISE_OPTIONS = KintoreExerciseCatalog.names();

type SetRow = { exercise: string; weight: number | ""; reps: number | "" };

function emptySet(): SetRow {
  return { exercise: "", weight: "", reps: "" };
}

function normalizeExercise(v: unknown) {
  const s = v != null ? String(v).trim() : "";
  if (s === "" || EXERCISE_OPTIONS.includes(s)) return s;
  return "";
}

function normalizeStoredSet(s: unknown): SetRow {
  if (!s || typeof s !== "object") return emptySet();
  const o = s as { exercise?: unknown; weight?: unknown; reps?: unknown };
  const exercise = normalizeExercise(o.exercise);
  let weight: number | "" = o.weight as number | "";
  if (weight === "" || weight == null) weight = "";
  else {
    const n = Number(weight);
    weight = Number.isFinite(n) ? n : "";
  }
  let reps: number | "" = o.reps as number | "";
  if (reps === "" || reps == null) reps = "";
  else {
    const n = parseInt(String(reps), 10);
    reps = Number.isFinite(n) ? n : "";
  }
  return { exercise, weight, reps };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {} as Record<string, SetRow[]> };
    const parsed = JSON.parse(raw) as { entries?: Record<string, unknown[]> };
    return {
      entries:
        parsed.entries && typeof parsed.entries === "object"
          ? (parsed.entries as Record<string, SetRow[]>)
          : {},
    };
  } catch {
    return { entries: {} as Record<string, SetRow[]> };
  }
}

function saveState(state: { entries: Record<string, SetRow[]> }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatHeaderDate(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

useHead({ title: "トレーニングレコード" });

const route = useRoute();
const state = reactive(loadState());
const currentDate = ref(new Date());
currentDate.value.setHours(12, 0, 0, 0);

const q = route.query.date;
if (typeof q === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
  const d = parseYmd(q);
  if (!Number.isNaN(d.getTime())) {
    d.setHours(12, 0, 0, 0);
    currentDate.value = d;
  }
}

const calendarViewMonth = ref(new Date(currentDate.value));
const calendarDialog = ref<HTMLDialogElement | null>(null);
const calendarExpanded = ref(false);
const saveHint = ref(false);
let saveHintTimer: ReturnType<typeof setTimeout> | null = null;

const sessionSource = ref(SOURCE_NEW);
const lastSessionSourceValue = ref(SOURCE_NEW);

const sessionsTick = ref(0);
const sessionOptions = computed(() => {
  sessionsTick.value;
  return KintoreSessions.listSessions();
});

function bumpSessionOptions() {
  sessionsTick.value += 1;
}

function showSaved() {
  saveHint.value = true;
  if (saveHintTimer) clearTimeout(saveHintTimer);
  saveHintTimer = setTimeout(() => {
    saveHint.value = false;
  }, 1200);
}

function getSetsForDate(key: string): SetRow[] {
  const raw = state.entries[key];
  if (!Array.isArray(raw) || raw.length === 0) {
    return [emptySet()];
  }
  return raw.map((x) => normalizeStoredSet(x));
}

const sets = ref<SetRow[]>([]);

function persistSets() {
  const key = ymd(currentDate.value);
  state.entries[key] = sets.value.map((s) => ({ ...s }));
  saveState(state);
  showSaved();
}

function loadSetsForCurrentDate() {
  sets.value = getSetsForDate(ymd(currentDate.value)).map((s) => ({
    ...s,
  }));
}

function resetTrainingSourceSelect() {
  sessionSource.value = SOURCE_NEW;
  lastSessionSourceValue.value = SOURCE_NEW;
}

function applySessionTemplate(sessionId: string) {
  if (!sessionId || sessionId === SOURCE_NEW) return;
  const sess = KintoreSessions.getSession(sessionId);
  if (!sess) return;
  const names = (sess.exercises || []).filter((n) =>
    EXERCISE_OPTIONS.includes(String(n).trim()),
  );
  sets.value =
    names.length > 0
      ? names.map((exercise) => ({ exercise, weight: "", reps: "" }))
      : [emptySet()];
  state.entries[ymd(currentDate.value)] = sets.value.map((s) => ({ ...s }));
  saveState(state);
  showSaved();
}

function hasAnySetInput() {
  return sets.value.some((s) => {
    if (String(s.exercise ?? "").trim() !== "") return true;
    if (s.weight !== "" && s.weight != null) return true;
    if (s.reps !== "" && s.reps != null) return true;
    return false;
  });
}

function onSessionSourceChange() {
  const v = sessionSource.value;
  const prev = lastSessionSourceValue.value;
  if (v === prev) return;
  if (v === SOURCE_NEW) {
    lastSessionSourceValue.value = v;
    return;
  }
  if (hasAnySetInput()) {
    const ok = window.confirm(
      "入力中の情報が全て削除されますがいいでしょうか。",
    );
    if (!ok) {
      sessionSource.value = prev;
      return;
    }
  }
  applySessionTemplate(v);
  lastSessionSourceValue.value = v;
}

function addSet() {
  sets.value.push(emptySet());
  persistSets();
}

function removeSet(i: number) {
  sets.value.splice(i, 1);
  if (sets.value.length === 0) sets.value.push(emptySet());
  persistSets();
}

function onSetFieldChange() {
  persistSets();
}

function formatWeightForInput(w: number | "") {
  if (w === "" || w == null) return "";
  return String(w);
}

function formatRepsForInput(r: number | "") {
  if (r === "" || r == null) return "";
  return String(r);
}

function onWeightChange(i: number, raw: string) {
  const num = raw === "" ? "" : Number(raw);
  sets.value[i].weight = Number.isFinite(num as number) ? (num as number) : "";
  onSetFieldChange();
}

function onRepsChange(i: number, raw: string) {
  const num = raw === "" ? "" : parseInt(raw, 10);
  sets.value[i].reps = Number.isFinite(num as number) ? (num as number) : "";
  onSetFieldChange();
}

function onWeightInput(i: number, e: Event) {
  onWeightChange(i, (e.target as HTMLInputElement).value);
}

function onRepsInput(i: number, e: Event) {
  onRepsChange(i, (e.target as HTMLInputElement).value);
}

function exerciseGuideUrl(ex: string) {
  const n = normalizeExercise(ex);
  if (!n) return null;
  const url = KintoreExerciseCatalog.guideUrl(n);
  return url || null;
}

const dateDisplay = computed(() => formatHeaderDate(currentDate.value));

const calendarTitle = computed(() =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(calendarViewMonth.value),
);

function monthFirst(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(12, 0, 0, 0);
  return x;
}

type CalCell =
  | { kind: "pad" }
  | { kind: "day"; key: string; day: number; selected: boolean; today: boolean };

const currentKey = computed(() => ymd(currentDate.value));

const calendarCells = computed((): CalCell[] => {
  const y = calendarViewMonth.value.getFullYear();
  const m = calendarViewMonth.value.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayKey = ymd(today);
  const selectedKey = currentKey.value;

  const parts: CalCell[] = [];
  for (let i = 0; i < firstDow; i += 1) parts.push({ kind: "pad" });
  for (let day = 1; day <= dim; day += 1) {
    const cell = new Date(y, m, day);
    cell.setHours(12, 0, 0, 0);
    const key = ymd(cell);
    parts.push({
      kind: "day",
      key,
      day,
      selected: key === selectedKey,
      today: key === todayKey,
    });
  }
  return parts;
});

function shiftCalendarMonth(delta: number) {
  const y = calendarViewMonth.value.getFullYear();
  const m = calendarViewMonth.value.getMonth() + delta;
  calendarViewMonth.value = new Date(y, m, 1);
  calendarViewMonth.value.setHours(12, 0, 0, 0);
}

function openCalendar() {
  calendarViewMonth.value = monthFirst(currentDate.value);
  calendarDialog.value?.showModal();
  calendarExpanded.value = true;
}

function closeCalendar() {
  calendarDialog.value?.close();
}

function selectCalendarDay(key: string) {
  const d = parseYmd(key);
  d.setHours(12, 0, 0, 0);
  currentDate.value = d;
  resetTrainingSourceSelect();
  loadSetsForCurrentDate();
  closeCalendar();
}

function goToday() {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  currentDate.value = t;
  resetTrainingSourceSelect();
  loadSetsForCurrentDate();
  closeCalendar();
}

function goDay(delta: number) {
  const d = new Date(currentDate.value);
  d.setDate(d.getDate() + delta);
  d.setHours(12, 0, 0, 0);
  currentDate.value = d;
  resetTrainingSourceSelect();
  loadSetsForCurrentDate();
}

function onStorage(e: StorageEvent) {
  if (e.key === "kintore-sessions-v1") bumpSessionOptions();
}

function onVisibility() {
  if (document.visibilityState === "visible") bumpSessionOptions();
}

onMounted(() => {
  loadSetsForCurrentDate();
  lastSessionSourceValue.value = sessionSource.value;
  const el = calendarDialog.value;
  if (el) {
    el.addEventListener("close", () => {
      calendarExpanded.value = false;
    });
    el.addEventListener("click", (e) => {
      if (e.target === el) closeCalendar();
    });
  }
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibility);
});

onUnmounted(() => {
  window.removeEventListener("storage", onStorage);
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <main class="main">
    <h1 class="page-title">トレーニングレコード</h1>

    <section class="card training-source-card" aria-labelledby="training-source-heading">
      <h2 id="training-source-heading" class="section-title">セッションから入力</h2>
      <p class="training-source-note">
        登録済みのセッションを選ぶと、その日のセットがセッションの種目で置き換わります（未保存の入力は消えます）。
      </p>
      <div class="field">
        <span class="field-label">
          <span class="field-label-dot" style="background: var(--accent)" />
          セッション
        </span>
        <select
          id="training-source-select"
          v-model="sessionSource"
          class="training-select"
          aria-label="セッションから入力"
          @change="onSessionSourceChange"
        >
          <option
            v-for="row in sessionOptions"
            :key="row.id"
            :value="row.id"
          >
            {{ row.title }}
          </option>
          <option :value="SOURCE_NEW">種目を自分で選ぶ</option>
        </select>
      </div>
    </section>

    <div class="app-header">
      <button type="button" class="nav-btn" aria-label="前の日" @click="goDay(-1)">
        ‹
      </button>
      <div class="header-date">
        <button
          type="button"
          class="date-picker-trigger"
          aria-haspopup="dialog"
          :aria-expanded="calendarExpanded ? 'true' : 'false'"
          aria-controls="calendar-dialog-training"
          @click="openCalendar"
        >
          <span class="date-label" aria-live="polite">{{ dateDisplay }}</span>
          <span class="date-picker-hint">日付を選択</span>
        </button>
      </div>
      <button type="button" class="nav-btn" aria-label="次の日" @click="goDay(1)">
        ›
      </button>
    </div>

    <section class="card" aria-labelledby="training-sets-heading">
      <h2 id="training-sets-heading" class="section-title">この日のセット</h2>
      <div id="training-sets">
        <div
          v-for="(s, i) in sets"
          :key="i"
          class="training-set"
          :data-set-index="i"
        >
          <div class="training-set__toolbar">
            <span class="training-set__num">セット {{ i + 1 }}</span>
            <button
              v-if="sets.length > 1"
              type="button"
              class="training-set__rm"
              :aria-label="`セット${i + 1}を削除`"
              @click="removeSet(i)"
            >
              削除
            </button>
          </div>
          <div class="field training-set__field-exercise">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--accent)" />
              トレーニング種目
            </span>
            <select
              v-model="s.exercise"
              class="training-select"
              aria-label="トレーニング種目"
              @change="onSetFieldChange()"
            >
              <option value="">ーー</option>
              <option v-for="name in EXERCISE_OPTIONS" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
            <div class="training-set__guide" aria-live="polite">
              <span
                v-if="!normalizeExercise(s.exercise)"
                class="training-set__guide-muted"
              >種目を選択するとフォーム解説が表示されます</span>
              <span
                v-else-if="!exerciseGuideUrl(s.exercise)"
                class="training-set__guide-muted"
              >この種目の解説リンクは未登録です</span>
              <a
                v-else
                :href="exerciseGuideUrl(s.exercise)!"
                class="training-set__guide-link"
                target="_blank"
                rel="noopener noreferrer"
              >フォーム解説を見る</a>
            </div>
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-weight)" />
              重量<span class="unit">（kg）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              data-training="weight"
              placeholder="—"
              :value="formatWeightForInput(s.weight)"
              @change="onWeightInput(i, $event)"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-protein)" />
              回数<span class="unit">（回）</span>
            </span>
            <input
              type="number"
              inputmode="numeric"
              step="1"
              min="0"
              data-training="reps"
              placeholder="—"
              :value="formatRepsForInput(s.reps)"
              @change="onRepsInput(i, $event)"
            />
          </div>
        </div>
      </div>
      <button
        id="btn-add-set"
        type="button"
        class="training-add-set"
        @click="addSet"
      >
        ＋ セットを追加
      </button>
      <p class="save-hint" :hidden="!saveHint">保存しました</p>
    </section>
  </main>

  <dialog
    id="calendar-dialog-training"
    ref="calendarDialog"
    class="calendar-dialog"
    aria-labelledby="calendar-title-training"
  >
    <div class="calendar-sheet">
      <div class="calendar-toolbar">
        <button
          type="button"
          class="cal-nav-btn"
          aria-label="前の月"
          @click="shiftCalendarMonth(-1)"
        >
          ‹
        </button>
        <h2 id="calendar-title-training" class="calendar-title">
          {{ calendarTitle }}
        </h2>
        <button
          type="button"
          class="cal-nav-btn"
          aria-label="次の月"
          @click="shiftCalendarMonth(1)"
        >
          ›
        </button>
      </div>
      <div class="calendar-weekdays">
        <span>日</span><span>月</span><span>火</span><span>水</span
        ><span>木</span><span>金</span><span>土</span>
      </div>
      <div class="calendar-grid">
        <template v-for="(c, i) in calendarCells" :key="i">
          <span v-if="c.kind === 'pad'" class="cal-pad" aria-hidden="true" />
          <button
            v-else
            type="button"
            class="cal-day"
            :class="{
              'cal-day--selected': c.selected,
              'cal-day--today': c.today,
            }"
            :aria-label="`${c.day}日`"
            :aria-pressed="c.selected ? 'true' : 'false'"
            @click="selectCalendarDay(c.key)"
          >
            {{ c.day }}
          </button>
        </template>
      </div>
      <div class="calendar-footer">
        <button type="button" class="cal-today-btn" @click="goToday">
          今日
        </button>
        <button type="button" class="cal-close-btn" @click="closeCalendar">
          閉じる
        </button>
      </div>
    </div>
  </dialog>
</template>

<style src="~/assets/css/training.css"></style>
