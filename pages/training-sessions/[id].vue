<script setup lang="ts">
import { KintoreExerciseCatalog } from "~/utils/exerciseCatalog";

const catalog = KintoreExerciseCatalog;
const validNames = new Set(catalog.names());

const route = useRoute();
const sessionId = computed(() => String(route.params.id || ""));

const kintoreSessions = useKintoreSessions();
const { ready } = kintoreSessions;

const sessionRev = ref(0);
function bumpSession() {
  sessionRev.value += 1;
}

const session = computed(() => {
  sessionRev.value;
  return kintoreSessions.getSession(sessionId.value);
});

const editing = ref(false);
const editTitle = ref("");
const exerciseLines = ref<string[]>([""]);
const saveHint = ref(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const draggedIndex = ref<number | null>(null);
const dropBeforeIndex = ref<number | null>(null);
const dropAfterIndex = ref<number | null>(null);

function showSaved() {
  if (!editing.value) return;
  saveHint.value = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveHint.value = false;
  }, 1200);
}

function exercisesToPersist(lines: string[]) {
  return lines.filter((n) => validNames.has(n));
}

async function persistEdit() {
  if (!editing.value || !sessionId.value) return;
  await kintoreSessions.updateSession(sessionId.value, {
    title: editTitle.value,
    exercises: exercisesToPersist(exerciseLines.value),
  });
  bumpSession();
  showSaved();
}

function syncEditorFromSession() {
  const s = kintoreSessions.getSession(sessionId.value);
  if (!s) return;
  editTitle.value = s.title;
  const stored = (s.exercises || []).filter((n) => validNames.has(n));
  exerciseLines.value = stored.length ? [...stored] : [""];
}

function enterEditMode() {
  editing.value = true;
  syncEditorFromSession();
}

async function flushPersistAndExitEdit() {
  if (editing.value && sessionId.value) {
    await kintoreSessions.updateSession(sessionId.value, {
      title: editTitle.value,
      exercises: exercisesToPersist(exerciseLines.value),
    });
    bumpSession();
  }
  editing.value = false;
  saveHint.value = false;
}

async function toggleMode() {
  if (editing.value) await flushPersistAndExitEdit();
  else enterEditMode();
}

const viewExercises = computed(() => {
  const s = session.value;
  if (!s) return [];
  return (s.exercises || []).filter((n) => validNames.has(n));
});

function guideUrl(name: string) {
  const n = String(name || "").trim();
  if (!n || !validNames.has(n)) return "";
  return catalog.guideUrl(n);
}

function addExerciseRow() {
  exerciseLines.value = [...exerciseLines.value, ""];
}

function removeExerciseRow(i: number) {
  if (exerciseLines.value.length <= 1) {
    exerciseLines.value = [""];
    void persistEdit();
    return;
  }
  exerciseLines.value.splice(i, 1);
  exerciseLines.value = [...exerciseLines.value];
  void persistEdit();
}

function onExerciseSelectChange(i: number, e: Event) {
  exerciseLines.value[i] = (e.target as HTMLSelectElement).value;
  exerciseLines.value = [...exerciseLines.value];
  void persistEdit();
}

function onTitleChange() {
  void persistEdit();
}

function clearDropIndicators() {
  dropBeforeIndex.value = null;
  dropAfterIndex.value = null;
}

function onDragStart(i: number, e: DragEvent) {
  if (!editing.value) return;
  draggedIndex.value = i;
  e.dataTransfer?.setData("text/plain", "session-exercise-row");
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

function onDragEnd() {
  draggedIndex.value = null;
  clearDropIndicators();
}

function onDragOver(i: number, e: DragEvent) {
  if (!editing.value || draggedIndex.value == null) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  const target = (e.currentTarget as HTMLElement).closest(
    "[data-session-exercise]",
  ) as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  clearDropIndicators();
  if (draggedIndex.value === i) return;
  if (before) dropBeforeIndex.value = i;
  else dropAfterIndex.value = i;
}

function onDropRow(targetIndex: number, e: DragEvent) {
  if (!editing.value) return;
  e.preventDefault();
  const from = draggedIndex.value;
  clearDropIndicators();
  if (from == null) return;
  const lines = [...exerciseLines.value];
  const [moved] = lines.splice(from, 1);
  let t = targetIndex;
  if (from < targetIndex) t = targetIndex - 1;
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  let insert = before ? t : t + 1;
  insert = Math.max(0, Math.min(insert, lines.length));
  lines.splice(insert, 0, moved);
  exerciseLines.value = lines;
  draggedIndex.value = null;
  void persistEdit();
}

watch(
  [ready, sessionId],
  async () => {
    if (!ready.value) return;
    if (!kintoreSessions.getSession(sessionId.value)) {
      await navigateTo("/training-sessions");
    }
  },
  { immediate: true },
);

watch(
  () => session.value?.title,
  (t) => {
    if (t) {
      useHead({ title: `${t} — セッション` });
    }
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pageshow", onPageShow);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", onVis);
  window.removeEventListener("pageshow", onPageShow);
});

async function onVis() {
  if (document.visibilityState !== "visible" || editing.value) return;
  await kintoreSessions.refresh();
  bumpSession();
}

function onPageShow(e: PageTransitionEvent) {
  if (e.persisted && !editing.value) {
    void kintoreSessions.refresh().then(() => bumpSession());
  }
}
</script>

<template>
  <main
    v-if="session"
    id="session-main"
    class="main"
    :class="{ 'session-detail--editing': editing }"
  >
    <div class="sessions-detail-toolbar">
      <NuxtLink to="/training-sessions" class="sessions-back-btn">
        <span class="sessions-back-btn__mark" aria-hidden="true">＜</span>戻る
      </NuxtLink>
      <button
        id="session-mode-btn"
        type="button"
        class="session-mode-btn"
        :aria-pressed="editing ? 'true' : 'false'"
        aria-controls="session-edit-panel"
        @click="toggleMode"
      >
        {{ editing ? "閲覧に戻る" : "編集" }}
      </button>
    </div>

    <div
      v-show="!editing"
      id="session-view-panel"
      class="session-view-panel"
    >
      <h1 id="session-view-title" class="session-view-title">
        {{ session.title }}
      </h1>

      <section class="card" aria-labelledby="session-view-ex-heading">
        <h2 id="session-view-ex-heading" class="section-title">
          トレーニング種目
        </h2>
        <ul
          v-show="viewExercises.length > 0"
          id="session-view-exercises"
          class="session-view-exercises"
        >
          <li
            v-for="name in viewExercises"
            :key="name"
            class="session-view-exercise-item"
          >
            <span class="session-view-exercise-name">{{ name }}</span>
            <a
              v-if="guideUrl(name)"
              :href="guideUrl(name)"
              class="session-view-guide-link"
              target="_blank"
              rel="noopener noreferrer"
            >解説ページを開く</a>
            <span v-else class="session-view-muted">解説リンクなし</span>
          </li>
        </ul>
        <p
          v-show="viewExercises.length === 0"
          id="session-view-exercises-empty"
          class="session-view-empty"
        >
          登録された種目はありません
        </p>
      </section>
    </div>

    <div
      v-show="editing"
      id="session-edit-panel"
      class="session-edit-panel"
    >
      <p class="session-edit-lead">変更は入力のたびに自動保存されます。</p>

      <div id="session-title-field" class="field">
        <label class="session-field-label" for="session-title-custom">セッション名</label>
        <input
          id="session-title-custom"
          v-model="editTitle"
          type="text"
          class="session-title-input"
          maxlength="80"
          autocomplete="off"
          @change="onTitleChange"
        />
      </div>

      <section class="card" aria-labelledby="session-exercises-heading">
        <h2 id="session-exercises-heading" class="section-title">
          トレーニング種目
        </h2>
        <p class="session-exercises-hint">
          種目を選ぶと「解説ページを開く」が表示されます。左のつまみをドラッグして並べ替えられます（PC向け）。
        </p>
        <div id="session-exercise-list" class="session-exercise-list">
          <div
            v-for="(line, i) in exerciseLines"
            :key="i"
            data-session-exercise
            class="session-exercise-row"
            :class="{
              'session-exercise-row--dragging': draggedIndex === i,
              'session-exercise-row--drop-before': dropBeforeIndex === i,
              'session-exercise-row--drop-after': dropAfterIndex === i,
            }"
            @dragover="onDragOver(i, $event)"
            @drop="onDropRow(i, $event)"
          >
            <div class="session-exercise-row__toolbar">
              <span
                class="session-exercise-drag"
                draggable="true"
                aria-label="ドラッグして並べ替え"
                title="ドラッグして並べ替え"
                @dragstart="onDragStart(i, $event)"
                @dragend="onDragEnd"
              >
                <svg
                  class="session-exercise-drag__icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="14"
                  viewBox="0 0 20 14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="3" r="1.5" />
                  <circle cx="5" cy="7" r="1.5" />
                  <circle cx="5" cy="11" r="1.5" />
                  <circle cx="11" cy="3" r="1.5" />
                  <circle cx="11" cy="7" r="1.5" />
                  <circle cx="11" cy="11" r="1.5" />
                </svg>
              </span>
              <span class="session-exercise-row__label">種目 {{ i + 1 }}</span>
              <button
                v-if="exerciseLines.length > 1"
                type="button"
                class="session-exercise-rm"
                data-session-ex-rm
                :aria-label="`種目${i + 1}を削除`"
                @click="removeExerciseRow(i)"
              >
                削除
              </button>
            </div>
            <select
              :value="exerciseLines[i]"
              class="session-exercise-select"
              aria-label="トレーニング種目"
              @change="onExerciseSelectChange(i, $event)"
            >
              <option value="">ーー</option>
              <option v-for="name in catalog.names()" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
            <div
              v-if="!line || !validNames.has(line)"
              class="session-exercise-guide session-exercise-guide--placeholder"
              aria-hidden="true"
            />
            <div v-else-if="!guideUrl(line)" class="session-exercise-guide">
              <p class="session-exercise-guide-muted">
                この種目の解説URLは未登録です
              </p>
            </div>
            <div v-else class="session-exercise-guide">
              <a
                :href="guideUrl(line)"
                class="session-exercise-guide-link"
                target="_blank"
                rel="noopener noreferrer"
              >解説ページを開く</a>
            </div>
          </div>
        </div>
        <button
          id="session-exercise-add"
          type="button"
          class="session-exercise-add"
          @click="addExerciseRow"
        >
          ＋ 種目を追加
        </button>
      </section>

      <p id="save-hint" class="save-hint" :hidden="!saveHint">保存しました</p>
    </div>
  </main>
</template>

<style src="~/assets/css/sessions.css"></style>
